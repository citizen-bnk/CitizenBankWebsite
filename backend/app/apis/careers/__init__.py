"""Careers: job adverts.

Public: adverts that are published AND wording-confirmed AND not past their closing date. An advert only gets there
through POST /admin/{id}/publish, which needs the super_admin role and an explicit confirm_wording=true (the
confirmation means the wording was checked against the licence status). Editing the text of a confirmed advert
withdraws the confirmation, so changed wording has to be confirmed again.

Applications are by email only; the public page shows careers.apply_instructions / careers.apply_email from the
policy settings. No CVs are stored here.
"""
from __future__ import annotations

from datetime import date
from typing import Any, Optional

import asyncpg
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.auth import AuthorizedUser
from app.libs.content_common import (
    STAFF_ROLES,
    find_wording_problems,
    get_user_roles,
    iso,
    jsonb_in,
    jsonb_out,
    slugify,
)
from app.libs.database import get_db_connection

router = APIRouter(prefix="/careers")

# "Today" in Lesotho (UTC+2), so an advert closing today stays visible until the end of that day.
TODAY_SQL = "(now() AT TIME ZONE 'Africa/Maseru')::date"
PUBLIC_WHERE = (
    f"status = 'published' AND wording_confirmed = true AND (closing_date IS NULL OR closing_date >= {TODAY_SQL})"
)

# Fields whose change withdraws a wording confirmation.
WORDING_FIELDS = {
    "title", "department", "employment_type", "location", "summary", "responsibilities", "requirements",
    "how_to_apply", "slug",
}


def is_open_to_public(status: str, wording_confirmed: bool, closing_date: date | None, today: date) -> bool:
    """Pure form of PUBLIC_WHERE, used by tests."""
    return status == "published" and bool(wording_confirmed) and (closing_date is None or closing_date >= today)


class PublicAdvert(BaseModel):
    id: int
    slug: str
    title: str
    department: Optional[str] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    responsibilities: list[str] = []
    requirements: list[str] = []
    how_to_apply: Optional[str] = None
    closing_date: Optional[str] = None


class AdminAdvert(PublicAdvert):
    status: str
    wording_confirmed: bool
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    source_note: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdvertCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: Optional[str] = Field(default=None, max_length=120)
    department: Optional[str] = Field(default=None, max_length=160)
    employment_type: Optional[str] = Field(default=None, max_length=120)
    location: Optional[str] = Field(default=None, max_length=160)
    summary: Optional[str] = Field(default=None, max_length=4000)
    responsibilities: list[str] = []
    requirements: list[str] = []
    how_to_apply: Optional[str] = Field(default=None, max_length=2000)
    closing_date: Optional[date] = None
    source_note: Optional[str] = Field(default=None, max_length=4000)


class AdvertUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    slug: Optional[str] = Field(default=None, max_length=120)
    department: Optional[str] = Field(default=None, max_length=160)
    employment_type: Optional[str] = Field(default=None, max_length=120)
    location: Optional[str] = Field(default=None, max_length=160)
    summary: Optional[str] = Field(default=None, max_length=4000)
    responsibilities: Optional[list[str]] = None
    requirements: Optional[list[str]] = None
    how_to_apply: Optional[str] = Field(default=None, max_length=2000)
    closing_date: Optional[date] = None
    source_note: Optional[str] = Field(default=None, max_length=4000)


class PublishRequest(BaseModel):
    confirm_wording: bool = False


def _public(row) -> PublicAdvert:
    return PublicAdvert(
        id=row["id"], slug=row["slug"], title=row["title"], department=row["department"],
        employment_type=row["employment_type"], location=row["location"], summary=row["summary"],
        responsibilities=jsonb_out(row["responsibilities"]), requirements=jsonb_out(row["requirements"]),
        how_to_apply=row["how_to_apply"], closing_date=iso(row["closing_date"]),
    )


def _admin(row) -> AdminAdvert:
    return AdminAdvert(
        **_public(row).model_dump(), status=row["status"], wording_confirmed=row["wording_confirmed"],
        approved_by=row["approved_by"], approved_at=iso(row["approved_at"]), source_note=row["source_note"],
        created_by=row["created_by"], created_at=iso(row["created_at"]), updated_at=iso(row["updated_at"]),
    )


async def _require_staff(user_id: str) -> set[str]:
    roles = await get_user_roles(user_id)
    if not roles & STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Access denied. Staff role required.")
    return roles


async def _unique_slug(conn, base: str, exclude_id: int | None = None) -> str:
    base = slugify(base)
    slug, n = base, 1
    while await conn.fetchval("SELECT 1 FROM job_adverts WHERE slug = $1 AND id IS DISTINCT FROM $2", slug, exclude_id):
        n += 1
        slug = f"{base}-{n}"
    return slug


# ------------------------------------------------------------------ public (no sign-in)

@router.get("/adverts")
async def list_public_adverts() -> list[PublicAdvert]:
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            f"SELECT * FROM job_adverts WHERE {PUBLIC_WHERE} ORDER BY closing_date ASC NULLS LAST, id ASC")
        return [_public(r) for r in rows]
    finally:
        await conn.close()


@router.get("/adverts/{slug}")
async def get_public_advert(slug: str) -> PublicAdvert:
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(f"SELECT * FROM job_adverts WHERE slug = $1 AND {PUBLIC_WHERE}", slug)
    finally:
        await conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Advert not found")
    return _public(row)


# ------------------------------------------------------------------ staff

@router.get("/admin/list")
async def admin_list(user: AuthorizedUser) -> list[AdminAdvert]:
    await _require_staff(user.sub)
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("SELECT * FROM job_adverts ORDER BY id ASC")
        return [_admin(r) for r in rows]
    finally:
        await conn.close()


@router.post("/admin")
async def admin_create(body: AdvertCreate, user: AuthorizedUser) -> AdminAdvert:
    await _require_staff(user.sub)
    conn = await get_db_connection()
    try:
        slug = await _unique_slug(conn, body.slug or body.title)
        try:
            row = await conn.fetchrow(
                """INSERT INTO job_adverts (slug, title, department, employment_type, location, summary,
                       responsibilities, requirements, how_to_apply, closing_date, status, wording_confirmed,
                       source_note, created_by)
                   VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,'draft',false,$11,$12) RETURNING *""",
                slug, body.title, body.department, body.employment_type, body.location, body.summary,
                jsonb_in(body.responsibilities), jsonb_in(body.requirements), body.how_to_apply,
                body.closing_date, body.source_note, user.sub)
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="An advert with this slug already exists")
        return _admin(row)
    finally:
        await conn.close()


@router.put("/admin/{advert_id}")
async def admin_update(advert_id: int, body: AdvertUpdate, user: AuthorizedUser) -> AdminAdvert:
    await _require_staff(user.sub)
    fields: dict[str, Any] = {k: getattr(body, k) for k in body.model_fields_set}
    if "title" in fields and fields["title"] is None:
        raise HTTPException(status_code=400, detail="title cannot be empty")
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    wording_changed = bool(WORDING_FIELDS & set(fields))
    for name in ("responsibilities", "requirements"):
        if name in fields:
            fields[name] = jsonb_in(fields[name])
    conn = await get_db_connection()
    try:
        if "slug" in fields:
            fields["slug"] = await _unique_slug(conn, fields["slug"] or "", exclude_id=advert_id)
        sets, values = [], []
        for name, value in fields.items():
            values.append(value)
            cast = "::jsonb" if name in ("responsibilities", "requirements") else ""
            sets.append(f"{name} = ${len(values)}{cast}")
        if wording_changed:
            sets += ["wording_confirmed = false", "approved_by = NULL", "approved_at = NULL",
                     "status = CASE WHEN status = 'published' THEN 'draft' ELSE status END"]
        values.append(advert_id)
        row = await conn.fetchrow(
            f"UPDATE job_adverts SET {', '.join(sets)}, updated_at = now() WHERE id = ${len(values)} RETURNING *",
            *values)
        if not row:
            raise HTTPException(status_code=404, detail="Advert not found")
        return _admin(row)
    finally:
        await conn.close()


@router.delete("/admin/{advert_id}")
async def admin_delete(advert_id: int, user: AuthorizedUser) -> dict:
    await _require_staff(user.sub)
    conn = await get_db_connection()
    try:
        result = await conn.execute("DELETE FROM job_adverts WHERE id = $1", advert_id)
    finally:
        await conn.close()
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Advert not found")
    return {"success": True}


@router.post("/admin/{advert_id}/publish")
async def admin_publish(advert_id: int, body: PublishRequest, user: AuthorizedUser) -> AdminAdvert:
    roles = await get_user_roles(user.sub)
    if "super_admin" not in roles:
        raise HTTPException(status_code=403, detail="Only a super_admin can publish an advert.")
    if body.confirm_wording is not True:
        raise HTTPException(
            status_code=400,
            detail="confirm_wording must be true: confirm the wording was checked against the licence status.")
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM job_adverts WHERE id = $1", advert_id)
        if not row:
            raise HTTPException(status_code=404, detail="Advert not found")
        if not (row["summary"] or "").strip():
            raise HTTPException(status_code=400, detail="The advert needs a summary before it can be published.")
        if row["closing_date"] is not None:
            today = await conn.fetchval(f"SELECT {TODAY_SQL}")
            if row["closing_date"] < today:
                raise HTTPException(status_code=400, detail="The closing date has passed. Change it first.")
        problems = find_wording_problems(
            row["title"], row["department"], row["summary"], jsonb_out(row["responsibilities"]),
            jsonb_out(row["requirements"]), row["how_to_apply"])
        if problems:
            raise HTTPException(
                status_code=400,
                detail="Wording conflicts with the licence status: " + "; ".join(problems) + ".")
        updated = await conn.fetchrow(
            """UPDATE job_adverts SET status='published', wording_confirmed=true, approved_by=$1, approved_at=now(),
                   updated_at=now() WHERE id=$2 RETURNING *""", user.sub, advert_id)
        return _admin(updated)
    finally:
        await conn.close()


@router.post("/admin/{advert_id}/close")
async def admin_close(advert_id: int, user: AuthorizedUser) -> AdminAdvert:
    await _require_staff(user.sub)
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            "UPDATE job_adverts SET status='closed', updated_at=now() WHERE id=$1 RETURNING *", advert_id)
        if not row:
            raise HTTPException(status_code=404, detail="Advert not found")
        return _admin(row)
    finally:
        await conn.close()
