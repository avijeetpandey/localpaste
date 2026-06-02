"""Integration tests requiring running infra (postgres+redis+minio).

Skipped automatically when ``LOCALPASTE_INTEGRATION`` env var is not set.
Run with: ``LOCALPASTE_INTEGRATION=1 pytest tests/test_integration_api.py``
"""
from __future__ import annotations

import os
import uuid

import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("LOCALPASTE_INTEGRATION"),
    reason="Set LOCALPASTE_INTEGRATION=1 to run integration tests",
)


@pytest.fixture
async def client():
    from asgi_lifespan import LifespanManager
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


async def _register(client) -> tuple[str, dict]:
    suffix = uuid.uuid4().hex[:8]
    body = {
        "email": f"u_{suffix}@test.dev",
        "username": f"u_{suffix}",
        "password": "test12345",
    }
    r = await client.post("/api/v1/auth/register", json=body)
    assert r.status_code == 201, r.text
    data = r.json()
    return data["access_token"], data["user"]


async def test_health(client):
    r = await client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


async def test_register_login_me(client):
    token, user = await _register(client)
    r = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert r.json()["username"] == user["username"]


async def test_create_and_fetch_paste(client):
    token, _ = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "Test paste",
        "content": "console.log('hi');",
        "language": "javascript",
        "visibility": "public",
        "burn_after_read": False,
        "expiration": "never",
        "encrypt": False,
    }
    r = await client.post("/api/v1/pastes", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    paste = r.json()
    pid = paste["id"]
    assert len(pid) == 6

    r = await client.get(f"/api/v1/pastes/{pid}", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["content"] == payload["content"]
    assert body["view_count"] >= 1


async def test_burn_after_read(client):
    token, _ = await _register(client)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": "self-destruct",
        "content": "secret stuff",
        "language": "plaintext",
        "visibility": "public",
        "burn_after_read": True,
        "expiration": "never",
        "encrypt": False,
    }
    r = await client.post("/api/v1/pastes", json=payload, headers=headers)
    pid = r.json()["id"]
    r1 = await client.get(f"/api/v1/pastes/{pid}", headers=headers)
    assert r1.status_code == 200
    r2 = await client.get(f"/api/v1/pastes/{pid}", headers=headers)
    assert r2.status_code == 404


async def test_unauthenticated_blocked(client):
    r = await client.get("/api/v1/pastes")
    assert r.status_code == 401
    r = await client.post("/api/v1/pastes", json={"content": "x"})
    assert r.status_code == 401
