import base64
import hashlib
import hmac
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('profile_service', Path(__file__).parents[1] / 'app/libs/profile_service.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SECRET = 'test-only-profile-secret-' * 3
PERSON = 'b5242588-8d1e-45a5-9a5b-9eac9e477292'

def proof(**overrides):
    claims = dict(use='profile', sub=PERSON, method='PATCH', body=hashlib.sha256(b'{}').hexdigest(), iat=100, exp=130)
    claims.update(overrides)
    encoded = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    signature = base64.urlsafe_b64encode(hmac.new(SECRET.encode(), encoded.encode(), hashlib.sha256).digest()).decode().rstrip('=')
    return encoded + '.' + signature

class ProfileProofTests(unittest.TestCase):
    def test_valid_request_returns_verified_person(self):
        self.assertEqual(module.verify_profile_proof(proof(), SECRET, 'PATCH', b'{}', 110), PERSON)

    def test_person_tampering_is_refused(self):
        token = proof().replace(PERSON, 'another-person')
        encoded, signature = token.split('.')
        tampered = encoded[:-2] + 'AA.' + signature
        with self.assertRaises(ValueError):
            module.verify_profile_proof(tampered, SECRET, 'PATCH', b'{}', 110)

    def test_method_and_body_are_bound(self):
        for method, body in [('GET', b'{}'), ('PATCH', b'{"full_name":"Changed"}')]:
            with self.subTest(method=method, body=body), self.assertRaises(ValueError):
                module.verify_profile_proof(proof(), SECRET, method, body, 110)

    def test_expiry_future_issued_and_long_lifetime_are_refused(self):
        for overrides in [dict(exp=110), dict(iat=111), dict(exp=200), dict(iat=True), dict(sub=None)]:
            with self.subTest(overrides=overrides), self.assertRaises(ValueError):
                module.verify_profile_proof(proof(**overrides), SECRET, 'PATCH', b'{}', 110)

    def test_missing_or_wrong_secret_is_refused(self):
        for secret in ['', 'different-secret-' * 4]:
            with self.subTest(secret=bool(secret)), self.assertRaises(ValueError):
                module.verify_profile_proof(proof(), secret, 'PATCH', b'{}', 110)

if __name__ == '__main__':
    unittest.main()
