"""Grant (or list) the super_admin role.

Roles are keyed by the Stack Auth user ID, so take the ID from the Stack Auth
dashboard (Users > the user > User ID) rather than trusting the profile email.

Run in the Render Shell of the `citizenhub` service:
    python scripts/grant_super_admin.py --list
    python scripts/grant_super_admin.py --user-id <stack-auth-user-id> --email phafanep@gmail.com
"""
import argparse
import asyncio
import json
import os
import sys

import asyncpg


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", action="store_true", help="show current super admins and exit")
    parser.add_argument("--user-id", help="Stack Auth user ID to grant super_admin")
    parser.add_argument("--email", help="expected email of that user (sanity check)")
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD") or os.environ.get("DATABASE_URL_PROD")
    if not db_url:
        print("DATABASE_URL_ADMIN_PROD / DATABASE_URL_PROD is not set")
        return 1

    conn = await asyncpg.connect(db_url)
    try:
        if args.list:
            rows = await conn.fetch("""
                SELECT ur.user_id, p.email, p.full_name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                LEFT JOIN user_profiles p ON p.user_id = ur.user_id
                WHERE r.role_name = 'super_admin'
                ORDER BY p.email
            """)
            if not rows:
                print("No super admins yet.")
            for row in rows:
                print(f"{row['user_id']}  {row['email'] or '(no profile)'}  {row['full_name'] or ''}")
            return 0

        if not args.user_id:
            parser.error("--user-id is required (or use --list)")

        role = await conn.fetchrow("SELECT id FROM roles WHERE role_name = 'super_admin'")
        if not role:
            print("The 'super_admin' role does not exist. Has the database been copied over yet?")
            return 1

        profile = await conn.fetchrow(
            "SELECT email, full_name FROM user_profiles WHERE user_id = $1", args.user_id
        )
        if profile:
            print(f"Found profile: {profile['email']} ({profile['full_name']})")
            if args.email and (profile["email"] or "").lower() != args.email.lower():
                print(f"Profile email does not match {args.email}. Check the user ID; nothing changed.")
                return 1
        else:
            print("No profile for this user ID yet. The role is granted anyway and applies once they "
                  "finish signing up.")

        result = await conn.execute(
            "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING",
            args.user_id, role["id"],
        )
        if result.endswith(" 0"):
            print("This user is already a super admin.")
            return 0

        await conn.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address)
            VALUES ($1, 'super_admin_created', 'user', $1, $2, 'grant_super_admin script')
        """, args.user_id, json.dumps({"email": args.email}))
        print("Granted super_admin. Ask the user to sign out and back in.")
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
