"""Drive uploads and linked records must resolve to real provider links."""
from unittest.mock import Mock

import pytest

from app.libs.google_drive_service import GoogleDriveService


def metadata(**changes):
    result = dict(id="file-123", name="receipt.pdf", mimeType="application/pdf", webViewLink="https://drive.google.com/file/d/file-123/view")
    result.update(changes)
    return result


@pytest.mark.parametrize("changes", [
    dict(webViewLink=None), dict(webViewLink="https://drive.google.com.evil.test/file/x"),
    dict(webViewLink="http://drive.google.com/file/x"), dict(webViewLink="https://user@drive.google.com/file/x"),
    dict(trashed=True), dict(id=None), dict(mimeType="application/vnd.google-apps.folder"),
])
def test_unusable_link_or_file_is_rejected(changes):
    with pytest.raises(RuntimeError):
        GoogleDriveService.validate_document_metadata(metadata(**changes))


def test_record_metadata_excludes_document_contents_and_credentials():
    result = GoogleDriveService.validate_document_metadata(metadata(content=b"private", access_token="private", base64="private"))
    assert set(result) == {"id", "name", "mimeType", "webViewLink"}


def test_upload_reads_back_link_and_preserves_folder_permission_boundary(monkeypatch):
    drive = GoogleDriveService()
    service = Mock()
    service.files.return_value.create.return_value.execute.return_value = {"id": "file-123"}
    service.files.return_value.get.return_value.execute.return_value = metadata()
    monkeypatch.setattr(drive, "build_service", lambda credentials: service)
    result = drive.upload_file(b"pdf", "receipt.pdf", "private-folder", "application/pdf", Mock())
    assert result["webViewLink"] == metadata()["webViewLink"]
    create = service.files.return_value.create.call_args.kwargs
    assert create["body"]["parents"] == ["private-folder"]
    assert create["supportsAllDrives"] and create["ignoreDefaultVisibility"]
    service.permissions.assert_not_called()
    service.files.return_value.get.assert_called_once()


def test_link_existing_document_requires_readback(monkeypatch):
    drive = GoogleDriveService()
    service = Mock()
    service.files.return_value.get.return_value.execute.return_value = metadata()
    monkeypatch.setattr(drive, "build_service", lambda credentials: service)
    assert drive.get_document_metadata("file-123", Mock())["id"] == "file-123"
    assert service.files.return_value.get.call_args.kwargs["supportsAllDrives"] is True
