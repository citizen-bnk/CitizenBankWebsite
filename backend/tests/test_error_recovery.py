from fastapi import HTTPException
from fastapi.testclient import TestClient

from main import app
import asyncpg


def test_legacy_server_exception_returns_recovery_code_without_database_detail():
    @app.get("/api/_test/schema-recovery", include_in_schema=False)
    async def broken_legacy_route():
        raise HTTPException(status_code=500, detail='relation "share_certificates" does not exist')

    response = TestClient(app, raise_server_exceptions=False).get("/api/_test/schema-recovery")
    assert response.status_code == 500
    assert response.json()["code"] == "DATA_SCHEMA_INCOMPLETE"
    assert "share_certificates" not in response.text


def test_unauthorized_route_explains_recovery():
    @app.get("/api/_test/access-recovery", include_in_schema=False)
    async def restricted_legacy_route():
        raise HTTPException(status_code=403, detail="Access denied")

    response = TestClient(app, raise_server_exceptions=False).get("/api/_test/access-recovery")
    assert response.status_code == 403
    assert response.json()["code"] == "ACCESS_DENIED"
    assert response.json()["recovery"] == "go_back"


def test_database_quota_has_a_specific_recovery_without_infrastructure_details():
    @app.get('/api/_test/quota-recovery', include_in_schema=False)
    async def quota_route():
        raise asyncpg.InsufficientResourcesError('Your account or project has exceeded the quota. Upgrade your plan to increase limits.')

    response = TestClient(app, raise_server_exceptions=False).get('/api/_test/quota-recovery')
    assert response.status_code == 503
    assert response.json()['code'] == 'DATA_QUOTA_EXHAUSTED'
    assert response.json()['recovery'] == 'retry_later'
    assert response.headers['Retry-After'] == '3600'
    assert 'Upgrade your plan' not in response.text


def test_database_capacity_is_not_misreported_as_a_quota_failure():
    @app.get('/api/_test/capacity-recovery', include_in_schema=False)
    async def capacity_route():
        raise asyncpg.InsufficientResourcesError('too many connections')

    response = TestClient(app, raise_server_exceptions=False).get('/api/_test/capacity-recovery')
    assert response.status_code == 503
    assert response.json()['code'] == 'DATA_CAPACITY_UNAVAILABLE'
