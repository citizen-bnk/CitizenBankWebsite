from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from app.auth import middleware
from app.apis import user_management as users
from app.apis import website_settings


@pytest.mark.asyncio
async def test_valid_token_does_not_bypass_suspended_profile(monkeypatch):
    monkeypatch.setenv('DATABASE_URL_PROD', 'postgresql://test')
    class Conn:
        async def fetchval(self, *_): return 'suspended'
        async def close(self): pass
    async def connect(*_, **__): return Conn()
    import asyncpg
    monkeypatch.setattr(asyncpg, 'connect', connect)
    with pytest.raises(HTTPException) as error:
        await middleware.enforce_account_status('subject')
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_admin_cannot_edit_privileged_profile(monkeypatch):
    async def has_any(subject, roles): return True
    async def has_role(subject, role): return False
    monkeypatch.setattr(users, 'check_user_has_any_role', has_any)
    monkeypatch.setattr(users, 'check_user_has_role', has_role)
    with pytest.raises(HTTPException) as error:
        await users.manage_profile('staff-id', users.ManagedProfileUpdate(
            version=1, full_name='Staff', phone='', country=''), SimpleNamespace(sub='admin-id'))
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_settings_changes_require_super_admin(monkeypatch):
    async def has_role(*_): return False
    monkeypatch.setattr(website_settings, 'check_user_has_role', has_role)
    with pytest.raises(HTTPException) as error:
        await website_settings.update_settings(website_settings.SettingsUpdate(
            version=1, site_name='Citizen Bank', company_name='Citizen Digital Ltd',
            contact_email='admin@citizenbank.co.ls', notice='Citizen is currently in pre-licensing.'),
            SimpleNamespace(sub='admin-id'))
    assert error.value.status_code == 403
