"""Handoff token tests: issuing, verifying, and everything a verifier must refuse."""
import time

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa

from app.libs import platform_tokens as t

ISS = "https://demo.example.test"


@pytest.fixture(scope="module")
def key():
    return ec.generate_private_key(ec.SECP256R1())


def issue(key, **over):
    args = dict(person_id="p-1", audience="banking", roles=["customer", "investor"],
                name="Demo Customer", email="c@demo.test", key=key, issuer=ISS)
    args.update(over)
    return t.issue_handoff_token(**args)


def verify(token, key, **over):
    args = dict(audience="banking", jwks_doc=t.jwks(key), issuer=ISS)
    args.update(over)
    return t.verify_handoff_token(token, **args)


def test_round_trip_carries_the_expected_claims(key):
    claims = verify(issue(key), key)
    assert claims["sub"] == "p-1" and claims["aud"] == "banking" and claims["iss"] == ISS
    assert claims["roles"] == ["customer", "investor"]
    assert claims["use"] == "handoff"
    assert claims["exp"] - claims["iat"] == 60 == t.HANDOFF_TTL_SECONDS


def test_every_token_has_its_own_jti(key):
    assert verify(issue(key), key)["jti"] != verify(issue(key), key)["jti"]


def test_wrong_audience_is_refused(key):
    with pytest.raises(jwt.InvalidAudienceError):
        verify(issue(key, audience="app"), key, audience="banking")


def test_wrong_issuer_is_refused(key):
    with pytest.raises(jwt.InvalidIssuerError):
        verify(issue(key, issuer="https://other.example.test"), key)


def test_expired_token_is_refused(key):
    old = int(time.time()) - 3600
    with pytest.raises(jwt.ExpiredSignatureError):
        verify(issue(key, now=old), key)


def test_token_signed_by_another_key_is_refused(key):
    other = ec.generate_private_key(ec.SECP256R1())
    forged = issue(other)
    # Verifier trusts only our published key: the forged token's kid is unknown.
    with pytest.raises(jwt.InvalidKeyError):
        verify(forged, key)
    # Even with the kid copied across, the signature does not verify.
    header = {"kid": t.public_jwk(key)["kid"]}
    claims = jwt.decode(forged, options={"verify_signature": False})
    forged_with_kid = jwt.encode(claims, other, algorithm="ES256", headers=header)
    with pytest.raises(jwt.InvalidSignatureError):
        verify(forged_with_kid, key)


def test_tampered_payload_is_refused(key):
    head, body, sig = issue(key).split(".")
    flipped = body[:-2] + ("AA" if body[-2:] != "AA" else "BB")
    with pytest.raises(jwt.PyJWTError):
        verify(".".join([head, flipped, sig]), key)


def test_algorithm_none_and_hs256_are_refused(key):
    claims = jwt.decode(issue(key), options={"verify_signature": False})
    kid = t.public_jwk(key)["kid"]
    with pytest.raises(jwt.PyJWTError):
        verify(jwt.encode(claims, key=None, algorithm="none", headers={"kid": kid}), key)
    with pytest.raises(jwt.PyJWTError):
        verify(jwt.encode(claims, "secret" * 8, algorithm="HS256", headers={"kid": kid}), key)


def test_a_token_that_is_not_marked_handoff_is_refused(key):
    claims = jwt.decode(issue(key), options={"verify_signature": False})
    claims["use"] = "session"
    token = jwt.encode(claims, key, algorithm="ES256", headers={"kid": t.public_jwk(key)["kid"]})
    with pytest.raises(jwt.InvalidTokenError):
        verify(token, key)


def test_jwks_exposes_only_public_material(key):
    jwk = t.jwks(key)["keys"][0]
    assert set(jwk) == {"kty", "crv", "x", "y", "kid", "use", "alg"}
    assert "d" not in jwk


def test_kid_follows_the_key(key):
    other = ec.generate_private_key(ec.SECP256R1())
    assert t.public_jwk(key)["kid"] == t.public_jwk(key)["kid"]
    assert t.public_jwk(key)["kid"] != t.public_jwk(other)["kid"]


def test_unknown_audience_cannot_be_issued(key):
    with pytest.raises(ValueError):
        issue(key, audience="hub")


def pem(key):
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                             serialization.NoEncryption()).decode()


def test_key_loads_from_pem_including_escaped_newlines(key):
    assert t.load_private_key(pem(key)).private_numbers() == key.private_numbers()
    assert t.load_private_key(pem(key).replace("\n", "\\n")).private_numbers() == key.private_numbers()


def test_missing_or_wrong_keys_fail_closed(monkeypatch):
    monkeypatch.delenv("PLATFORM_SIGNING_KEY", raising=False)
    with pytest.raises(t.PlatformKeyError):
        t.load_private_key()
    with pytest.raises(t.PlatformKeyError):
        t.load_private_key("not a key")
    rsa_pem = rsa.generate_private_key(65537, 2048).private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    with pytest.raises(t.PlatformKeyError):
        t.load_private_key(rsa_pem)
    p384 = ec.generate_private_key(ec.SECP384R1())
    with pytest.raises(t.PlatformKeyError):
        t.load_private_key(pem(p384))


def test_issuer_must_be_configured(monkeypatch):
    monkeypatch.delenv("PLATFORM_ISSUER", raising=False)
    with pytest.raises(t.PlatformKeyError):
        t.get_issuer()
    assert t.get_issuer("https://x.test/") == "https://x.test"
