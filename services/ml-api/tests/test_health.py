from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def make_client() -> TestClient:
    return TestClient(create_app(Settings(_env_file=None, groq_api_key="")))


def test_health_reports_ok() -> None:
    with make_client() as client:
        response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["llm_configured"] is False


def test_unbuilt_models_return_501() -> None:
    with make_client() as client:
        response = client.post("/risk", json={"lat": 19.07, "lng": 72.87, "hour": 21})
    assert response.status_code == 501


def test_settings_parse_comma_separated_models() -> None:
    settings = Settings(_env_file=None, groq_models="a/one, b/two")
    assert settings.groq_models == ["a/one", "b/two"]
