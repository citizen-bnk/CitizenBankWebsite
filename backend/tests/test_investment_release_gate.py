import pytest
from fastapi.testclient import TestClient

import main


class Connection:
    async def fetch(self, *_):
        return [{"table_name": name} for name in (
            "user_profiles", "roles", "user_roles", "share_classes", "share_config",
            "share_subscriptions", "subscription_payments", "share_certificates", "audit_logs"
        )]

    async def fetchval(self, *_):
        return True

    async def close(self):
        pass


@pytest.mark.filterwarnings("ignore::DeprecationWarning")
def test_fictional_offering_prevents_release(monkeypatch):
    async def connect(*_, **__):
        return Connection()

    monkeypatch.setattr("asyncpg.connect", connect)
    monkeypatch.setattr(main, "CRITICAL_ROUTERS", set())
    monkeypatch.setenv("DATABASE_URL_PROD", "postgresql://test")
    response = TestClient(main.app).get("/api/health/ready")
    assert response.status_code == 503
    assert response.json()["issue"] == "OFFERING_RECONCILIATION_REQUIRED"
