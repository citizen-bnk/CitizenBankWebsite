from fastapi import Request, HTTPException
import httpx
import pytest
from app.auth.middleware import User, hydrate_stack_identity


@pytest.mark.asyncio
async def test_signed_subject_resolves_profile_claims_from_provider(monkeypatch):
    import main
    monkeypatch.setattr(main, 'get_stack_auth_config', lambda: {
        'projectId': 'citizen', 'publishableClientKey': 'public-test-key',
    })
    original = httpx.AsyncClient
    def handler(request):
        assert request.headers['x-stack-access-token'] == 'signed-test-token'
        return httpx.Response(200, json={
            'id': 'subject', 'primary_email': 'phafanep@gmail.com',
            'primary_email_verified': True, 'display_name': 'Pule Meshark Phafane',
        })
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kwargs: original(
        transport=httpx.MockTransport(handler), **kwargs))
    request = Request({'type': 'http', 'headers': [(b'authorization', b'Bearer signed-test-token')]})
    resolved = await hydrate_stack_identity(User(
        sub='subject', iss='https://api.stack-auth.com/api/v1/projects/citizen'), request)
    assert resolved.email == 'phafanep@gmail.com'
    assert resolved.name == 'Pule Meshark Phafane'


@pytest.mark.asyncio
async def test_other_identity_project_cannot_supply_privileged_email(monkeypatch):
    import main
    monkeypatch.setattr(main, 'get_stack_auth_config', lambda: {'projectId': 'citizen'})
    request = Request({'type': 'http', 'headers': []})
    with pytest.raises(HTTPException) as error:
        await hydrate_stack_identity(User(
            sub='subject', iss='https://api.stack-auth.com/api/v1/projects/other'), request)
    assert error.value.status_code == 401
