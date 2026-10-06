"""Every picture the code refers to under /brand must exist in public/brand.

The pictures used to live on the old platform's servers; when that was removed the references were repointed to
/brand without the files, and the home page lost its hero. This keeps that from happening again.
"""
import pathlib
import re
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[2]
BRAND = ROOT / "public" / "brand"
SOURCES = [ROOT / "index.html", *(ROOT / "src").rglob("*.ts*"), *(ROOT / "backend" / "app").rglob("*.py")]
REF = re.compile(r"/brand/([A-Za-z0-9%._~ -]+\.(?:png|jpg|jpeg|webp|svg))")


def references():
    found = {}
    for path in SOURCES:
        for name in REF.findall(path.read_text(errors="ignore")):
            found.setdefault(urllib.parse.unquote(name), path.relative_to(ROOT).as_posix())
    return found


def test_every_brand_picture_the_code_uses_exists():
    refs = references()
    assert len(refs) >= 8, "the scan found too few references; the pattern is probably wrong"
    missing = {name: where for name, where in refs.items() if not (BRAND / name).is_file()}
    assert not missing, f"referenced under /brand but not in public/brand: {missing}"


def test_emails_use_formats_every_mail_client_can_show():
    for path in (ROOT / "backend" / "app").rglob("*.py"):
        text = path.read_text(errors="ignore")
        assert not re.search(r"/brand/[^\"']+\.webp", text), f"{path.name} uses WebP, which some email clients cannot show"


def test_the_pictures_are_light_enough_for_a_home_page():
    heavy = {p.name: p.stat().st_size // 1024 for p in BRAND.iterdir() if p.suffix in (".webp", ".jpg") and p.stat().st_size > 300 * 1024}
    assert not heavy, f"over 300 KB: {heavy}"
