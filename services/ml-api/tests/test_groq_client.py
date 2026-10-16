import json

import httpx
import pytest

from app.services.llm.groq_client import GroqClient

MESSAGES = [{"role": "user", "content": "Summarise this alert."}]


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def ok(text: str) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": text}}]})


def make_client(handler, clock: FakeClock, models=("model-a", "model-b"), rpm: int = 25) -> GroqClient:
    http = httpx.AsyncClient(base_url="https://groq.test/openai/v1", transport=httpx.MockTransport(handler))
    return GroqClient("test-key", list(models), requests_per_minute=rpm, http_client=http, clock=clock)


def requested_model(request: httpx.Request) -> str:
    return json.loads(request.content)["model"]


async def test_identical_prompt_is_served_from_cache() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(requested_model(request))
        return ok("Fall detected near Andheri.")

    client = make_client(handler, FakeClock())
    first = await client.complete(MESSAGES)
    second = await client.complete(MESSAGES)

    assert first.text == second.text == "Fall detected near Andheri."
    assert (first.cached, second.cached) == (False, True)
    assert second.model == "model-a"
    assert calls == ["model-a"]


async def test_rate_limited_model_is_skipped_until_retry_after() -> None:
    clock = FakeClock()
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        model = requested_model(request)
        calls.append(model)
        if model == "model-a" and clock.now < 1030:
            return httpx.Response(429, headers={"retry-after": "30"})
        return ok(f"answer from {model}")

    client = make_client(handler, clock)

    first = await client.complete(MESSAGES)
    assert first.model == "model-b"
    assert calls == ["model-a", "model-b"]

    # model-a is cooling down, so a new prompt goes straight to model-b.
    second = await client.complete([{"role": "user", "content": "Another alert."}])
    assert second.model == "model-b"
    assert calls == ["model-a", "model-b", "model-b"]

    clock.now += 31
    third = await client.complete([{"role": "user", "content": "A third alert."}])
    assert third.model == "model-a"


async def test_all_models_exhausted_returns_fallback() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, headers={"retry-after": "60"})

    client = make_client(handler, FakeClock())
    result = await client.complete(MESSAGES, fallback=lambda: "Medical SOS, Andheri West, 9:41 PM")

    assert result.fallback_used is True
    assert result.model is None
    assert result.text == "Medical SOS, Andheri West, 9:41 PM"


async def test_token_bucket_spills_over_to_next_model() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(requested_model(request))
        return ok("fine")

    client = make_client(handler, FakeClock(), rpm=1)
    await client.complete([{"role": "user", "content": "one"}])
    await client.complete([{"role": "user", "content": "two"}])
    assert calls == ["model-a", "model-b"]


async def test_missing_api_key_never_calls_network() -> None:
    def handler(request: httpx.Request) -> httpx.Response:  # pragma: no cover - must not run
        raise AssertionError("network called without an API key")

    http = httpx.AsyncClient(base_url="https://groq.test", transport=httpx.MockTransport(handler))
    client = GroqClient("", ["model-a"], http_client=http)
    result = await client.complete(MESSAGES, fallback="template text")
    assert result == result.__class__("template text", None, False, True)


async def test_network_error_moves_to_next_model() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if requested_model(request) == "model-a":
            raise httpx.ConnectTimeout("timed out", request=request)
        return ok("from b")

    client = make_client(handler, FakeClock())
    result = await client.complete(MESSAGES)
    assert result.model == "model-b"


@pytest.mark.parametrize("value, expected", [(None, 60.0), ("12", 12.0), ("0", 1.0), ("Wed, 21 Oct", 60.0)])
def test_parse_retry_after(value, expected) -> None:
    from app.services.llm.groq_client import parse_retry_after

    assert parse_retry_after(value) == expected
