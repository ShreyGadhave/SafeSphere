"""Service configuration, read from environment variables or a local .env file."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Production chat models on Groq's free tier (checked 2026-10-16). Each model has its
# own quota, so the client rotates through them in this order when one is rate-limited.
DEFAULT_GROQ_MODELS = (
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
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

    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )
    model_dir: Path = Path(__file__).resolve().parents[3] / "ml" / "models"

    @field_validator("groq_models", "allowed_origins", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
