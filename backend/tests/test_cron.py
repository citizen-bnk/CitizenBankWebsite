"""Vercel Cron endpoints: only the secret opens them, every scheduled job is reachable, nothing leaks on failure."""
import pytest
from fastapi.testclient import TestClient

from app.apis import cron
from app.libs import scheduler


@pytest.fixture
def client(monkeypatch):
    import main

    monkeypatch.setenv("CRON_SECRET", "s3cret-value")
    return TestClient(main.create_app(), raise_server_exceptions=False)


def auth(value="s3cret-value"):
    return {"Authorization": f"Bearer {value}"}


def test_every_job_in_the_scheduler_has_a_cron_url_and_the_reverse():
    assert sorted(cron.JOB_SLUGS.values()) == sorted(name for name, _c, _f in scheduler.JOBS)
    assert len(set(cron.JOB_SLUGS)) == len(cron.JOB_SLUGS)


@pytest.mark.parametrize("headers", [{}, {"Authorization": ""}, {"Authorization": "Bearer"}, {"Authorization": "Bearer wrong"},
                                     {"Authorization": "s3cret-value"}, {"Authorization": "Basic czNjcmV0LXZhbHVl"},
                                     {"Authorization": "bearer s3cret-value"}, {"Authorization": "Bearer s3cret-value "}])
def test_without_the_exact_secret_nothing_runs(client, monkeypatch, headers):
    ran = []

    async def job():
        ran.append(1)

    monkeypatch.setattr(scheduler, "JOBS", [("Board Document Reminders", "0 8 * * *", job)])
    assert client.get("/api/cron/board-document-reminders", headers=headers).status_code == 401
    assert ran == []


def test_an_unset_secret_never_authorises_anything(monkeypatch):
    import main

    monkeypatch.delenv("CRON_SECRET", raising=False)
    c = TestClient(main.create_app(), raise_server_exceptions=False)
    for h in ({}, {"Authorization": "Bearer "}, {"Authorization": "Bearer"}, {"Authorization": ""}):
        assert c.get("/api/cron/board-document-reminders", headers=h).status_code == 401


def test_the_right_secret_runs_the_job_once(client, monkeypatch):
    ran = []

    async def job():
        ran.append(1)

    monkeypatch.setattr(scheduler, "JOBS", [("Board Document Reminders", "0 8 * * *", job)])
    r = client.get("/api/cron/board-document-reminders", headers=auth())
    assert r.status_code == 200 and r.json()["ok"] is True and r.json()["job"] == "board-document-reminders"
    assert ran == [1]


def test_unknown_jobs_are_404_but_only_after_authentication(client):
    assert client.get("/api/cron/not-a-job", headers=auth()).status_code == 404
    assert client.get("/api/cron/not-a-job").status_code == 401


def test_a_failing_job_is_a_500_without_details(client, monkeypatch):
    async def job():
        raise RuntimeError("database password is hunter2")

    monkeypatch.setattr(scheduler, "JOBS", [("Board Document Reminders", "0 8 * * *", job)])
    r = client.get("/api/cron/board-document-reminders", headers=auth())
    assert r.status_code == 500 and "hunter2" not in r.text and "RuntimeError" not in r.text


def test_only_get_is_allowed(client):
    for method in ("post", "put", "delete"):
        assert getattr(client, method)("/api/cron/board-document-reminders", headers=auth()).status_code == 405
