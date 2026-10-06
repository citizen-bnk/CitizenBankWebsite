# Step C: platform schema and person backfill

Status: code written and tested locally on 6 October 2026. **Not run against production.**

## What it does

Creates a `platform` schema in the website database and fills it from the existing tables:

| New table | Filled from |
|---|---|
| `platform.person` | One row per Stack Auth user ID found in `user_profiles` or `user_roles` |
| `platform.identity_mapping` | `(stack_auth, user_id)` to person. One subject maps to exactly one person. |
| `platform.membership` | `user_roles` joined to `roles`. Controlled by `platform.role_definition`. |
| `platform.migration_review` | Anything ambiguous: see below |
| `platform.audit_log` | One entry per run |
| `platform.person_public` (view) | `id`, `display_name`, `status` only. For Bank Core later. |

Existing tables are read, never changed. Nothing in the apps reads the new tables yet, so this step
cannot affect the running site.

## Rules

- People are **never merged** on name or email. The same email on two accounts gives two people and a
  `duplicate_email` review item.
- A role with no profile gives a person and a `role_without_profile` item (the super-admin script can
  grant roles before someone finishes signing up).
- A profile with no email gives a `missing_email` item.
- A role name outside `platform.role_definition` is not granted and gives an `unknown_role` item.
- Re-running creates nothing new. Review items you marked `resolved` stay resolved.
- If the reconciliation check fails (every subject mapped, no orphan mappings), nothing is committed.

## How to run it (Render Shell on `citizenhub`)

```bash
python scripts/backfill_platform_person.py            # dry run, rolled back, prints counts only
python scripts/backfill_platform_person.py --apply    # commit
```

The database user in `DATABASE_URL_ADMIN_PROD` needs permission to create a schema. Output holds counts
only, no names or emails. Review items are in `platform.migration_review` (`status = 'open'`).
Back up the database first. The step only adds objects, so rollback is `DROP SCHEMA platform CASCADE`.

## What was tested

12 tests in `backend/tests/test_platform_backfill.py`, run against a real PostgreSQL 16 started locally
(`PG_TEST_URL=postgresql://... pytest`). They are skipped when `PG_TEST_URL` is unset. Mutation checks
(idempotency guard removed, unknown roles granted, dry run committing) each made a test fail. The script
was also run end to end against a seeded database: dry run changed nothing, apply committed, a second
apply created nothing.

## Not verified

- **The production table definitions are not in the repo.** The tests use legacy tables reconstructed from
  how the code queries them. The script checks that `user_profiles`, `roles` and `user_roles` have the
  columns it reads and stops with a message if not. The dry run is the real test: run it on production
  and read the counts before applying.
- The code in some handlers reads `user_roles.role` (text) and `role_name`, others use `role_id`. The
  backfill reads both when the text column exists. Which one production really has is only known from
  the dry run.
- `neon_auth.users_sync` (a Stack Auth user table the old Neon database had) is not used. Users who have
  neither a profile nor a role are therefore not backfilled. They get a person the first time they sign in
  through the platform session (step D).
- Production size and the Postgres version on Render were not checked. `gen_random_uuid()` needs
  PostgreSQL 13 or newer.

## Next (step D)

`/signin`, the `platform.session` table, the `cz_session` cookie and the JWKS endpoint. These will create
a person for any Stack Auth user who has no mapping yet.
