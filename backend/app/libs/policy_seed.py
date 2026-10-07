"""The seed data for policies, payment plans, reference lists and agreement texts, as typed Python.

This is the one place the default values live. It serves three purposes:
  * get_policy() and GET /api/policy fall back to it when the database (or its tables) cannot be read;
  * the migrations under backend/migrations/policy are RENDERED from it (python -m app.libs.policy_seed --write),
    and a test fails when a migration file no longer matches, so code and database cannot drift apart;
  * the values here are the values that were hard-wired in the code before policies became data, so seeding changes
    no behaviour. Where the code never had a value (for example the payment deadline, which a database default
    sets), the default is None and nothing is invented.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

PUBLIC, AUTHENTICATED, STAFF = "public", "authenticated", "staff"
AUDIENCES = (PUBLIC, AUTHENTICATED, STAFF)


@dataclass(frozen=True)
class PolicyDef:
    value: Any
    value_type: str  # string | integer | number | boolean | array | object
    audience: str
    description: str
    schema: dict | None = None
    nullable: bool = False

    def effective_schema(self) -> dict:
        """The JSON schema stored with the row: the explicit one, or one derived from value_type."""
        base = dict(self.schema) if self.schema else {"type": self.value_type}
        if self.nullable:
            t = base.get("type")
            base["type"] = (t if isinstance(t, list) else [t]) + ["null"] if t else ["null"]
        return base


def _d(value, vt, aud, desc, schema=None, nullable=None) -> PolicyDef:
    return PolicyDef(value, vt, aud, desc, schema, value is None if nullable is None else nullable)


_LICENCE_STATUS = (
    "Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence "
    "and does not currently carry on banking business."
)
_FOOTER = (
    "Citizen Digital Ltd. Citizen Bank is an applicant for a banking licence from the Central Bank of Lesotho "
    "and does not yet carry on banking business."
)
_POS_INT = {"type": "integer", "minimum": 1}
_DAYS_LIST = {"type": "array", "items": _POS_INT, "minItems": 1}

DEFAULTS: dict[str, PolicyDef] = {
    # ---- legal and brand (public)
    "legal.company_name": _d("Citizen Digital Ltd", "string", PUBLIC, "Registered company name.", {"type": "string", "minLength": 1}),
    "legal.registration_number": _d("99073", "string", PUBLIC, "Company registration number.", {"type": "string", "minLength": 1}),
    "legal.licence_status": _d(_LICENCE_STATUS, "string", PUBLIC,
                              "The sentence that states the licence position. Change it the day a licence is granted.",
                              {"type": "string", "minLength": 10}),
    "legal.footer": _d(_FOOTER, "string", PUBLIC, "Short licence-status line shown in the page footer.",
                       {"type": "string", "minLength": 10}),
    "legal.links": _d([{"label": "Privacy", "path": "/privacy-policy"}, {"label": "Terms", "path": "/terms-of-service"},
                       {"label": "Disclosures", "path": "/disclosures"}, {"label": "Contact", "path": "/contact"}],
                      "array", PUBLIC, "Footer links: label and site path.",
                      {"type": "array", "items": {"type": "object", "required": ["label", "path"],
                                                  "properties": {"label": {"type": "string", "minLength": 1},
                                                                 "path": {"type": "string", "pattern": "^/"}}}}),
    "brand.name": _d("Citizen Bank", "string", PUBLIC, "Brand name shown to people.", {"type": "string", "minLength": 1}),
    "brand.logo_url": _d("/brand/logo-sm.webp", "string", PUBLIC, "Small logo used in the Hub header.", {"type": "string", "minLength": 1}),
    # ---- careers (public, null until the owner confirms)
    "careers.apply_email": _d(None, "string", PUBLIC, "Where applications are sent. Null hides the apply line."),
    "careers.apply_instructions": _d(None, "string", PUBLIC, "How to apply (free text). Null hides the line."),
    # ---- contact (public, null until confirmed: the repositories contain conflicting details)
    "contact.email": _d(None, "string", PUBLIC, "General public contact email. Null hides the line."),
    "contact.phone": _d(None, "string", PUBLIC, "Public contact phone number. Null hides the line."),
    "contact.address": _d(None, "string", PUBLIC, "Public postal or street address. Null hides the line."),
    "contact.invest": _d(None, "string", PUBLIC, "Investor enquiries email. Null hides the line."),
    "contact.shares": _d(None, "string", PUBLIC, "Share subscription email. Null hides the line."),
    "contact.compliance": _d(None, "string", PUBLIC, "Compliance email. Null hides the line."),
    "contact.support_email": _d(None, "string", PUBLIC, "Support email shown on the website. Null hides the line."),
    "contact.privacy_email": _d(None, "string", PUBLIC, "Privacy enquiries email. Null hides the line."),
    "contact.legal_email": _d(None, "string", PUBLIC, "Legal notices email. Null hides the line."),
    "contact.security_email": _d(None, "string", PUBLIC, "Security disclosures email. Null hides the line."),
    "contact.media_email": _d(None, "string", PUBLIC, "Media enquiries email. Null hides the line."),
    "contact.media_phone": _d(None, "string", PUBLIC, "Media enquiries phone. Null hides the line."),
    "contact.support": _d(None, "string", PUBLIC, "Support email. Null hides the line."),
    # ---- application
    "app.base_currency": _d("LSL", "string", AUTHENTICATED, "Base currency of the bank (ISO 4217).", {"type": "string", "pattern": "^[A-Z]{3}$"}),
    "app.default_country": _d("Lesotho", "string", AUTHENTICATED, "Default country for forms.", {"type": "string", "minLength": 2}),
    "app.locale": _d("en-ZA", "string", AUTHENTICATED, "Locale for number and date formats.", {"type": "string", "pattern": "^[a-z]{2}(-[A-Z]{2})?$"}),
    # ---- payments
    "payments.deadline_days": _d(None, "integer", AUTHENTICATED,
                                 "Days an investor has to pay. Today a database default sets payment_deadline; null means 'not set by policy'.",
                                 {"type": "integer", "minimum": 1}),
    "payments.reminder_days": _d([7, 3, 1], "array", AUTHENTICATED, "Days before the payment deadline on which reminders go out.", _DAYS_LIST),
    "payments.first_reminder_hours": _d(24, "integer", AUTHENTICATED, "Hours after a subscription is created before the first reminder.", _POS_INT),
    # ---- invitations
    "invitations.expiry_days": _d({"board": 7, "investor": 30, "subscription": 30}, "object", STAFF,
                                  "Days an invitation stays valid, by kind.",
                                  {"type": "object", "required": ["board", "investor", "subscription"],
                                   "properties": {"board": _POS_INT, "investor": _POS_INT, "subscription": _POS_INT}}),
    "invitations.reminder_hours": _d(36, "integer", STAFF, "Hours before an unanswered invitation is reminded, and between reminders.", _POS_INT),
    # ---- compliance, board, auth, email
    "compliance.expiry_warning_days": _d([90, 60, 30, 7], "array", AUTHENTICATED, "Days before a board document expires on which warnings go out.", _DAYS_LIST),
    "board.term_years": _d({"min": 1, "max": 6, "default": 3}, "object", AUTHENTICATED, "Board member term length in years.",
                           {"type": "object", "required": ["min", "max", "default"],
                            "properties": {"min": _POS_INT, "max": _POS_INT, "default": _POS_INT}}),
    "auth.otp_minutes": _d(5, "integer", PUBLIC, "Minutes a one-time sign-in code stays valid.", _POS_INT),
    "auth.code_seconds": _d(90, "integer", PUBLIC, "Seconds a board portal access code stays valid.", _POS_INT),
    "email.max_retries": _d(3, "integer", STAFF, "Times a failed email is retried.", {"type": "integer", "minimum": 0}),
    "email.backoff_minutes": _d(5, "integer", STAFF, "Base retry delay in minutes; it doubles on each retry.", _POS_INT),
    # ---- KYC
    "kyc.phone_regex": _d(r"^\+?[0-9 ()-]{7,20}$", "string", AUTHENTICATED, "Pattern a phone number must match.", {"type": "string", "minLength": 1}),
    "kyc.required_fields": _d(["full_name", "phone", "date_of_birth", "street_address", "city", "country"], "array", AUTHENTICATED,
                              "Profile fields that must be filled before first use.",
                              {"type": "array", "items": {"type": "string", "minLength": 1}}),
    # ---- governance (no quorum is enforced today: null)
    "governance.majority_rule": _d("simple", "string", AUTHENTICATED, "How a vote passes. Today: more votes for than against.",
                                   {"type": "string", "enum": ["simple"]}),
    "governance.quorum_percent": _d(None, "number", AUTHENTICATED, "Share of members needed for a valid vote. Null: none enforced today.",
                                    {"type": "number", "minimum": 0, "maximum": 100}),
}


# ---------------------------------------------------------------------------------------------- payment plans

@dataclass(frozen=True)
class PlanDef:
    code: str
    label: str
    months: int
    audience: str = "all"  # all | investor | board
    display_order: int = 0
    active: bool = True


PLAN_AUDIENCES = ("all", "investor", "board")

DEFAULT_PLANS: tuple[PlanDef, ...] = (
    PlanDef("one-time", "Pay in full", 1, "all", 1),
    PlanDef("3-months", "3 monthly instalments", 3, "all", 2),
    PlanDef("6-months", "6 monthly instalments", 6, "all", 3),
    PlanDef("12-months", "12 monthly instalments", 12, "all", 4),
)


# ---------------------------------------------------------------------------------------------- reference lists

def _items(*pairs, **kw) -> list[dict]:
    return [{"code": c, "label": label, "meta": (kw.get("meta") or {}).get(c)} for c, label in pairs]


DEFAULT_LISTS: dict[str, list[dict]] = {
    "gender": _items(("male", "Male"), ("female", "Female"), ("other", "Other")),
    "investor_type": _items(("individual", "Individual"), ("institutional", "Institution"), ("accredited", "Accredited investor")),
    "account_type": _items(("personal", "Personal"), ("business", "Business")),
    "lead_status": _items(("new", "New"), ("contacted", "Contacted"), ("interested", "Interested"),
                          ("invited", "Invited"), ("converted", "Converted"), ("declined", "Declined")),
    "lead_source": _items(("website", "Website"), ("referral", "Referral"), ("event", "Event"),
                          ("social_media", "Social media"), ("direct", "Direct")),
    "meeting_type": _items(("regular", "Regular"), ("special", "Special"), ("emergency", "Emergency"),
                           ("agm", "Annual general meeting"), ("egm", "Extraordinary general meeting")),
    "member_status": _items(("active", "Active"), ("inactive", "Inactive"), ("resigned", "Resigned"), ("removed", "Removed")),
    "jurisdiction": _items(("global", "Global"), ("lesotho", "Lesotho"), ("south_africa", "South Africa"), ("botswana", "Botswana")),
    "crypto_asset": _items(("BTC", "Bitcoin"), ("ETH", "Ethereum"), ("USDT", "Tether (USDT)"), meta={
        "BTC": {"regex": r"^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$",
                "hint": "A Bitcoin address starts with bc1, 1 or 3"},
        "ETH": {"regex": r"^0x[0-9a-fA-F]{40}$", "hint": "An Ethereum address is 0x followed by 40 hex characters"},
        "USDT": {"regex": r"^(0x[0-9a-fA-F]{40}|T[1-9A-HJ-NP-Za-km-z]{33})$",
                 "hint": "A USDT address is 0x… (Ethereum network) or T… (Tron network)"},
    }),
    "certificate_signer_role": _items(("company_secretary", "Company secretary"), ("chairman", "Chairman"),
                                      ("director", "Director"), ("authorized_official", "Authorised official")),
    "document_type": _items(("minutes", "Minutes"), ("agenda", "Agenda"), ("resolution_attachment", "Resolution attachment"),
                            ("supporting_doc", "Supporting document"), ("presentation", "Presentation")),
}


# ---------------------------------------------------------------------------------------------- agreement texts

@dataclass(frozen=True)
class AgreementDef:
    agreement_type: str
    version: str
    title: str
    content: str
    required: bool = True
    display_order: int = 0


# The wording the Hub showed (AgreementsGate.tsx). The NCNDA text lives in ncnda_templates and is copied by the migration.
DEFAULT_AGREEMENTS: tuple[AgreementDef, ...] = (
    AgreementDef("terms", "1.0", "Data room terms and conditions",
                 "I accept the terms and conditions for using the data room: the documents are confidential, are for my own "
                 "evaluation of an investment, and every time I open one is recorded.", True, 2),
    AgreementDef("letter_of_intent", "1.0", "Letter of intent (LOI)",
                 "I confirm my intention to invest and give the details below so the office can review them.", True, 3),
)


# ---------------------------------------------------------------------------------------------- SQL rendering

def q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def jq(value: Any) -> str:
    return q(json.dumps(value, ensure_ascii=False, sort_keys=True)) + "::jsonb"


def render_policy_sql() -> str:
    rows = []
    for key, d in DEFAULTS.items():
        rows.append(f"  ({q(key)}, {jq(d.value)}, {q(d.value_type)}, {q(d.description)}, {q(d.audience)}, {jq(d.effective_schema())}, 'seed')")
    return POLICY_SQL_HEAD + ",\n".join(rows) + POLICY_SQL_TAIL


def render_plans_sql() -> str:
    rows = [f"  ({q(p.code)}, {q(p.label)}, {p.months}, {str(p.active).lower()}, {q(p.audience)}, {p.display_order})" for p in DEFAULT_PLANS]
    return PLANS_SQL_HEAD + ",\n".join(rows) + PLANS_SQL_TAIL


def render_lists_sql() -> str:
    rows = []
    for list_key, items in DEFAULT_LISTS.items():
        for i, it in enumerate(items, 1):
            meta = jq(it["meta"]) if it["meta"] else "'{}'::jsonb"
            rows.append(f"  ({q(list_key)}, {q(it['code'])}, {q(it['label'])}, {i}, true, {meta})")
    return LISTS_SQL_HEAD + ",\n".join(rows) + LISTS_SQL_TAIL


def render_agreements_sql() -> str:
    rows = [f"  ({q(a.agreement_type)}, {q(a.version)}, CURRENT_DATE, {q(a.title)}, {q(a.content)}, {str(a.required).lower()}, {a.display_order}, true)"
            for a in DEFAULT_AGREEMENTS]
    return AGREEMENTS_SQL_HEAD + ",\n".join(rows) + AGREEMENTS_SQL_TAIL


POLICY_SQL_HEAD = """-- Policies as data: one row per setting, with who may read it, an optional JSON schema, and a history of changes.
-- RENDERED from backend/app/libs/policy_seed.py (python -m app.libs.policy_seed --write). Safe to run more than once:
-- existing rows (and any value an administrator has changed) are never overwritten.
CREATE TABLE IF NOT EXISTS app_policy (
    key         text PRIMARY KEY,
    value       jsonb       NOT NULL,
    value_type  text        NOT NULL DEFAULT 'string',
    description text,
    audience    text        NOT NULL DEFAULT 'authenticated' CHECK (audience IN ('public', 'authenticated', 'staff')),
    schema      jsonb,
    version     integer     NOT NULL DEFAULT 1,
    updated_by  text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_policy_history (
    id         bigserial PRIMARY KEY,
    key        text        NOT NULL,
    value      jsonb       NOT NULL,
    version    integer     NOT NULL,
    changed_by text,
    changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_policy_history_key_idx ON app_policy_history (key, changed_at DESC);

INSERT INTO app_policy (key, value, value_type, description, audience, schema, updated_by) VALUES
"""
POLICY_SQL_TAIL = """
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_policy_history (key, value, version, changed_by)
SELECT p.key, p.value, p.version, 'seed' FROM app_policy p
WHERE NOT EXISTS (SELECT 1 FROM app_policy_history h WHERE h.key = p.key);
"""

PLANS_SQL_HEAD = """-- Payment plans offered to investors and board members. Safe to run more than once.
-- RENDERED from backend/app/libs/policy_seed.py. The codes are the values already stored in
-- share_subscriptions.installment_plan, so existing rows keep meaning what they meant.
CREATE TABLE IF NOT EXISTS payment_plans (
    code          text PRIMARY KEY,
    label         text    NOT NULL,
    months        integer NOT NULL CHECK (months >= 1),
    active        boolean NOT NULL DEFAULT true,
    audience      text    NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'investor', 'board')),
    display_order integer NOT NULL DEFAULT 0
);

INSERT INTO payment_plans (code, label, months, active, audience, display_order) VALUES
"""
PLANS_SQL_TAIL = "\nON CONFLICT (code) DO NOTHING;\n"

LISTS_SQL_HEAD = """-- Reference lists (option lists for forms): one row per option. Safe to run more than once.
-- RENDERED from backend/app/libs/policy_seed.py. Rows an administrator has changed are never overwritten.
CREATE TABLE IF NOT EXISTS reference_list_items (
    list_key      text    NOT NULL,
    code          text    NOT NULL,
    label         text    NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    active        boolean NOT NULL DEFAULT true,
    meta          jsonb   NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (list_key, code)
);

INSERT INTO reference_list_items (list_key, code, label, display_order, active, meta) VALUES
"""
LISTS_SQL_TAIL = "\nON CONFLICT (list_key, code) DO NOTHING;\n"

AGREEMENTS_SQL_HEAD = """-- Agreement texts with versions: generalises ncnda_templates. Safe to run more than once.
-- RENDERED from backend/app/libs/policy_seed.py (terms and letter of intent); the NCNDA rows are copied from ncnda_templates.
-- ncnda_templates is left untouched and keeps working.
CREATE TABLE IF NOT EXISTS agreement_texts (
    agreement_type text    NOT NULL,
    version        text    NOT NULL,
    effective_date date    NOT NULL DEFAULT CURRENT_DATE,
    title          text    NOT NULL,
    content        text    NOT NULL,
    required       boolean NOT NULL DEFAULT true,
    display_order  integer NOT NULL DEFAULT 0,
    active         boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (agreement_type, version)
);

INSERT INTO agreement_texts (agreement_type, version, effective_date, title, content, required, display_order, active) VALUES
"""
AGREEMENTS_SQL_TAIL = """
ON CONFLICT (agreement_type, version) DO NOTHING;

-- NCNDA: copy every template version that exists today, if the table is there.
DO $$
BEGIN
    IF to_regclass('public.ncnda_templates') IS NOT NULL THEN
        INSERT INTO agreement_texts (agreement_type, version, effective_date, title, content, required, display_order, active)
        SELECT 'ncnda', t.version::text, t.effective_date::date,
               'Non-circumvention and non-disclosure agreement (NCNDA)', t.content, true, 1, COALESCE(t.is_active, true)
        FROM ncnda_templates t
        ON CONFLICT (agreement_type, version) DO NOTHING;
    END IF;
END $$;

-- Each signature records which text version was read.
ALTER TABLE IF EXISTS investor_agreements ADD COLUMN IF NOT EXISTS text_version text;
"""

MIGRATIONS = {
    "005_app_policy.sql": render_policy_sql,
    "006_payment_plans.sql": render_plans_sql,
    "007_reference_lists.sql": render_lists_sql,
    "009_agreement_texts.sql": render_agreements_sql,
}
MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations" / "policy"

if __name__ == "__main__":  # pragma: no cover
    import sys

    if "--write" in sys.argv:
        MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
        for name, render in MIGRATIONS.items():
            (MIGRATIONS_DIR / name).write_text(render())
            print("wrote", MIGRATIONS_DIR / name)
