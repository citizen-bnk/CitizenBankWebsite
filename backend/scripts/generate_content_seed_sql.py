"""Regenerate migrations/content/004-006 seed files from app/libs/content_seed.py.

    cd backend && python3 scripts/generate_content_seed_sql.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.libs.content_seed_sql import GENERATED, MIGRATIONS_DIR  # noqa: E402

for name, build in GENERATED.items():
    (MIGRATIONS_DIR / name).write_text(build())
    print("wrote", MIGRATIONS_DIR / name)
