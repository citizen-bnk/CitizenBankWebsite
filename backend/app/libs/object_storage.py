"""S3-compatible file storage (Cloudflare R2) that replaces Databutton storage.

The app calls `db.storage.binary.get/put/delete/list` in many places. `install()`
swaps `databutton.storage.binary` for an R2-backed store with the same interface,
so those call sites keep working unchanged.

Env vars:
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
    (or S3_ENDPOINT_URL instead of R2_ACCOUNT_ID for any other S3 provider)
"""
import os
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


def install() -> bool:
    """Route databutton storage calls to R2/S3 when it is configured."""
    bucket = os.environ.get("R2_BUCKET") or os.environ.get("S3_BUCKET")
    access_key = os.environ.get("R2_ACCESS_KEY_ID") or os.environ.get("S3_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY") or os.environ.get("S3_SECRET_ACCESS_KEY")
    endpoint = os.environ.get("S3_ENDPOINT_URL")
    account_id = os.environ.get("R2_ACCOUNT_ID")
    if not endpoint and account_id:
        endpoint = f"https://{account_id}.r2.cloudflarestorage.com"

    if not (bucket and access_key and secret_key and endpoint):
        print("Object storage not configured; file uploads will fall back to Databutton storage")
        return False

    import databutton.storage

    databutton.storage.binary = S3BinaryStorage(bucket, endpoint, access_key, secret_key)
    print(f"Object storage: using bucket '{bucket}'")
    return True
