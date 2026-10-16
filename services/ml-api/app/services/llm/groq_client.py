"""Rate-limit-aware client for Groq's OpenAI-compatible chat API.

Groq's free tier allows roughly 30 requests/minute and 1,000 requests/day per model, so
this client is built to spend as few calls as possible and to degrade quietly:

- identical prompts are answered from a cache (in-memory now, the `llm_cache` table later);
- a per-model token bucket keeps us under the per-minute limit;
- a 429 puts that model on cooldown for `retry-after` seconds and the next model is tried;
- when every model is unavailable, the caller's fallback text is returned.

Callers never see a rate-limit exception. LLM output is never on the SOS path.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

import httpx

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)

DEFAULT_COOLDOWN_S = 60.0
SERVER_ERROR_COOLDOWN_S = 10.0
# A 4xx other than 429 (e.g. a decommissioned model) will not fix itself soon.
CLIENT_ERROR_COOLDOWN_S = 3600.0

Message = dict[str, str]
Clock = Callable[[], float]


@dataclass(frozen=True)
class LLMResult:
    text: str
    model: str | None
    cached: bool
    fallback_used: bool


@dataclass(frozen=True)
class CacheEntry:
    text: str
    model: str


class LLMCache(Protocol):
    async def get(self, key: str) -> CacheEntry | None: ...

    async def set(self, key: str, entry: CacheEntry) -> None: ...


class InMemoryLRUCache:
    def __init__(self, maxsize: int = 512) -> None:
        self._maxsize = maxsize
        self._items: OrderedDict[str, CacheEntry] = OrderedDict()

    async def get(self, key: str) -> CacheEntry | None:
        entry = self._items.get(key)
        if entry is not None:
            self._items.move_to_end(key)
        return entry

    async def set(self, key: str, entry: CacheEntry) -> None:
        self._items[key] = entry
        self._items.move_to_end(key)
        while len(self._items) > self._maxsize:
            self._items.popitem(last=False)


class TokenBucket:
    """Non-blocking bucket: `try_acquire` returns False instead of waiting."""

    def __init__(self, per_minute: int, clock: Clock = time.monotonic) -> None:
        self._capacity = float(max(per_minute, 1))
        self._refill_per_s = self._capacity / 60.0
        self._tokens = self._capacity
        self._clock = clock
        self._updated = clock()

    def try_acquire(self) -> bool:
        now = self._clock()
        self._tokens = min(self._capacity, self._tokens + (now - self._updated) * self._refill_per_s)
        self._updated = now
        if self._tokens >= 1.0:
            self._tokens -= 1.0
            return True
        return False


def cache_key(messages: list[Message], max_tokens: int, temperature: float, json_mode: bool) -> str:
    """Model-agnostic key, so an answer from any model in the rotation is reused."""
    payload = json.dumps(
        {"messages": messages, "max_tokens": max_tokens, "temperature": temperature, "json": json_mode},
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def parse_retry_after(value: str | None) -> float:
    if not value:
        return DEFAULT_COOLDOWN_S
    try:
        return max(float(value), 1.0)
    except ValueError:
        # HTTP-date form is allowed by the spec but Groq sends seconds; be conservative.
        return DEFAULT_COOLDOWN_S


class GroqClient:
    def __init__(
        self,
        api_key: str,
        models: list[str],
        *,
        base_url: str = "https://api.groq.com/openai/v1",
        requests_per_minute: int = 25,
        timeout_s: float = 20.0,
        cache: LLMCache | None = None,
        http_client: httpx.AsyncClient | None = None,
        clock: Clock = time.monotonic,
    ) -> None:
        if not models:
            raise ValueError("GroqClient needs at least one model")
        self._api_key = api_key
        self._models = list(models)
        self._timeout_s = timeout_s
        self._cache: LLMCache = cache or InMemoryLRUCache()
        self._clock = clock
        self._buckets = {m: TokenBucket(requests_per_minute, clock) for m in self._models}
        self._cooldown_until: dict[str, float] = {}
        self._owns_http = http_client is None
        self._http = http_client or httpx.AsyncClient(base_url=base_url)

    @classmethod
    def from_settings(cls, settings: Settings, **overrides: object) -> GroqClient:
        kwargs: dict[str, object] = {
            "base_url": settings.groq_base_url,
            "requests_per_minute": settings.groq_requests_per_minute,
            "timeout_s": settings.groq_timeout_s,
        }
        kwargs.update(overrides)
        return cls(settings.groq_api_key, settings.groq_models, **kwargs)  # type: ignore[arg-type]

    async def aclose(self) -> None:
        if self._owns_http:
            await self._http.aclose()

    def available_models(self) -> list[str]:
        now = self._clock()
        return [m for m in self._models if self._cooldown_until.get(m, 0.0) <= now]

    async def complete(
        self,
        messages: list[Message],
        *,
        max_tokens: int = 300,
        temperature: float = 0.2,
        json_mode: bool = False,
        fallback: str | Callable[[], str] | None = None,
    ) -> LLMResult:
        key = cache_key(messages, max_tokens, temperature, json_mode)
        hit = await self._cache.get(key)
        if hit is not None:
            return LLMResult(text=hit.text, model=hit.model, cached=True, fallback_used=False)

        if self._api_key:
            for model in self.available_models():
                if not self._buckets[model].try_acquire():
                    continue
                text = await self._call(model, messages, max_tokens, temperature, json_mode)
                if text is not None:
                    await self._cache.set(key, CacheEntry(text=text, model=model))
                    return LLMResult(text=text, model=model, cached=False, fallback_used=False)
        else:
            logger.info("GROQ_API_KEY not set; using fallback text")

        fallback_text = fallback() if callable(fallback) else (fallback or "")
        return LLMResult(text=fallback_text, model=None, cached=False, fallback_used=True)

    async def _call(
        self,
        model: str,
        messages: list[Message],
        max_tokens: int,
        temperature: float,
        json_mode: bool,
    ) -> str | None:
        body: dict[str, object] = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        try:
            response = await self._http.post(
                "/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=self._timeout_s,
            )
        except httpx.HTTPError as exc:
            logger.warning("Groq request to %s failed: %s", model, exc.__class__.__name__)
            self._cool_down(model, SERVER_ERROR_COOLDOWN_S)
            return None

        if response.status_code == 429:
            seconds = parse_retry_after(response.headers.get("retry-after"))
            logger.warning("Groq model %s rate-limited; cooling down %.0fs", model, seconds)
            self._cool_down(model, seconds)
            return None
        if response.status_code >= 500:
            self._cool_down(model, SERVER_ERROR_COOLDOWN_S)
            return None
        if response.status_code >= 400:
            logger.error("Groq model %s rejected the request (%s)", model, response.status_code)
            self._cool_down(model, CLIENT_ERROR_COOLDOWN_S)
            return None

        try:
            text = response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError):
            logger.error("Unexpected Groq response shape from %s", model)
            return None
        return text.strip() if isinstance(text, str) and text.strip() else None

    def _cool_down(self, model: str, seconds: float) -> None:
        self._cooldown_until[model] = self._clock() + seconds
