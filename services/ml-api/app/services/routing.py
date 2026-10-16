"""ML-2 safest route — risk-weighted shortest paths.

Each city pack's street graph is a set of numpy arrays (built by
`ml/src/safesphere_ml/routing/build_graph.py`). For a request we weight every edge as

    w = length x (1 + λ · risk / 100)

with `risk` the ML-1 score (0-100) of the edge's H3 cell for the current hour, and run Dijkstra
(scipy, C speed) for λ ∈ {0, 1.5, 5}: fastest, balanced and safest. Identical paths are merged.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import pairwise
from pathlib import Path

import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree

from app.schemas.common import LatLng
from app.schemas.route import PlannedRoute, RouteRequest, RouteResponse
from app.services.risk import RiskStore, now_slot

LAMBDAS = (("fastest", 0.0), ("balanced", 1.5), ("safest", 5.0))
SPEED_MPS = {"walk": 1.3, "drive": 6.9}  # ~4.7 km/h walking, ~25 km/h city traffic
MAX_SNAP_M = 500
UNKNOWN_RISK = 50.0


@dataclass
class Graph:
    lat: np.ndarray
    lng: np.ndarray
    u: np.ndarray
    v: np.ndarray
    length: np.ndarray
    edge_cell: np.ndarray
    cells: np.ndarray
    geom: np.ndarray
    geom_off: np.ndarray
    tree: cKDTree
    lng_scale: float
    orig: np.ndarray  # original edge index (for geometry) of each kept edge
    edge_of: dict[tuple[int, int], int]  # (u, v) -> position in the kept arrays

    @classmethod
    def load(cls, path: Path) -> Graph:
        d = np.load(path, allow_pickle=False)
        u, v, length = d["u"], d["v"], d["length"]
        # Keep only the shortest edge per (u, v): csr_matrix would otherwise sum parallel edges.
        order = np.lexsort((length, v, u))
        first = np.ones(len(order), dtype=bool)
        first[1:] = (u[order][1:] != u[order][:-1]) | (v[order][1:] != v[order][:-1])
        keep = order[first]
        lat, lng = d["lat"], d["lng"]
        scale = float(np.cos(np.radians(lat.mean())))
        return cls(
            lat=lat,
            lng=lng,
            u=u[keep],
            v=v[keep],
            length=length[keep],
            edge_cell=d["edge_cell"][keep],
            cells=d["cells"],
            geom=d["geom"],
            geom_off=d["geom_off"],
            tree=cKDTree(np.c_[lat, lng * scale]),
            lng_scale=scale,
            orig=keep,
            edge_of={(int(a), int(b)): i for i, (a, b) in enumerate(zip(u[keep], v[keep], strict=True))},
        )

    def contains(self, p: LatLng) -> bool:
        return self.lat.min() <= p.lat <= self.lat.max() and self.lng.min() <= p.lng <= self.lng.max()

    def nearest_node(self, p: LatLng) -> int:
        dist_deg, idx = self.tree.query([p.lat, p.lng * self.lng_scale])
        if dist_deg * 111_000 > MAX_SNAP_M:
            raise LookupError("That point is too far from any mapped street.")
        return int(idx)


class RoutingService:
    def __init__(self, routing_dir: Path, risk: RiskStore):
        self.routing_dir = routing_dir
        self.risk = risk
        self._graphs: dict[tuple[str, str], Graph] = {}

    def _files(self, mode: str) -> list[Path]:
        return sorted(self.routing_dir.glob(f"*_{mode}.npz")) or sorted(self.routing_dir.glob("*_drive.npz"))

    def load_all(self) -> None:
        """Preload every city graph (startup warm-up)."""
        for mode in ("drive", "walk"):
            for f in self._files(mode):
                self._load(f, mode)

    def _load(self, f: Path, mode: str) -> Graph:
        key = (f.stem, mode)
        if key not in self._graphs:
            self._graphs[key] = Graph.load(f)
        return self._graphs[key]

    def _graph_for(self, p: LatLng, mode: str) -> Graph:
        for f in self._files(mode):
            # Check the bounding box from the node arrays first, so a Mumbai request never
            # pays for building the (largest) Delhi graph.
            if (f.stem, mode) not in self._graphs:
                with np.load(f, allow_pickle=False) as d:
                    lat, lng = d["lat"], d["lng"]
                    if not (lat.min() <= p.lat <= lat.max() and lng.min() <= p.lng <= lng.max()):
                        continue
            g = self._load(f, mode)
            if g.contains(p):
                return g
        raise LookupError("Routing is available in Mumbai, Navi Mumbai, Delhi and Pune.")

    def plan(self, request: RouteRequest) -> RouteResponse:
        g = self._graph_for(request.origin, request.mode)
        if not g.contains(request.destination):
            raise LookupError("Origin and destination must be in the same city.")
        src, dst = g.nearest_node(request.origin), g.nearest_node(request.destination)

        hour, day_type = now_slot()
        cell_risk = self.risk.scores_for_cells(g.cells, day_type, hour).fillna(UNKNOWN_RISK).to_numpy()
        edge_risk = cell_risk[g.edge_cell]
        n = len(g.lat)

        lambdas = [("custom", request.risk_weight)] if request.risk_weight is not None else list(LAMBDAS)
        routes: list[PlannedRoute] = []
        seen: set[tuple[int, ...]] = set()
        for label, lam in lambdas:
            weights = g.length * (1.0 + lam * edge_risk / 100.0)
            graph = csr_matrix((weights, (g.u, g.v)), shape=(n, n))
            _, pred = dijkstra(graph, indices=src, return_predecessors=True)
            if pred[dst] < 0 and src != dst:
                raise LookupError("No street route found between these points.")
            path = [dst]
            while path[-1] != src:
                path.append(int(pred[path[-1]]))
            path.reverse()
            key = tuple(path)
            if key in seen:
                continue
            seen.add(key)
            routes.append(self._describe(g, label, path, edge_risk, request.mode))
        return RouteResponse(routes=routes)

    def _describe(
        self, g: Graph, label: str, path: list[int], edge_risk: np.ndarray, mode: str
    ) -> PlannedRoute:
        polyline: list[LatLng] = []
        dist = exposure = 0.0
        for a, b in pairwise(path):
            k = g.edge_of[(a, b)]
            e = int(g.orig[k])
            pts = g.geom[g.geom_off[e] : g.geom_off[e + 1]]
            polyline.extend(LatLng(lat=float(y), lng=float(x)) for x, y in (pts if not polyline else pts[1:]))
            length = float(g.length[k])
            dist += length
            exposure += length * float(edge_risk[k])
        if not polyline:
            polyline = [LatLng(lat=float(g.lat[path[0]]), lng=float(g.lng[path[0]]))]
        return PlannedRoute(
            label=label,
            polyline=polyline,
            duration_s=round(dist / SPEED_MPS.get(mode, 1.3)),
            distance_m=round(dist),
            risk_exposure=round(exposure / dist, 1) if dist else 0.0,
        )
