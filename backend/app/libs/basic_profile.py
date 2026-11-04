"""Create the minimum website profile for a newly authenticated Citizen identity."""

from fastapi import HTTPException


async def ensure_basic_profile(conn, subject: str, email: str | None, name: str | None = None) -> None:
    """The identity provider owns the email; never attach an existing profile by email alone."""
    address = (email or "").strip().lower()
    if not address:
        raise HTTPException(status_code=409, detail="A verified email is required to complete your profile.")
    await conn.execute(
        """INSERT INTO user_profiles
           (user_id, email, full_name, phone, id_number, account_type,
            profile_completed, profile_completion_percentage, status)
           VALUES ($1, $2, $3, '', '', 'personal', FALSE, 0, 'active')
           ON CONFLICT (user_id) DO UPDATE SET
               full_name = CASE
                   WHEN user_profiles.full_name IS NULL OR trim(user_profiles.full_name) = ''
                        OR lower(user_profiles.full_name) = lower(user_profiles.email)
                   THEN EXCLUDED.full_name ELSE user_profiles.full_name END""",
        subject, address, (name or address).strip(),
    )
