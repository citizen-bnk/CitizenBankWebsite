"""Tests for scripts/clone_schema_for_demo.sh against real databases (set PG_TEST_URL to run).

The point of the script is to give the demo a copy of the structure and NOT a copy of what people entered, so most of
these tests are about what it refuses to do and what must never arrive.
"""
import os
import pathlib
import shutil
import subprocess
import uuid
from urllib.parse import urlparse, urlunparse

import pytest

PG_TEST_URL = os.environ.get("PG_TEST_URL")
SCRIPT = pathlib.Path(__file__).resolve().parents[2] / "scripts" / "clone_schema_for_demo.sh"
pytestmark = pytest.mark.skipif(
    not PG_TEST_URL or not shutil.which("pg_dump") or not shutil.which("psql"),
    reason="needs PG_TEST_URL and the PostgreSQL client tools",
)


def url_for(db: str) -> str:
    p = urlparse(PG_TEST_URL)
    return urlunparse(p._replace(path="/" + db))


def psql(url: str, sql: str) -> str:
    r = subprocess.run(["psql", url, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return r.stdout.strip()


@pytest.fixture
def dbs():
    tag = uuid.uuid4().hex[:8]
    src, demo = f"src_{tag}", f"demo_{tag}"
    admin = url_for("postgres")
    for name in (src, demo):
        psql(admin, f"create database {name}")
    psql(url_for(src), """
        create table roles (id serial primary key, role_name text unique not null);
        insert into roles (role_name) values ('customer'), ('investor'), ('super_admin');
        create table share_classes (id serial primary key, name text, price numeric);
        insert into share_classes (name, price) values ('Class C', 10);
        create table user_profiles (user_id text primary key, email text, full_name text);
        insert into user_profiles values ('u1', 'real.person@company.test', 'Real Person'), ('u2', 'other@company.test', 'Other');
        create table share_subscriptions (id serial primary key, user_id text, total_amount numeric);
        insert into share_subscriptions (user_id, total_amount) values ('u1', 123456);
        create table email_templates (id serial primary key, body text);
        insert into email_templates (body) values ('hello');
        create schema platform;
        create table platform.person (id uuid primary key, display_name text);
        insert into platform.person values (gen_random_uuid(), 'Real Person');
    """)
    yield url_for(src), url_for(demo)
    for name in (src, demo):
        psql(admin, f"drop database if exists {name} with (force)")


def run(src, demo, **env):
    full = {**os.environ, "SOURCE_DATABASE_URL": src, "DEMO_DATABASE_URL": demo, **env}
    return subprocess.run(["bash", str(SCRIPT)], env=full, capture_output=True, text=True)


def count(url, table):
    return int(psql(url, f"select count(*) from {table}"))


def demo_is_empty(url):
    return psql(url, "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')") == "0"


def test_copies_the_structure_and_only_the_reference_rows(dbs):
    src, demo = dbs
    r = run(src, demo)
    assert r.returncode == 0, r.stdout + r.stderr
    for table in ("roles", "share_classes", "user_profiles", "share_subscriptions", "email_templates", "platform.person"):
        assert psql(demo, f"select to_regclass('{table}') is not null") == "t", table
    assert count(demo, "roles") == 3 and count(demo, "share_classes") == 1
    assert psql(demo, "select string_agg(role_name, ',' order by role_name) from roles") == "customer,investor,super_admin"


def test_no_personal_data_arrives(dbs):
    src, demo = dbs
    assert run(src, demo).returncode == 0
    assert count(demo, "user_profiles") == 0 and count(demo, "share_subscriptions") == 0
    assert count(demo, "platform.person") == 0 and count(demo, "email_templates") == 0
    dump = subprocess.run(["pg_dump", "--data-only", demo], capture_output=True, text=True).stdout
    assert "real.person@company.test" not in dump and "Real Person" not in dump and "123456" not in dump


def test_the_source_is_never_changed(dbs):
    src, demo = dbs
    before = [count(src, t) for t in ("roles", "user_profiles", "share_subscriptions", "platform.person")]
    assert run(src, demo).returncode == 0
    assert [count(src, t) for t in ("roles", "user_profiles", "share_subscriptions", "platform.person")] == before == [3, 2, 1, 1]


def test_refuses_when_the_demo_database_is_the_source(dbs):
    src, _ = dbs
    r = run(src, src)
    assert r.returncode != 0 and "the same" in r.stderr
    assert count(src, "user_profiles") == 2


def test_refuses_the_source_even_when_the_url_is_written_differently(dbs):
    src, _ = dbs
    other_spelling = src + ("&" if "?" in src else "?") + "application_name=sneaky"
    r = run(src, other_spelling)
    assert r.returncode != 0 and "IS the source" in r.stderr
    p = urlparse(src)
    if p.hostname == "127.0.0.1":
        alt = urlunparse(p._replace(netloc=p.netloc.replace("127.0.0.1", "localhost")))
        r = run(src, alt)
        assert r.returncode != 0 and "IS the source" in r.stderr
    assert count(src, "user_profiles") == 2 and count(src, "roles") == 3  # nothing was dropped or duplicated


def test_refuses_a_demo_database_that_already_has_tables(dbs):
    src, demo = dbs
    psql(demo, "create table something (id int)")
    r = run(src, demo)
    assert r.returncode != 0 and "already has 1 table" in r.stderr
    assert psql(demo, "select count(*) from information_schema.tables where table_schema = 'public'") == "1"


@pytest.mark.parametrize("bad", ["roles;drop", "Roles", "roles share_classes; drop table roles", "../x", "a-b", "roles'x"])
def test_refuses_odd_table_names_before_touching_anything(dbs, bad):
    src, demo = dbs
    r = run(src, demo, REFERENCE_TABLES=bad)
    assert r.returncode != 0 and "plain table name" in r.stderr
    assert demo_is_empty(demo)


@pytest.mark.parametrize("table", ["user_profiles", "share_subscriptions", "board_members", "audit_logs", "user_roles"])
def test_never_copies_tables_that_hold_personal_data_even_if_asked(dbs, table):
    src, demo = dbs
    r = run(src, demo, REFERENCE_TABLES=f"roles {table}")
    assert r.returncode != 0 and "never copied" in r.stderr
    assert demo_is_empty(demo)


def test_a_missing_reference_table_is_a_clear_refusal_and_writes_nothing(dbs):
    src, demo = dbs
    r = run(src, demo, REFERENCE_TABLES="roles no_such_table")
    assert r.returncode != 0 and "public.no_such_table does not exist" in r.stderr
    assert demo_is_empty(demo)


def test_extra_reference_tables_can_be_chosen_and_none_is_allowed(dbs):
    src, demo = dbs
    assert run(src, demo, REFERENCE_TABLES="roles email_templates").returncode == 0
    assert count(demo, "email_templates") == 1 and count(demo, "share_classes") == 0


def test_no_reference_rows_at_all(dbs):
    src, demo = dbs
    assert run(src, demo, REFERENCE_TABLES="").returncode == 0
    assert count(demo, "roles") == 0 and psql(demo, "select to_regclass('roles') is not null") == "t"


def test_schemas_can_be_left_out(dbs):
    src, demo = dbs
    assert run(src, demo, EXCLUDE_SCHEMAS="platform").returncode == 0
    assert psql(demo, "select to_regclass('platform.person') is null") == "t"


def test_missing_settings_and_unreachable_databases_are_clear(dbs):
    src, demo = dbs
    env = {k: v for k, v in os.environ.items() if k not in ("SOURCE_DATABASE_URL", "DEMO_DATABASE_URL")}
    assert "SOURCE_DATABASE_URL" in subprocess.run(["bash", str(SCRIPT)], env=env, capture_output=True, text=True).stderr
    r = run(src, "postgresql://nobody@127.0.0.1:1/none")
    assert r.returncode != 0 and "cannot connect to the demo database" in r.stderr


def test_summary_lists_small_source_tables_as_counts_only(dbs):
    src, demo = dbs
    r = run(src, demo)
    assert "candidates for REFERENCE_TABLES" in r.stdout and "email_templates" in r.stdout
    assert "real.person@company.test" not in r.stdout and "Real Person" not in r.stdout
