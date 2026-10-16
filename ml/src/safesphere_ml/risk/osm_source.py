"""Offline OpenStreetMap source: Geofabrik regional extracts (.osm.pbf) read with pyrosm.

Used when the public Overpass servers are overloaded (they were, for days, during this project).
Geofabrik publishes daily extracts of the whole OSM database per region — free, no rate limit:
  western-zone (Maharashtra: Mumbai, Navi Mumbai, Pune) and northern-zone (Delhi).

Files: ml/data/raw/osm/india-<zone>.osm.pbf
       (https://download.geofabrik.de/asia/india/<zone>-latest.osm.pbf)
"""

from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import networkx as nx
import pandas as pd
from shapely.geometry import LineString

from safesphere_ml.common.paths import RAW_DIR

OSM_DIR = RAW_DIR / "osm"
ZONE_BY_PACK = {"mumbai_mmr": "western-zone", "pune": "western-zone", "delhi": "northern-zone"}
TAG_COLUMNS = ["amenity", "shop", "highway", "railway", "public_transport", "name", "phone", "opening_hours"]


def pbf_for(pack: str) -> Path | None:
    zone = ZONE_BY_PACK.get(pack)
    path = OSM_DIR / f"india-{zone}.osm.pbf" if zone else None
    return path if path and path.exists() else None


def _osm(pack: str, bbox: list[float]):
    from pyrosm import OSM  # imported lazily: only needed for the offline path

    north, south, east, west = bbox
    return OSM(str(pbf_for(pack)), bounding_box=[west, south, east, north])


def load_pois(pack: str, bbox: list[float], tags: dict) -> gpd.GeoDataFrame:
    """POIs matching the same tag filter as the Overpass path, indexed like OSMnx: (element, id)."""
    osm = _osm(pack, bbox)
    custom = {k: (True if v is True else list(v)) for k, v in tags.items()}
    pois = osm.get_pois(custom_filter=custom)
    if pois is None or pois.empty:
        raise RuntimeError(f"no POIs found in the {pack} extract")
    for col in TAG_COLUMNS:
        if col not in pois:
            pois[col] = None
    element = pois["osm_type"] if "osm_type" in pois else pd.Series("node", index=pois.index)
    pois.index = pd.MultiIndex.from_arrays([element.astype(str), pois["id"].astype("int64")], names=["element", "id"])
    return pois[[*TAG_COLUMNS, "geometry"]]


def load_graph(pack: str, bbox: list[float], network_type: str = "drive") -> nx.MultiDiGraph:
    """Directed street graph with node x/y and edge length/highway/geometry (OSMnx-compatible attrs)."""
    osm = _osm(pack, bbox)
    kind = {"drive": "driving", "walk": "walking"}[network_type]
    nodes, edges = osm.get_network(network_type=kind, nodes=True)
    graph = osm.to_graph(nodes, edges, graph_type="networkx", retain_all=False)
    for _, data in graph.nodes(data=True):
        data.setdefault("x", data.get("lon"))
        data.setdefault("y", data.get("lat"))
    return graph


def graph_frames(graph: nx.MultiDiGraph) -> tuple[pd.DataFrame, gpd.GeoDataFrame]:
    """Nodes (x, y, street_count) and edges (highway, length, geometry) without relying on OSMnx."""
    undirected = nx.Graph(graph)
    nodes = pd.DataFrame(
        [(n, d["x"], d["y"], undirected.degree(n)) for n, d in graph.nodes(data=True)],
        columns=["osmid", "x", "y", "street_count"],
    ).set_index("osmid")
    xy = {n: (d["x"], d["y"]) for n, d in graph.nodes(data=True)}
    rows = [
        (u, v, d.get("highway"), float(d.get("length", 0.0)), d.get("geometry") or LineString([xy[u], xy[v]]))
        for u, v, d in graph.edges(data=True)
    ]
    edges = gpd.GeoDataFrame(rows, columns=["u", "v", "highway", "length", "geometry"], geometry="geometry", crs="EPSG:4326")
    return nodes, edges
