"""Filesystem layout for the ML workspace.

Every path resolves relative to the `ml/` folder, and every third-party download cache is
pointed at D:\\DevCache (the laptop's C: drive is nearly full). Call `configure_caches()` at the
top of each notebook or training script, before importing osmnx, transformers, keras or torch.
"""

from __future__ import annotations

import os
import warnings
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[3]

DATA_DIR = ML_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
INTERIM_DIR = DATA_DIR / "interim"
PROCESSED_DIR = DATA_DIR / "processed"
CACHE_DIR = DATA_DIR / "cache"
MODELS_DIR = ML_ROOT / "models"
CONFIGS_DIR = ML_ROOT / "configs"
CITY_CONFIGS_DIR = CONFIGS_DIR / "cities"
MLRUNS_DIR = ML_ROOT / "mlruns"

DEV_CACHE_ROOT = Path(os.environ.get("SAFESPHERE_CACHE_ROOT", r"D:\DevCache"))

CACHE_ENV_VARS = {
    "HF_HOME": DEV_CACHE_ROOT / "huggingface",
    "KERAS_HOME": DEV_CACHE_ROOT / "keras",
    "TFHUB_CACHE_DIR": DEV_CACHE_ROOT / "tfhub",
    "KAGGLEHUB_CACHE": DEV_CACHE_ROOT / "kagglehub",
    "TORCH_HOME": DEV_CACHE_ROOT / "torch",
    "PIP_CACHE_DIR": DEV_CACHE_ROOT / "pip",
    "MPLCONFIGDIR": DEV_CACHE_ROOT / "matplotlib",
}
OSMNX_CACHE_DIR = DEV_CACHE_ROOT / "osmnx"


def _on_c_drive(path: Path) -> bool:
    return path.drive.upper() == "C:"


def configure_caches() -> None:
    """Point library caches at D:\\DevCache unless the user already chose a location."""
    for name, path in CACHE_ENV_VARS.items():
        path.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault(name, str(path))
        if _on_c_drive(Path(os.environ[name])):
            warnings.warn(f"{name} points at C: ({os.environ[name]}); C: is nearly full", stacklevel=2)

    OSMNX_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        import osmnx as ox
    except ImportError:
        return
    ox.settings.use_cache = True
    ox.settings.cache_folder = str(OSMNX_CACHE_DIR)


def ensure_dirs() -> None:
    for path in (RAW_DIR, INTERIM_DIR, PROCESSED_DIR, CACHE_DIR, MODELS_DIR, MLRUNS_DIR):
        path.mkdir(parents=True, exist_ok=True)
