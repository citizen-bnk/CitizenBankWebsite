#!/usr/bin/env bash
# Build the DEMO database from the live one: its structure plus a short list of reference data, and NO personal data.
#
# The website's tables are not defined anywhere in this repository (they were created by the old platform), so a new
# demo database starts empty and the app cannot run on it. This copies the structure only. It does not copy
# people, subscriptions, payments, board records, documents or anything else a person entered.
#
# Usage (from any computer with PostgreSQL client tools, version 16 or newer than the source server):
#   SOURCE_DATABASE_URL='postgresql://...production, External Database URL...' \
#   DEMO_DATABASE_URL='postgresql://...the NEW empty demo database, External Database URL...' \
#   ./scripts/clone_schema_for_demo.sh
#
# The source is only read. The demo database must be new and empty, and must not be the source.
# Optional:
#   REFERENCE_TABLES   space-separated tables whose rows are copied (default: "roles share_classes"; "" copies none)
#   EXCLUDE_SCHEMAS    space-separated schemas to leave out of the structure copy
set -euo pipefail

die() { echo "Refused: $*" >&2; exit 1; }

: "${SOURCE_DATABASE_URL:?set SOURCE_DATABASE_URL (the live database, read only)}"
: "${DEMO_DATABASE_URL:?set DEMO_DATABASE_URL (the new, empty demo database)}"
REFERENCE_TABLES="${REFERENCE_TABLES-roles share_classes}"
EXCLUDE_SCHEMAS="${EXCLUDE_SCHEMAS-}"

# Tables that hold what people entered. They can never be copied, whatever REFERENCE_TABLES says.
NEVER_COPY=" user_profiles user_roles user_invitations share_subscriptions subscription_payments board_members \
board_documents audit_logs notifications messages investor_leads lead_chat investor_chat bank_accounts crypto_wallets \
debit_orders dividends portfolio certificates share_certificates activity_log user_activity_tracking "

command -v psql >/dev/null || die "psql is not installed"
command -v pg_dump >/dev/null || die "pg_dump is not installed"
sql() { psql "$1" -X -A -t -v ON_ERROR_STOP=1 -c "$2"; }

for t in $REFERENCE_TABLES; do
  [[ "$t" =~ ^[a-z_][a-z0-9_]*$ ]] || die "'$t' is not a plain table name"
  [[ "$NEVER_COPY" != *" $t "* ]] || die "'$t' holds personal data and is never copied"
done

# Same server and database? Compare identities, not just the text of the URLs.
identity() { sql "$1" "select current_database() || '|' || (select oid from pg_database where datname = current_database()) || '|' || pg_postmaster_start_time()"; }
[ "$SOURCE_DATABASE_URL" != "$DEMO_DATABASE_URL" ] || die "the source and demo database URLs are the same"
src_id="$(identity "$SOURCE_DATABASE_URL")" || die "cannot connect to the source database"
demo_id="$(identity "$DEMO_DATABASE_URL")" || die "cannot connect to the demo database"
[ "$src_id" != "$demo_id" ] || die "the demo database IS the source database (same server and database)"

tables_in_demo="$(sql "$DEMO_DATABASE_URL" "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema') and table_schema not like 'pg_toast%'")"
[ "$tables_in_demo" = "0" ] || die "the demo database already has $tables_in_demo table(s); create a new empty database for the demo"

for t in $REFERENCE_TABLES; do
  [ "$(sql "$SOURCE_DATABASE_URL" "select to_regclass('public.$t') is not null")" = "t" ] || die "table public.$t does not exist in the source"
done

exclude=()
for s in $EXCLUDE_SCHEMAS; do
  [[ "$s" =~ ^[a-z_][a-z0-9_]*$ ]] || die "'$s' is not a plain schema name"
  exclude+=(--exclude-schema="$s")
done

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT

echo "1/3 Copying the structure (no rows)..."
pg_dump --schema-only --no-owner --no-privileges "${exclude[@]}" --dbname="$SOURCE_DATABASE_URL" --file="$work/schema.sql"
psql "$DEMO_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$work/schema.sql" >/dev/null

echo "2/3 Copying reference rows: ${REFERENCE_TABLES:-none}"
for t in $REFERENCE_TABLES; do
  pg_dump --data-only --no-owner --no-privileges --table="public.$t" --dbname="$SOURCE_DATABASE_URL" --file="$work/$t.sql"
  psql "$DEMO_DATABASE_URL" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$work/$t.sql" >/dev/null
done

echo "3/3 Checking that no personal data came across..."
for t in $NEVER_COPY; do
  [ "$(sql "$DEMO_DATABASE_URL" "select to_regclass('public.$t') is not null")" = "t" ] || continue
  n="$(sql "$DEMO_DATABASE_URL" "select count(*) from public.$t")"
  [ "$n" = "0" ] || die "public.$t has $n row(s) in the demo database; this must never happen. Delete the demo database and investigate."
done

echo
echo "Done. Tables in the demo database and their rows:"
sql "$DEMO_DATABASE_URL" "select format('  %-40s %s', schemaname || '.' || relname, n_live_tup) from pg_stat_user_tables order by 1" | head -150
echo
echo "Tables in the SOURCE with 50 rows or fewer (candidates for REFERENCE_TABLES if the demo needs them; check each"
echo "one holds no personal data first). Counts only:"
sql "$SOURCE_DATABASE_URL" "select format('  %-40s %s', relname, n_live_tup) from pg_stat_user_tables where schemaname = 'public' and n_live_tup between 1 and 50 order by 1" | head -60
