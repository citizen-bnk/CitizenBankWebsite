"""Newsletters library.

Public: published issues whose visibility is 'public'. Members: published issues that are 'public' or 'members'.
Staff: everything, plus create / edit / upload / publish. Nothing is public until a super_admin or back_office
user publishes it with visibility 'public'.

The PDF lives in the shared file storage (runtime.storage.binary). Uploads are limited to 4 MB because of the
serverless request-size limit; a larger issue is linked with `external_url` instead.
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import Any, Literal, Optional

import asyncpg
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app import runtime
from app.auth import AuthorizedUser
from app.libs.content_common import (
    MEMBER_ROLES,
    NEWSLETTER_PUBLISH_ROLES,
    STAFF_ROLES,
    check_external_url,
    clean_download_name,
    content_disposition,
    get_user_roles,
    iso,
    jsonb_in,
    jsonb_out,
    slugify,
)
from app.libs.database import get_db_connection

router = APIRouter(prefix="/newsletters")

MAX_PDF_BYTES = 4 * 1024 * 1024
Visibility = Literal["public", "members", "internal"]

# Which visibilities each audience may see (always together with status = 'published').
AUDIENCE_VISIBILITY: dict[str, tuple[str, ...]] = {
    "public": ("public",),
    "members": ("public", "members"),
}


def is_visible(status: str, visibility: str, audience: str) -> bool:
    """Pure form of the visibility rule used by the list/get/file queries."""
    return status == "published" and visibility in AUDIENCE_VISIBILITY.get(audience, ())


# ------------------------------------------------------------------ models

class PublicNewsletter(BaseModel):
    id: int
    slug: str
    issue_no: Optional[int] = None
    series: Optional[str] = None
    title: str
    published_on: Optional[str] = None
    period_label: Optional[str] = None
    summary: Optional[str] = None
    sections: list[Any] = []
    has_file: bool = False
    file_bytes: Optional[int] = None
    external_url: Optional[str] = None


class AdminNewsletter(PublicNewsletter):
    visibility: str
    status: str
    file_name: Optional[str] = None
    sort_order: int = 0
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class NewsletterCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: Optional[str] = Field(default=None, max_length=120)
    issue_no: Optional[int] = None
    series: Optional[str] = Field(default=None, max_length=120)
    published_on: Optional[date] = None
    period_label: Optional[str] = Field(default=None, max_length=120)
    summary: Optional[str] = Field(default=None, max_length=4000)
    sections: list[Any] = []
    external_url: Optional[str] = None
    sort_order: int = 0


class NewsletterUpdate(BaseModel):
    """Content fields only. Visibility and status change through /publish and /unpublish."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    slug: Optional[str] = Field(default=None, max_length=120)
    issue_no: Optional[int] = None
    series: Optional[str] = Field(default=None, max_length=120)
    published_on: Optional[date] = None
    period_label: Optional[str] = Field(default=None, max_length=120)
    summary: Optional[str] = Field(default=None, max_length=4000)
    sections: Optional[list[Any]] = None
    external_url: Optional[str] = None
    sort_order: Optional[int] = None


class PublishRequest(BaseModel):
    visibility: Visibility


# ------------------------------------------------------------------ row helpers

def _public(row) -> PublicNewsletter:
    return PublicNewsletter(
        id=row["id"], slug=row["slug"], issue_no=row["issue_no"], series=row["series"], title=row["title"],
        published_on=iso(row["published_on"]), period_label=row["period_label"], summary=row["summary"],
        sections=jsonb_out(row["sections"]), has_file=bool(row["file_key"]), file_bytes=row["file_bytes"],
        external_url=row["external_url"],
    )


def _admin(row) -> AdminNewsletter:
    return AdminNewsletter(
        **_public(row).model_dump(), visibility=row["visibility"], status=row["status"],
        file_name=row["file_name"], sort_order=row["sort_order"] or 0, created_by=row["created_by"],
        created_at=iso(row["created_at"]), updated_at=iso(row["updated_at"]),
    )


ORDER = "ORDER BY published_on DESC NULLS LAST, sort_order DESC, id DESC"


async def _list(audience: str) -> list[PublicNewsletter]:
    vis = list(AUDIENCE_VISIBILITY[audience])
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            f"SELECT * FROM newsletters WHERE status = 'published' AND visibility = ANY($1::text[]) {ORDER}", vis)
        return [_public(r) for r in rows]
    finally:
        await conn.close()


async def _get_visible(item_id: int, audience: str):
    vis = list(AUDIENCE_VISIBILITY[audience])
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            "SELECT * FROM newsletters WHERE id = $1 AND status = 'published' AND visibility = ANY($2::text[])",
            item_id, vis)
    finally:
        await conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return row


def _file_response(row, download: bool, private: bool) -> Response:
    if not row["file_key"]:
        raise HTTPException(status_code=404, detail="This issue has no uploaded file")
    try:
        data = runtime.storage.binary.get(row["file_key"])
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as exc:  # storage not configured or unavailable
        print(f"newsletter file read failed: {exc}")
        raise HTTPException(status_code=503, detail="File storage is unavailable")
    name = clean_download_name(row["file_name"], row["title"])
    return Response(
        content=data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": content_disposition("attachment" if download else "inline", name),
            "Cache-Control": "private, no-store" if private else "public, max-age=60",
            "X-Content-Type-Options": "nosniff",
        },
    )


async def _require_staff(user_id: str) -> set[str]:
    roles = await get_user_roles(user_id)
    if not roles & STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Access denied. Staff role required.")
    return roles


async def _require_publisher(user_id: str) -> None:
    roles = await get_user_roles(user_id)
    if not roles & NEWSLETTER_PUBLISH_ROLES:
        raise HTTPException(status_code=403, detail="Only super_admin or back_office can publish or unpublish.")


async def _unique_slug(conn, base: str, exclude_id: int | None = None) -> str:
    base = slugify(base)
    slug, n = base, 1
    while await conn.fetchval("SELECT 1 FROM newsletters WHERE slug = $1 AND id IS DISTINCT FROM $2", slug, exclude_id):
        n += 1
        slug = f"{base}-{n}"
    return slug


# ------------------------------------------------------------------ public (no sign-in)

@router.get("")
async def list_public_newsletters() -> list[PublicNewsletter]:
    return await _list("public")


# ------------------------------------------------------------------ members (any signed-in Hub role)
# Static paths are declared before "/{item_id}".

async def _require_member(user_id: str) -> None:
    roles = await get_user_roles(user_id)
    if not roles & MEMBER_ROLES:
        raise HTTPException(status_code=403, detail="Access denied. A member role is required.")


@router.get("/members")
async def list_member_newsletters(user: AuthorizedUser) -> list[PublicNewsletter]:
    await _require_member(user.sub)
    return await _list("members")


@router.get("/members/{item_id}/file")
async def member_newsletter_file(item_id: int, user: AuthorizedUser, download: int = 0) -> Response:
    await _require_member(user.sub)
    row = await _get_visible(item_id, "members")
    return _file_response(row, bool(download), private=True)


# ------------------------------------------------------------------ staff

@router.get("/admin/list")
async def admin_list(user: AuthorizedUser) -> list[AdminNewsletter]:
    await _require_staff(user.sub)
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(f"SELECT * FROM newsletters {ORDER}")
        return [_admin(r) for r in rows]
    finally:
        await conn.close()


@router.post("/admin")
async def admin_create(body: NewsletterCreate, user: AuthorizedUser) -> AdminNewsletter:
    await _require_staff(user.sub)
    url = check_external_url(body.external_url)
    conn = await get_db_connection()
    try:
        slug = await _unique_slug(conn, body.slug or body.title)
        try:
            row = await conn.fetchrow(
                """INSERT INTO newsletters (slug, issue_no, series, title, published_on, period_label, summary,
                       sections, visibility, status, external_url, sort_order, created_by)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'internal','draft',$9,$10,$11) RETURNING *""",
                slug, body.issue_no, body.series, body.title, body.published_on, body.period_label, body.summary,
                jsonb_in(body.sections), url, body.sort_order, user.sub)
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="A newsletter with this slug already exists")
        return _admin(row)
    finally:
        await conn.close()


@router.put("/admin/{item_id}")
async def admin_update(item_id: int, body: NewsletterUpdate, user: AuthorizedUser) -> AdminNewsletter:
    await _require_staff(user.sub)
    fields = {k: getattr(body, k) for k in body.model_fields_set}
    if "title" in fields and fields["title"] is None:
        raise HTTPException(status_code=400, detail="title cannot be empty")
    if "external_url" in fields:
        fields["external_url"] = check_external_url(fields["external_url"])
    if "sections" in fields:
        fields["sections"] = jsonb_in(fields["sections"])
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    conn = await get_db_connection()
    try:
        if "slug" in fields:
            fields["slug"] = await _unique_slug(conn, fields["slug"] or "", exclude_id=item_id)
        sets, values = [], []
        for name, value in fields.items():
            values.append(value)
            cast = "::jsonb" if name == "sections" else ""
            sets.append(f"{name} = ${len(values)}{cast}")
        values.append(item_id)
        row = await conn.fetchrow(
            f"UPDATE newsletters SET {', '.join(sets)}, updated_at = now() WHERE id = ${len(values)} RETURNING *",
            *values)
        if not row:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        return _admin(row)
    finally:
        await conn.close()


@router.delete("/admin/{item_id}")
async def admin_delete(item_id: int, user: AuthorizedUser) -> dict:
    roles = await _require_staff(user.sub)
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM newsletters WHERE id = $1", item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        if row["status"] == "published" and not roles & NEWSLETTER_PUBLISH_ROLES:
            raise HTTPException(status_code=403, detail="Unpublish the issue before deleting it")
        await conn.execute("DELETE FROM newsletters WHERE id = $1", item_id)
    finally:
        await conn.close()
    if row["file_key"]:
        try:
            runtime.storage.binary.delete(row["file_key"])
        except Exception as exc:
            print(f"Warning: could not delete newsletter file: {exc}")
    return {"success": True}


@router.post("/admin/{item_id}/file")
async def admin_upload_file(item_id: int, user: AuthorizedUser, file: UploadFile = File(...)) -> AdminNewsletter:
    await _require_staff(user.sub)
    name = file.filename or "newsletter.pdf"
    if file.content_type not in ("application/pdf", "application/x-pdf", "application/octet-stream") \
            or not name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    data = await file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(
            status_code=413,
            detail="PDF is larger than 4 MB. Store it elsewhere and set external_url instead.")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="The file is not a valid PDF")
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM newsletters WHERE id = $1", item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        key = f"newsletters/{item_id}/{uuid.uuid4().hex[:12]}.pdf"
        try:
            runtime.storage.binary.put(key, data)
        except Exception as exc:
            print(f"newsletter upload failed: {exc}")
            raise HTTPException(status_code=503, detail="File storage is unavailable")
        updated = await conn.fetchrow(
            "UPDATE newsletters SET file_key=$1, file_bytes=$2, file_name=$3, updated_at=now() WHERE id=$4 RETURNING *",
            key, len(data), clean_download_name(name, row["title"]), item_id)
    finally:
        await conn.close()
    if row["file_key"]:
        try:
            runtime.storage.binary.delete(row["file_key"])
        except Exception as exc:
            print(f"Warning: could not delete old newsletter file: {exc}")
    return _admin(updated)


@router.post("/admin/{item_id}/publish")
async def admin_publish(item_id: int, body: PublishRequest, user: AuthorizedUser) -> AdminNewsletter:
    await _require_publisher(user.sub)
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            "UPDATE newsletters SET status='published', visibility=$1, updated_at=now() WHERE id=$2 RETURNING *",
            body.visibility, item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        return _admin(row)
    finally:
        await conn.close()


@router.post("/admin/{item_id}/unpublish")
async def admin_unpublish(item_id: int, user: AuthorizedUser) -> AdminNewsletter:
    await _require_publisher(user.sub)
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            "UPDATE newsletters SET status='draft', updated_at=now() WHERE id=$1 RETURNING *", item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        return _admin(row)
    finally:
        await conn.close()


# ------------------------------------------------------------------ public by id (declared last)

@router.get("/{item_id}")
async def get_public_newsletter(item_id: int) -> PublicNewsletter:
    return _public(await _get_visible(item_id, "public"))


@router.get("/{item_id}/file")
async def public_newsletter_file(item_id: int, download: int = 0) -> Response:
    row = await _get_visible(item_id, "public")
    return _file_response(row, bool(download), private=False)
