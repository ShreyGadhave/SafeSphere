"""City pack configs (ml/configs/cities/*.yaml)."""

from __future__ import annotations

from typing import Any

from safesphere_ml.common.paths import CITY_CONFIGS_DIR

CITY_PACKS = ("mumbai_mmr", "delhi", "pune")


def load_city(pack: str) -> dict[str, Any]:
    import yaml

    if pack not in CITY_PACKS:
        raise ValueError(f"Unknown city pack {pack!r}; expected one of {CITY_PACKS}")
    with (CITY_CONFIGS_DIR / f"{pack}.yaml").open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)
