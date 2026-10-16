"""OpenStreetMap features per H3 cell — the inputs ML-1 learns from and transfers between cities.

For a bounding box we build an H3 grid (resolution 8, ~0.74 km² per hexagon) and count, per
cell: activity places (shops, food, bars, ATMs), transit (bus stops, stations), safety assets
(police, hospitals), and the road network (major/minor road length, intersections), plus the
distance to the nearest police station.

Transfer design: OSM coverage differs a lot between Chicago and Indian cities, so every density
feature is ALSO expressed as a within-city percentile (`*_pct`). The model uses only the
percentile features, i.e. it learns "busier than most of this city", not absolute counts.

Usage:  python -m safesphere_ml.risk.osm_features chicago|mumbai_mmr|delhi|pune
Output: ml/data/interim/osm_cells_<name>.parquet
"""

from __future__ import annotations

import sys

import h3
import numpy as np
import osmnx as ox
import pandas as pd
from sklearn.neighbors import BallTree

from safesphere_ml.common.cities import load_city
from safesphere_ml.common.paths import INTERIM_DIR, OSMNX_CACHE_DIR, configure_caches, ensure_dirs

H3_RES = 8
EARTH_RADIUS_M = 6_371_000

# Chicago, the method-validation city: [north, south, east, west]
CHICAGO_BBOX = [42.023, 41.644, -87.524, -87.940]

TAGS = {
    "amenity": [
        "police", "bar", "pub", "nightclub", "atm", "bank", "restaurant", "fast_food", "cafe",
        "hospital", "clinic", "pharmacy", "school", "college", "university", "fuel", "bus_station",
    ],
    "shop": True,
    "highway": ["bus_stop"],
    "railway": ["station", "subway_entrance"],
    "public_transport": ["station"],
}

# Feature name -> predicate over the OSM features frame.
POI_GROUPS = {
    "shops": lambda f: f.get("shop").notna() if "shop" in f else pd.Series(False, index=f.index),
    "food": lambda f: _amenity(f, "restaurant", "fast_food", "cafe"),
    "nightlife": lambda f: _amenity(f, "bar", "pub", "nightclub"),
    "cash": lambda f: _amenity(f, "atm", "bank"),
    "police": lambda f: _amenity(f, "police"),
    "health": lambda f: _amenity(f, "hospital", "clinic", "pharmacy"),
    "education": lambda f: _amenity(f, "school", "college", "university"),
    "fuel": lambda f: _amenity(f, "fuel"),
    "bus_stops": lambda f: _col(f, "highway").eq("bus_stop") | _amenity(f, "bus_station"),
    "stations": lambda f: _col(f, "railway").isin(["station", "subway_entrance"])
    | _col(f, "public_transport").eq("station"),
}
MAJOR_ROADS = {"motorway", "trunk", "primary", "secondary", "motorway_link", "trunk_link", "primary_link"}

DENSITY_FEATURES = [*POI_GROUPS, "major_road_km", "minor_road_km", "intersections"]
MODEL_FEATURES = [f"{name}_pct" for name in DENSITY_FEATURES] + ["police_dist_pct"]


def _col(f: pd.DataFrame, name: str) -> pd.Series:
    return f[name] if name in f else pd.Series(np.nan, index=f.index, dtype=object)


def _amenity(f: pd.DataFrame, *values: str) -> pd.Series:
    return _col(f, "amenity").isin(values)


OVERPASS_MIRRORS = (
    "https://overpass-api.de/api",
    "https://overpass.kumi.systems/api",
    "https://overpass.private.coffee/api",
)


def configure_osmnx() -> None:
    configure_caches()
    ox.settings.cache_folder = str(OSMNX_CACHE_DIR)
    ox.settings.use_cache = True
    ox.settings.requests_timeout = 600
    # Smaller tiles (~100 km² each) keep big Indian bboxes within public Overpass limits.
    ox.settings.max_query_area_size = 100_000_000


def with_mirrors(fetch, label: str):
    """Run an Overpass-backed OSMnx call, falling back through public mirrors on server errors."""
    last: Exception | None = None
    for url in OVERPASS_MIRRORS:
        ox.settings.overpass_url = url
        try:
            return fetch()
        except Exception as e:  # osmnx raises several error types for 5xx/timeouts/bad JSON
            print(f"  {label}: {url} failed ({type(e).__name__}); trying next mirror")
            last = e
    raise RuntimeError(f"all Overpass mirrors failed for {label}") from last


def bbox_for(name: str) -> list[float]:
    return CHICAGO_BBOX if name == "chicago" else load_city(name)["bbox"]


def grid_cells(bbox: list[float]) -> pd.DataFrame:
    north, south, east, west = bbox
    poly = h3.LatLngPoly([(north, west), (north, east), (south, east), (south, west)])
    cells = sorted(h3.polygon_to_cells(poly, H3_RES))
    lat, lng = zip(*(h3.cell_to_latlng(c) for c in cells), strict=True)
    return pd.DataFrame({"h3_index": cells, "lat": lat, "lng": lng})


def build(name: str) -> pd.DataFrame:
    configure_osmnx()
    north, south, east, west = bbox_for(name)
    osm_bbox = (west, south, east, north)  # osmnx 2.x: (left, bottom, right, top)

    cells = grid_cells([north, south, east, west]).set_index("h3_index")

    print(f"[{name}] downloading POIs …")
    feats = with_mirrors(lambda: ox.features_from_bbox(osm_bbox, TAGS), f"{name} POIs")
    pts = feats.geometry.representative_point()
    feats = feats.assign(cell=[h3.latlng_to_cell(p.y, p.x, H3_RES) for p in pts])
    for group, pred in POI_GROUPS.items():
        counts = feats[pred(feats).fillna(False).astype(bool)].groupby("cell").size()
        cells[group] = counts.reindex(cells.index).fillna(0)

    print(f"[{name}] downloading drive network …")
    graph = with_mirrors(lambda: ox.graph_from_bbox(osm_bbox, network_type="drive", simplify=True), f"{name} roads")
    nodes, edges = ox.graph_to_gdfs(graph)
    mids = edges.geometry.interpolate(0.5, normalized=True)
    edges = edges.assign(
        cell=[h3.latlng_to_cell(p.y, p.x, H3_RES) for p in mids],
        major=edges["highway"].map(lambda h: bool(set(h if isinstance(h, list) else [h]) & MAJOR_ROADS)),
    )
    km = edges.groupby(["cell", "major"])["length"].sum().unstack(fill_value=0) / 1000
    cells["major_road_km"] = km.get(True, pd.Series(dtype=float)).reindex(cells.index).fillna(0)
    cells["minor_road_km"] = km.get(False, pd.Series(dtype=float)).reindex(cells.index).fillna(0)
    inter = nodes[nodes["street_count"] >= 3]
    inter_cells = [h3.latlng_to_cell(y, x, H3_RES) for y, x in zip(inter["y"], inter["x"], strict=True)]
    cells["intersections"] = pd.Series(inter_cells).value_counts().reindex(cells.index).fillna(0)

    # Keep land cells that have streets (drops sea, lakes, empty land).
    cells = cells[(cells["major_road_km"] + cells["minor_road_km"]) > 0.2].copy()

    police = feats[POI_GROUPS["police"](feats).fillna(False).astype(bool)]
    if len(police):
        pp = police.geometry.representative_point()
        tree = BallTree(np.radians(np.c_[pp.y, pp.x]), metric="haversine")
        dist, _ = tree.query(np.radians(cells[["lat", "lng"]].to_numpy()), k=1)
        cells["police_dist_m"] = dist[:, 0] * EARTH_RADIUS_M
    else:
        cells["police_dist_m"] = np.nan

    for col in DENSITY_FEATURES:
        cells[f"{col}_pct"] = cells[col].rank(pct=True, method="average")
    cells["police_dist_pct"] = cells["police_dist_m"].rank(pct=True).fillna(1.0)
    return cells.reset_index()


def main() -> None:
    name = sys.argv[1] if len(sys.argv) > 1 else "chicago"
    ensure_dirs()
    cells = build(name)
    out = INTERIM_DIR / f"osm_cells_{name}.parquet"
    cells.to_parquet(out, index=False)
    print(f"[{name}] {len(cells):,} street cells -> {out}")
    print(cells[DENSITY_FEATURES].describe().loc[["mean", "max"]].round(1).to_string())


if __name__ == "__main__":
    main()
