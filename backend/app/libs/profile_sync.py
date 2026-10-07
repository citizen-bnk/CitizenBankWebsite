"""Keep copies of a person's name/phone in step with user_profiles.

Called from PUT /users/profile inside the same transaction, after the UPDATE, and only for
the fields that actually changed (full_name, phone). user_profiles stays the source of truth.

Copies that are legal snapshots are never touched: issued certificates, data-room signatures,
and share_subscriptions that already have a certificate or are completed.

The real DDL for board_members / share_subscriptions is not in the repo, so every column that
is not confirmed by code is checked in information_schema before it is written, and each
statement runs in a savepoint so a surprise can never abort the profile update.
"""
from __future__ import annotations

import contextlib
from typing import Optional

PROVIDER = "stack_auth"
# Phone-like columns that may exist on board_members (code only ever READS mobile_number).
BOARD_PHONE_COLUMNS = ("mobile_number", "phone", "mobile")


def _savepoint(conn):
    tx = getattr(conn, "transaction", None)
    return tx() if callable(tx) else contextlib.nullcontext()


def changed(old: Optional[str], new: Optional[str]) -> bool:
    """True when `new` was supplied and differs from `old` (whitespace-insensitive)."""
    return new is not None and (old or "").strip() != new.strip()


async def _columns(conn, schema: str, table: str) -> set[str]:
    rows = await conn.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2",
        schema, table,
    )
    return {r["column_name"] for r in rows}


async def sync_profile_copies(
    conn, user_id: str, *, name_changed: bool, new_name: Optional[str],
    phone_changed: bool, new_phone: Optional[str],
) -> dict:
    """Propagate a name/phone change. Returns {target: bool} of what was attempted OK."""
    done: dict[str, bool] = {}
    if not (name_changed or phone_changed):
        return done

    async def run(label, sql, *args):
        try:
            async with _savepoint(conn):
                await conn.execute(sql, *args)
            done[label] = True
        except Exception as e:  # noqa: BLE001
            print(f"profile_sync: {label} skipped: {e}")
            done[label] = False

    # 1. platform.person via identity_mapping (display name only; email is not editable here)
    if name_changed and new_name:
        await run(
            "platform.person",
            """UPDATE platform.person
               SET display_name = $1, version = version + 1, updated_at = now()
               WHERE id = (SELECT person_id FROM platform.identity_mapping
                           WHERE provider = $2 AND subject = $3)""",
            new_name, PROVIDER, user_id,
        )

    # 2. board_members: name, and whichever phone columns really exist
    try:
        board_cols = await _columns(conn, "public", "board_members")
    except Exception as e:  # noqa: BLE001
        print(f"profile_sync: cannot inspect board_members: {e}")
        board_cols = set()
    sets, args = [], []
    if name_changed and new_name and "full_name" in board_cols:
        args.append(new_name)
        sets.append(f"full_name = ${len(args)}")
    if phone_changed:
        for col in BOARD_PHONE_COLUMNS:
            if col in board_cols:
                args.append(new_phone)
                sets.append(f"{col} = ${len(args)}")
    if sets and "user_id" in board_cols:
        args.append(user_id)
        await run("board_members", f"UPDATE board_members SET {', '.join(sets)} WHERE user_id = ${len(args)}", *args)

    # 3. share_subscriptions: only still-open ones (no certificate issued, not completed)
    sub_cols = {"full_name", "phone", "certificate_number", "status", "user_id"}
    try:
        sub_cols = await _columns(conn, "public", "share_subscriptions")
    except Exception as e:  # noqa: BLE001
        print(f"profile_sync: cannot inspect share_subscriptions: {e}")
    sets, args = [], []
    if name_changed and new_name and "full_name" in sub_cols:
        args.append(new_name)
        sets.append(f"full_name = ${len(args)}")
    if phone_changed and "phone" in sub_cols:
        args.append(new_phone)
        sets.append(f"phone = ${len(args)}")
    if sets and {"user_id", "certificate_number", "status"} <= sub_cols:
        args.append(user_id)
        guard = "certificate_number IS NULL AND COALESCE(status, '') <> 'completed'"
        if "certificate_issued_date" in sub_cols:
            guard += " AND certificate_issued_date IS NULL"
        await run(
            "share_subscriptions",
            f"UPDATE share_subscriptions SET {', '.join(sets)} WHERE user_id = ${len(args)} AND {guard}",
            *args,
        )
    return done
