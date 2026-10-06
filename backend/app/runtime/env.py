"""Deployment mode. APP_ENV=production marks a deployed service; anything else is development."""
import os
from enum import Enum


class Mode(str, Enum):
    DEV = "development"
    PROD = "production"


mode = Mode.PROD if os.environ.get("APP_ENV") == "production" else Mode.DEV
