"""Service configuration, read from environment variables or a local .env file."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Chat models available to our Groq key (checked against /openai/v1/models on 2026-10-16).
# Each model has its own quota, so the client rotates through them in this order when one
# is rate-limited. qwen3.8-27b is a preview model: last in line, may disappear.
DEFAULT_GROQ_MODELS = (
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SafeSphere ML API"
    environment: str = "development"
    log_level: str = "INFO"

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_models: Annotated[list[str], NoDecode] = Field(default_factory=lambda: list(DEFAULT_GROQ_MODELS))
    groq_requests_per_minute: int = 25
    groq_timeout_s: float = 20.0

    allowed_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["http://localhost:5173"])
    # app/core/config.py -> repo root is 4 levels up (core, app, ml-api, services).
    model_dir: Path = Path(__file__).resolve().parents[4] / "ml" / "models"
    # Load risk tables, street graphs and NLP models in the background at startup, so the first
    # route request doesn't pay the ~8 s cold load.
    warm_models: bool = True

    @field_validator("groq_models", "allowed_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
