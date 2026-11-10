import base64
import hashlib
import hmac
import json

import pytest
from fastapi import HTTPException

from app.apis.platform.profile_service import verify_profile_proof


def proof(person_id, method, body, secret, issued=1_800_000_000):
    payload = base64.urlsafe_b64encode(json.dumps({
        "use": "profile", "sub": person_id, "method": method,
        "body": hashlib.sha256(body).hexdigest(), "iat": issued, "exp": issued + 30,
    }).encode()).decode().rstrip("=")
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return payload + "." + signature


def test_profile_proof_binds_identity_method_and_body():
    secret = "fictional-long-secret-for-profile-test"
    person = "11111111-1111-1111-1111-111111111111"
    token = proof(person, "PATCH", b'{"phone":"+26650000000"}', secret)
    assert verify_profile_proof(token, "PATCH", b'{"phone":"+26650000000"}', secret, 1_800_000_010) == person
    for method, body, key, now in [
        ("GET", b'{"phone":"+26650000000"}', secret, 1_800_000_010),
        ("PATCH", b'{"phone":"+26659999999"}', secret, 1_800_000_010),
        ("PATCH", b'{"phone":"+26650000000"}', "another-fictional-secret-for-test", 1_800_000_010),
        ("PATCH", b'{"phone":"+26650000000"}', secret, 1_800_000_031),
    ]:
        with pytest.raises(HTTPException) as error:
            verify_profile_proof(token, method, body, key, now)
        assert error.value.status_code == 401

    with pytest.raises(HTTPException) as error:
        verify_profile_proof("not-base64.%%%", "GET", b"", secret, 1_800_000_010)
    assert error.value.status_code == 401


def test_profile_proof_cannot_open_hub_operations():
    secret = "test-secret" * 5
    actor = "f2c96e94-873d-4cee-8cae-72b5f56c7d42"
    body = b'{"operation":"investment.list"}'
    token = proof(actor, "POST", body, secret)
    with pytest.raises(HTTPException) as error:
        verify_profile_proof(token, "POST", body, secret, 1_800_000_010, purpose="hub-operations")
    assert error.value.status_code == 401
