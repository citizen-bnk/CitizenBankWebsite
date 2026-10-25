from types import SimpleNamespace

import pytest

from app.runtime.storage import VercelBlobBinaryStorage


class MissingBlob(FileNotFoundError):
    pass


def test_private_blob_adapter_preserves_document_keys():
    objects = {}

    def put(key, value, **options):
        assert options == {"access": "private", "allow_overwrite": False}
        if key in objects:
            raise ValueError("existing object cannot be overwritten")
        objects[key] = value

    def get(key, **options):
        assert options == {"access": "private"}
        if key not in objects:
            raise MissingBlob(key)
        return SimpleNamespace(body=objects[key])

    def delete(key):
        objects.pop(key, None)

    adapter = VercelBlobBinaryStorage.__new__(VercelBlobBinaryStorage)
    adapter.blob = SimpleNamespace(put_blob=put, get_blob=get, delete_blob=delete,
                                   query_blobs=lambda: (SimpleNamespace(pathname=k, size=len(v)) for k, v in objects.items()))
    adapter.not_found = MissingBlob

    adapter.put("certificates/CB36/v1.pdf", b"%PDF")
    assert adapter.get("certificates/CB36/v1.pdf") == b"%PDF"
    assert [(item.name, item.size) for item in adapter.list()] == [("certificates/CB36/v1.pdf", 4)]
    with pytest.raises(ValueError):
        adapter.put("certificates/CB36/v1.pdf", b"changed")
    assert adapter.get("missing.pdf", default=b"fallback") == b"fallback"
    adapter.delete("certificates/CB36/v1.pdf")
    with pytest.raises(FileNotFoundError):
        adapter.get("certificates/CB36/v1.pdf")
