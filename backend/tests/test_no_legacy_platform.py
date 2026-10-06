"""The application must not depend on, or point at, the hosting platform it was exported from.

The words are assembled from parts so this file does not contain them itself.
"""
import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATTERN = re.compile("|".join(["data" + "button", "dbt" + "n", r"\bri" + "ff\b"]), re.IGNORECASE)
# The one place that has to name the old setting names: the note telling operators what to rename.
ALLOWED = {"docs/ECOSYSTEM.md"}
SKIP_SUFFIXES = {".png", ".jpg", ".ico", ".woff", ".woff2", ".lock", ".svg"}


def tracked_files():
    out = subprocess.run(["git", "ls-files", "-co", "--exclude-standard"], cwd=ROOT, capture_output=True, text=True, check=True)
    return [ROOT / p for p in out.stdout.splitlines() if (ROOT / p).is_file() and (ROOT / p).suffix not in SKIP_SUFFIXES]


def test_no_source_file_mentions_the_old_platform():
    hits = []
    for path in tracked_files():
        if path.relative_to(ROOT).as_posix() in ALLOWED:
            continue
        for n, line in enumerate(path.read_text(errors="ignore").splitlines(), 1):
            if PATTERN.search(line):
                hits.append(f"{path.relative_to(ROOT)}:{n}: {line.strip()[:100]}")
    assert not hits, "\n".join(hits[:30])


def test_the_old_platform_package_is_not_importable_by_the_app():
    out = subprocess.run(
        [sys.executable, "-c", "import sys; sys.path.insert(0, 'backend'); import main; print('data' + 'button' in sys.modules)"],
        cwd=ROOT / "backend", capture_output=True, text=True,
        env={**os.environ, "OPENAI_API_KEY": "x", "PYTHONPATH": str(ROOT / "backend")},
    )
    assert out.stdout.strip().endswith("False"), out.stderr[-1500:]
