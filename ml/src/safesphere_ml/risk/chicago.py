"""Download the method-validation dataset: Chicago street-level personal-safety incidents.

Source: City of Chicago Data Portal, "Crimes - 2001 to Present" (dataset ijzp-q8t2), public
domain-style open data, queried through the free Socrata API (no key; throttled but sufficient).

Only incidents that matter for someone walking or riding are kept: violent and theft-type
offences that happened in public space (street, sidewalk, transit, parking, parks).

Usage:  python -m safesphere_ml.risk.chicago
Output: ml/data/raw/chicago_incidents_2023_2024.parquet
"""

from __future__ import annotations

import io

import pandas as pd
import requests

from safesphere_ml.common.paths import RAW_DIR, ensure_dirs

ENDPOINT = "https://data.cityofchicago.org/resource/ijzp-q8t2.csv"
OUTPUT = RAW_DIR / "chicago_incidents_2023_2024.parquet"

PRIMARY_TYPES = (
    "ASSAULT", "BATTERY", "ROBBERY", "THEFT", "CRIMINAL SEXUAL ASSAULT", "SEX OFFENSE",
    "KIDNAPPING", "STALKING", "INTIMIDATION", "HOMICIDE",
)
PUBLIC_PLACES = (
    "STREET", "SIDEWALK", "ALLEY", "PARKING LOT / GARAGE (NON RESIDENTIAL)",
    "PARKING LOT/GARAGE(NON.RESID.)", "CTA PLATFORM", "CTA BUS STOP", "CTA TRAIN", "CTA BUS",
    "CTA STATION", "PARK PROPERTY", "GAS STATION", "VACANT LOT / LAND", "VACANT LOT/LAND",
    "BRIDGE", "HIGHWAY / EXPRESSWAY", "HIGHWAY/EXPRESSWAY",
)


def _quoted(values: tuple[str, ...]) -> str:
    return ", ".join("'" + v.replace("'", "''") + "'" for v in values)


def download(start: str = "2023-01-01", end: str = "2024-12-31") -> pd.DataFrame:
    where = (
        f"date between '{start}T00:00:00' and '{end}T23:59:59'"
        " AND latitude IS NOT NULL AND longitude IS NOT NULL"
        f" AND primary_type in ({_quoted(PRIMARY_TYPES)})"
        f" AND location_description in ({_quoted(PUBLIC_PLACES)})"
    )
    params = {
        "$select": "date, primary_type, location_description, latitude, longitude",
        "$where": where,
        "$limit": 2_000_000,
    }
    resp = requests.get(ENDPOINT, params=params, timeout=600)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text), parse_dates=["date"])
    return df.rename(columns={"latitude": "lat", "longitude": "lng"})


def main() -> None:
    ensure_dirs()
    df = download()
    df.to_parquet(OUTPUT, index=False)
    print(f"saved {len(df):,} incidents -> {OUTPUT}")
    print(df["primary_type"].value_counts().head(10).to_string())


if __name__ == "__main__":
    main()
