"""Load safe places (police, hospitals, pharmacies, fuel, metro/rail stations) from OSM.

Re-uses the cached OSMnx download from osm_features.py, so it costs no extra network after the
features step. Writes `public.safe_places` (replacing the pack's previous rows).

Usage:  python -m safesphere_ml.risk.safe_places mumbai_mmr|delhi|pune|all
"""

from __future__ import annotations

import json
import sys

import pandas as pd
import psycopg

from safesphere_ml.common.cities import CITY_PACKS
from safesphere_ml.risk.osm_features import bbox_for, fetch_pois
from safesphere_ml.risk.score_cities import app_city, database_url

KIND_BY_AMENITY = {"police": "police", "hospital": "hospital", "clinic": "hospital", "pharmacy": "pharmacy", "fuel": "fuel"}
TYPE_CODE = {"node": 1, "way": 2, "relation": 3}


def collect(pack: str) -> pd.DataFrame:
    feats = fetch_pois(pack, bbox_for(pack))

    amenity = feats["amenity"] if "amenity" in feats else pd.Series(index=feats.index, dtype=object)
    railway = feats["railway"] if "railway" in feats else pd.Series(index=feats.index, dtype=object)
    kind = amenity.map(KIND_BY_AMENITY)
    kind = kind.where(kind.notna(), railway.map({"station": "metro", "subway_entrance": "metro"}))
    feats = feats.assign(kind=kind)[kind.notna()]

    pts = feats.geometry.representative_point()
    opening = feats["opening_hours"] if "opening_hours" in feats else pd.Series(index=feats.index, dtype=object)
    phone = feats["phone"] if "phone" in feats else pd.Series(index=feats.index, dtype=object)
    name = feats["name"] if "name" in feats else pd.Series(index=feats.index, dtype=object)
    return pd.DataFrame({
        "osm_id": [osm_id * 10 + TYPE_CODE[el] for el, osm_id in feats.index],
        "kind": feats["kind"].to_numpy(),
        "name": name.where(name.notna(), None).to_numpy(),
        "phone": phone.where(phone.notna(), None).to_numpy(),
        "open_24h": (opening.astype(str).str.contains("24/7")).to_numpy(),
        "lat": pts.y.to_numpy(),
        "lng": pts.x.to_numpy(),
    }).drop_duplicates("osm_id")


def publish(pack: str, places: pd.DataFrame) -> None:
    places = places.assign(city=[app_city(pack, lng) for lng in places["lng"]])
    cities = sorted(places["city"].unique())
    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        cur.execute("set statement_timeout = 0")  # bulk upload; the default 2 min is too short
        cur.execute("delete from public.safe_places where city = any(%s::public.city[])", (cities,))
        with cur.copy("copy public.safe_places (osm_id, kind, name, city, location, phone, open_24h, tags) from stdin") as copy:
            for r in places.itertuples(index=False):
                copy.write_row((int(r.osm_id), r.kind, r.name, r.city, f"SRID=4326;POINT({r.lng} {r.lat})",
                                r.phone, bool(r.open_24h), json.dumps({"source": "osm"})))
    print(f"[{pack}] {len(places):,} safe places:", places["kind"].value_counts().to_dict())


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    for pack in CITY_PACKS if arg == "all" else (arg,):
        publish(pack, collect(pack))


if __name__ == "__main__":
    main()
