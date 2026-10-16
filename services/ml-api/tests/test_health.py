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


def test_models_missing_returns_503(tmp_path) -> None:
    settings = Settings(_env_file=None, groq_api_key="", model_dir=tmp_path)
    with TestClient(create_app(settings)) as client:
        response = client.post("/risk", json={"lat": 19.07, "lng": 72.87, "hour": 21})
    assert response.status_code == 503


def test_unbuilt_features_return_501() -> None:
    with make_client() as client:
        response = client.post("/triage", json={})
    assert response.status_code in (501, 422)


def test_settings_parse_comma_separated_models() -> None:
    settings = Settings(_env_file=None, groq_models="a/one, b/two")
    assert settings.groq_models == ["a/one", "b/two"]


def test_default_model_dir_points_at_repo_ml_models() -> None:
    model_dir = Settings(_env_file=None).model_dir
    assert model_dir.parts[-2:] == ("ml", "models")
    assert (model_dir.parent / "src" / "safesphere_ml").is_dir()
