#!/usr/bin/env bash
# Copy all data from the old Riff/Neon Postgres into the new Render Postgres.
#
# Usage:
#   OLD_DATABASE_URL='postgresql://...neon...' \
#   NEW_DATABASE_URL='postgresql://...render... (External Database URL)' \
#   ./scripts/migrate_database.sh
#
# Needs pg_dump/pg_restore version >= the old server's Postgres version.
set -euo pipefail
: "${OLD_DATABASE_URL:?set OLD_DATABASE_URL}"
: "${NEW_DATABASE_URL:?set NEW_DATABASE_URL}"

dump="$(mktemp -t citizenhub-XXXX.dump)"
trap 'rm -f "$dump"' EXIT

echo "Dumping old database..."
pg_dump --format=custom --no-owner --no-privileges --dbname="$OLD_DATABASE_URL" --file="$dump"

echo "Restoring into new database..."
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$NEW_DATABASE_URL" "$dump"

echo "Row counts in the new database:"
psql "$NEW_DATABASE_URL" -c "SELECT relname AS table, n_live_tup AS rows FROM pg_stat_user_tables ORDER BY relname;"
