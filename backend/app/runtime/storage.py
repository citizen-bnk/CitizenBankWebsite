"""Private binary document storage. `binary` has get/put/delete/list.

Prefer a connected private Vercel Blob store (BLOB_STORE_ID and Vercel OIDC).
Existing S3 installations can supply R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
R2_SECRET_ACCESS_KEY, R2_BUCKET (or S3_ENDPOINT_URL).

The client is built on first use, so importing this module needs no settings. When they are missing every call fails
with a message naming them, instead of silently losing files.
"""
import os
import threading
from dataclasses import dataclass
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


@dataclass
class FileListEntry:
    name: str
    size: int


class S3BinaryStorage:
    def __init__(self, bucket: str, endpoint_url: str, access_key: str, secret_key: str):
        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto",
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )

    def put(self, key: str, value: bytes) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=value)

    def get(self, key: str, *, default: Optional[bytes] = None) -> Optional[bytes]:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
                if default is not None:
                    return default
                raise FileNotFoundError(key) from e
            raise

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def list(self) -> list[FileListEntry]:
        entries: list[FileListEntry] = []
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket):
            for obj in page.get("Contents", []):
                entries.append(FileListEntry(name=obj["Key"], size=obj["Size"]))
        return entries


class VercelBlobBinaryStorage:
    """Keep database document keys stable while storing bytes in a private Blob store."""

    def __init__(self):
        from vercel import blob as blob_errors
        from vercel.blob import sync as blob
        self.blob = blob
        self.not_found = blob_errors.BlobNotFoundError

    def put(self, key: str, value: bytes) -> None:
        self.blob.put_blob(key, value, access="private", allow_overwrite=False)

    def get(self, key: str, *, default: Optional[bytes] = None) -> Optional[bytes]:
        try:
            return self.blob.get_blob(key, access="private").body
        except self.not_found as error:
            if default is not None:
                return default
            raise FileNotFoundError(key) from error

    def delete(self, key: str) -> None:
        self.blob.delete_blob(key)

    def list(self) -> list[FileListEntry]:
        return [FileListEntry(name=item.pathname, size=item.size)
                for item in self.blob.query_blobs()]




class _LazyStorage:
    def __init__(self):
        self._impl: S3BinaryStorage | VercelBlobBinaryStorage | None = None
        self._lock = threading.Lock()

    def _get(self) -> S3BinaryStorage | VercelBlobBinaryStorage:
        if self._impl is None:
            with self._lock:
                if self._impl is None:
                    self._impl = _build()
        return self._impl

    def get(self, key: str, *, default: Optional[bytes] = None) -> Optional[bytes]:
        return self._get().get(key, default=default)

    def put(self, key: str, value: bytes) -> None:
        return self._get().put(key, value)

    def delete(self, key: str) -> None:
        return self._get().delete(key)

    def list(self) -> list[FileListEntry]:
        return self._get().list()


def _build() -> S3BinaryStorage | VercelBlobBinaryStorage:
    if os.environ.get("BLOB_STORE_ID") or os.environ.get("BLOB_READ_WRITE_TOKEN"):
        return VercelBlobBinaryStorage()
    bucket = os.environ.get("R2_BUCKET") or os.environ.get("S3_BUCKET")
    access_key = os.environ.get("R2_ACCESS_KEY_ID") or os.environ.get("S3_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY") or os.environ.get("S3_SECRET_ACCESS_KEY")
    endpoint = os.environ.get("S3_ENDPOINT_URL")
    account_id = os.environ.get("R2_ACCOUNT_ID")
    if not endpoint and account_id:
        endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
    if not (bucket and access_key and secret_key and endpoint):
        raise RuntimeError(
            "File storage is not configured. Connect a private Vercel Blob store (BLOB_STORE_ID) "
            "or configure the existing S3 storage settings to enable uploads."
        )
    return S3BinaryStorage(bucket, endpoint, access_key, secret_key)


binary = _LazyStorage()
