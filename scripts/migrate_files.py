"""Copy every file from Databutton storage into the Cloudflare R2 bucket.

Usage (from the repo root, with backend dependencies installed):
    DATABUTTON_PROJECT_ID=... DATABUTTON_TOKEN=... \
    R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=citizenhub-files \
    python scripts/migrate_files.py

Safe to re-run: files already in R2 with the same size are skipped.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import databutton.storage  # noqa: E402

from app.libs.object_storage import S3BinaryStorage  # noqa: E402

source = databutton.storage.binary
account_id = os.environ["R2_ACCOUNT_ID"]
target = S3BinaryStorage(
    bucket=os.environ["R2_BUCKET"],
    endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
    access_key=os.environ["R2_ACCESS_KEY_ID"],
    secret_key=os.environ["R2_SECRET_ACCESS_KEY"],
)

existing = {f.name: f.size for f in target.list()}
files = source.list()
print(f"{len(files)} files in Databutton storage, {len(existing)} already in R2")

copied = failed = 0
for f in files:
    if existing.get(f.name) == f.size:
        continue
    try:
        target.put(f.name, source.get(f.name))
        copied += 1
        print(f"copied {f.name} ({f.size} bytes)")
    except Exception as e:
        failed += 1
        print(f"FAILED {f.name}: {e}")

print(f"Done: {copied} copied, {failed} failed")
sys.exit(1 if failed else 0)
