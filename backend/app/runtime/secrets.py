"""Secrets are ordinary environment variables."""
import os


def get(name: str, default: str | None = None) -> str | None:
    return os.environ.get(name, default)
