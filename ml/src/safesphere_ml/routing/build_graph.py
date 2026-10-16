"""Build compact routing graphs for ML-2 (safest route).

Downloads (or reads from the OSMnx cache) the OSM street network for a city pack and stores it as
plain numpy arrays — nodes (lat/lng) and directed edges (u, v, length, H3 cell, geometry
offsets) — so the ML API can run Dijkstra with scipy in milliseconds without networkx in memory.

Usage:  python -m safesphere_ml.routing.build_graph mumbai_mmr|delhi|pune|all [drive|walk]
Output: ml/models/routing/<pack>_<mode>.npz
"""

from __future__ import annotations

import sys

import h3
import numpy as np
import osmnx as ox

from safesphere_ml.common.cities import CITY_PACKS
from safesphere_ml.common.paths import MODELS_DIR
from safesphere_ml.risk.osm_features import H3_RES, bbox_for, configure_osmnx, with_mirrors

ROUTING_DIR = MODELS_DIR / "routing"


def build(pack: str, mode: str = "drive") -> None:
    configure_osmnx()
    north, south, east, west = bbox_for(pack)
    graph = with_mirrors(
        lambda: ox.graph_from_bbox((west, south, east, north), network_type=mode, simplify=True), f"{pack} {mode}"
    )
    graph = ox.truncate.largest_component(graph, strongly=mode == "drive")

    node_ids = np.fromiter(graph.nodes, dtype=np.int64)
    index = {n: i for i, n in enumerate(node_ids)}
    lat = np.array([graph.nodes[n]["y"] for n in node_ids])
    lng = np.array([graph.nodes[n]["x"] for n in node_ids])

    u, v, length, cells, geom_off, geom = [], [], [], [], [0], []
    for a, b, data in graph.edges(data=True):
        u.append(index[a])
        v.append(index[b])
        length.append(float(data.get("length", 1.0)))
        if "geometry" in data:
            pts = list(data["geometry"].coords)
        else:
            pts = [(lng[index[a]], lat[index[a]]), (lng[index[b]], lat[index[b]])]
        mid = pts[len(pts) // 2]
        cells.append(h3.latlng_to_cell(mid[1], mid[0], H3_RES))
        geom.extend(pts)
        geom_off.append(len(geom))

    cell_names, cell_idx = np.unique(np.array(cells), return_inverse=True)
    ROUTING_DIR.mkdir(parents=True, exist_ok=True)
    out = ROUTING_DIR / f"{pack}_{mode}.npz"
    np.savez_compressed(
        out,
        lat=lat, lng=lng,
        u=np.array(u, dtype=np.int32), v=np.array(v, dtype=np.int32),
        length=np.array(length, dtype=np.float32),
        edge_cell=cell_idx.astype(np.int32), cells=cell_names,
        geom=np.array(geom, dtype=np.float32), geom_off=np.array(geom_off, dtype=np.int64),
    )
    print(f"[{pack}/{mode}] {len(node_ids):,} nodes, {len(u):,} edges -> {out}")


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    mode = sys.argv[2] if len(sys.argv) > 2 else "drive"
    for pack in CITY_PACKS if arg == "all" else (arg,):
        build(pack, mode)


if __name__ == "__main__":
    main()
