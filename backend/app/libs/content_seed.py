"""Seed content for the public site: newsletters (metadata only), job adverts (drafts) and the timeline and
achievements. This module is the single source; scripts/generate_content_seed_sql.py turns it into the SQL
migrations in migrations/content/, and tests check the SQL has not drifted from it.

Rules applied (contracts.md sections 2-4, audit-content.md section 5):
  * Citizen Digital Ltd (Reg. 99073) is the APPLICANT for a Central Bank of Lesotho banking licence and does not
    carry on banking business. Nothing here says or implies a licensed or operating bank.
  * Nothing is public: newsletters are internal/members drafts, job adverts are drafts, unconfirmed timeline
    items are unpublished. Only evidenced, plainly worded timeline and achievement items are published.
  * No salaries, investor names or amounts, register data, partner names or prices.
"""
from __future__ import annotations

SEED_ACTOR = "seed:content-2026-10"

LICENCE_NOTE = (
    "Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence "
    "and does not currently carry on banking business."
)

# ---------------------------------------------------------------------------------------------- newsletters
# visibility/status are decided here, not taken from the source: nothing is seeded as public.
NEWSLETTERS: list[dict] = [
    {
        "slug": "citizen-digital-newsletter-issue-1", "issue_no": 1, "series": "Citizen Digital Newsletter",
        "title": "Citizen Digital Newsletter - Issue 1", "published_on": "2026-02-10", "period_label": "February 2026",
        "summary": (
            "Letter from the Office of the CEO to Board Members and Shareholders on investor engagement, strategy, "
            "capital formation and board contributions. Addressed to insiders. Held back as internal: it presents "
            "the company as an existing bank and contains investor details."
        ),
        "sections": [], "visibility": "internal", "status": "draft", "sort_order": 10,
    },
    {
        "slug": "citizen-digital-newsletter-issue-2", "issue_no": 2, "series": "Citizen Digital Newsletter",
        "title": "Citizen Digital Newsletter - Issue 2", "published_on": "2026-02-27", "period_label": "February 2026",
        "summary": (
            "Update to Board Members and Shareholders on draft investor terms, regulatory contact in South Africa, "
            "a collaboration under discussion and a planned platform. Mostly forward-looking. Held back as "
            "internal: it presents the company as an existing bank and contains claims later withdrawn."
        ),
        "sections": [], "visibility": "internal", "status": "draft", "sort_order": 20,
    },
    {
        "slug": "citizen-digital-newsletter-issue-3", "issue_no": 3, "series": "Citizen Digital Newsletter",
        "title": "Citizen Digital Newsletter - Issue 3", "published_on": "2026-03-22", "period_label": "March 2026",
        "summary": (
            "Update acknowledging delays across several engagements and setting out expected April meetings. "
            "Held back as internal: it presents the company as an existing bank and contains claims later withdrawn."
        ),
        "sections": [], "visibility": "internal", "status": "draft", "sort_order": 30,
    },
    {
        "slug": "citizen-digital-quarterly-review-v1-i1", "issue_no": 4, "series": "Quarterly Review",
        "title": "Citizen Digital Quarterly Review, Volume 1 Issue 1", "published_on": None,
        "period_label": "August 2026",
        "summary": (
            "The first Quarterly Review, succeeding the newsletter series. Covers governance preparation, "
            "licence-application readiness, investment and the organisation. States that Citizen Digital Ltd is "
            "not a licensed bank and that no licence has been granted. Filed as Newsletter Issue 4."
        ),
        "sections": [
            {"heading": "Editorial / Chairman / CEO", "points": []},
            {"heading": "Governance and Regulatory Affairs", "points": []},
            {"heading": "Investment Update", "points": []},
            {"heading": "Compliance Statement", "points": []},
        ],
        "visibility": "internal", "status": "draft", "sort_order": 40,
    },
    {
        "slug": "citizen-digital-monthly-v1-i5", "issue_no": 5, "series": "Citizen Digital Monthly",
        "title": "Citizen Digital Monthly, Volume 1 Issue 5", "published_on": None,
        "period_label": "October 2026 (11 August to 30 September 2026)",
        "summary": (
            "First monthly edition, marked For Board and investors. Covers governance, strategy and technology and "
            "licence-application readiness. States that Citizen Digital Ltd is an applicant, holds no licence and "
            "takes no deposits, and that nothing in it is an offer of shares."
        ),
        "sections": [
            {"heading": "Letter from the CEO", "points": []},
            {"heading": "Period at a glance", "points": []},
            {"heading": "Governance", "points": []},
            {"heading": "Strategy and technology", "points": []},
            {"heading": "Investment pipeline", "points": []},
            {"heading": "Follow-ups", "points": []},
        ],
        "visibility": "members", "status": "draft", "sort_order": 50,
    },
]

# ---------------------------------------------------------------------------------------------- job adverts
_APPLICANT = "the proposed Citizen Bank (licence application in progress)"

JOB_ADVERTS: list[dict] = [
    {
        "slug": "chief-executive-officer", "title": "Chief Executive Officer (CEO)",
        "department": "Executive management", "employment_type": "Full-time", "location": "Maseru, Lesotho",
        "summary": (
            f"Lead the strategy, operations and regulatory readiness of {_APPLICANT}. Full-time, permanent, "
            "based in Maseru. Appointment is subject to Central Bank of Lesotho fit-and-proper approval."
        ),
        "responsibilities": [
            "Develop and implement the strategy, business plan and financial targets",
            "Support the licence application and compliance with Central Bank of Lesotho requirements",
            "Establish operational systems, technology infrastructure and staffing",
            "Lead board relationships and stakeholder management",
            "Oversee risk management, AML/CFT compliance and customer experience",
            "Guide readiness for the licence application and, if a licence is granted, for launch",
        ],
        "requirements": [
            "Minimum 15 years of banking or financial services experience",
            "Proven CEO or COO experience at a comparable-sized institution",
            "Understanding of Central Bank of Lesotho regulations and banking licensing requirements",
            "MBA preferred; banking certifications essential",
            "Clean background check with no criminal or regulatory history",
            "Lesotho residency",
        ],
        "source_note": (
            "Source: Drive recruitment plan, CEO advert. Wording changed: source called the company 'a new "
            "commercial bank' and the proposed bank 'launching'; now 'the proposed Citizen Bank (licence application "
            "in progress)'; 'Guide launch and operational readiness for banking licence' reworded. Salary omitted "
            "(sources conflict: M400-600k vs LSL 800k-1.2m). Source closing date 2026-10-15 not applied. Reporting "
            "line conflicts (Board vs Remuneration Committee), so omitted. Needs CBL approval before taking office."
        ),
    },
    {
        "slug": "chief-financial-officer", "title": "Chief Financial Officer (CFO)",
        "department": "Finance", "employment_type": "Full-time", "location": "Maseru, Lesotho",
        "summary": (
            f"Lead financial operations, regulatory reporting, capital management and treasury for {_APPLICANT}. "
            "Appointment is subject to Central Bank of Lesotho fit-and-proper approval."
        ),
        "responsibilities": [
            "Design and implement financial management systems and controls",
            "Prepare regulatory financial reports (IFRS and Central Bank of Lesotho returns)",
            "Manage capital adequacy, liquidity and funding strategies",
            "Oversee accounting, audit relationships and financial compliance",
            "Guide treasury and investment management",
            "Develop financial projections and budgets",
            "Ensure compliance with Central Bank of Lesotho prudential regulations",
        ],
        "requirements": [
            "CA(SA), ACCA or equivalent",
            "Minimum 10 years of banking or financial services finance experience",
            "Capital management and regulatory reporting experience",
            "Knowledge of IFRS and Central Bank of Lesotho prudential requirements",
            "Fit-and-proper vetting compliance",
        ],
        "source_note": (
            "Source: recruitment plan, CFO advert. Wording changed: source said 'a new commercial bank' and the "
            "LinkedIn version 'a newly licensed commercial bank' (wrong: no licence is held); replaced by the "
            "proposed Citizen Bank (licence application in progress). Salary omitted (sources conflict). Source "
            "closing date 2026-10-20 not applied; the plan scheduled publication for 3 Oct 2026. Experience "
            "conflict: 10 years (plan) vs 12+ (Quick Apply ad); 10 used."
        ),
    },
    {
        "slug": "chief-risk-officer", "title": "Chief Risk Officer (CRO)",
        "department": "Risk", "employment_type": "Full-time", "location": "Maseru, Lesotho",
        "summary": (
            f"Establish and lead the credit, market and operational risk and AML/CFT compliance functions for "
            f"{_APPLICANT}. Appointment is subject to Central Bank of Lesotho fit-and-proper approval."
        ),
        "responsibilities": [
            "Develop a risk management framework aligned with Central Bank of Lesotho requirements",
            "Establish credit risk assessment, lending policies and exposure limits",
            "Implement the AML/CFT compliance programme and controls",
            "Manage market, liquidity and operational risk",
            "Conduct stress testing and risk reporting",
            "Lead the compliance team and regulatory submissions",
        ],
        "requirements": [
            "FRM or PRM credential",
            "Minimum 8 to 10 years of credit or risk management experience in banking",
            "Knowledge of the Central Bank of Lesotho Asset Classification and Lending Limits Regulations",
            "AML/CFT expertise (FATF standards)",
            "Fit-and-proper vetting compliance",
        ],
        "source_note": (
            "Source: recruitment plan, CRO advert. Wording changed: 'for a new commercial bank' replaced by the "
            "proposed Citizen Bank (licence application in progress). Salary omitted (sources conflict). Source "
            "closing date 2026-10-20 not applied. Experience conflict: 8-10 years (plan) vs 12+ (Quick Apply ad)."
        ),
    },
    {
        "slug": "chief-operating-officer", "title": "Chief Operating Officer (COO)",
        "department": "Operations and technology", "employment_type": "Full-time", "location": "Maseru, Lesotho",
        "summary": (
            f"Lead operations, technology infrastructure, IT systems, HR and vendor relationships for {_APPLICANT}. "
            "Appointment is subject to Central Bank of Lesotho fit-and-proper approval."
        ),
        "responsibilities": [
            "Plan service delivery and customer operations for the proposed bank",
            "Design and implement core banking technology and systems",
            "Build HR systems, recruitment, training and organisational development",
            "Manage facilities, IT infrastructure and vendor relationships",
            "Ensure operational efficiency and business continuity",
            "Oversee regulatory compliance in operations",
        ],
        "requirements": [
            "Minimum 10 years of operations or IT management in banking",
            "Core banking systems experience",
            "Change management and process improvement skills",
            "Knowledge of banking operations and service delivery",
            "Fit-and-proper compliance",
        ],
        "source_note": (
            "Source: recruitment plan, COO advert. Wording changed: 'for a new bank' replaced by the proposed Citizen "
            "Bank (licence application in progress); 'Establish branch operations' reworded because no branch "
            "exists. Salary omitted (three conflicting sets). Source closing date 2026-10-22 not applied."
        ),
    },
    {
        "slug": "chief-internal-auditor", "title": "Chief Internal Auditor",
        "department": "Internal audit", "employment_type": "Full-time", "location": "Maseru, Lesotho",
        "summary": (
            f"Establish an independent audit function for {_APPLICANT}, covering operational, financial and "
            "compliance audits and system effectiveness reviews."
        ),
        "responsibilities": [],
        "requirements": [
            "CIA credential or equivalent",
            "CA(SA) or ACCA plus advanced audit experience",
            "8 or more years of banking audit or compliance experience",
            "Knowledge of the three-lines-of-defence model",
            "Understanding of Central Bank of Lesotho prudential audit requirements",
        ],
        "source_note": (
            "Source: recruitment plan, advertisements 5 and 6 (newspaper text only). Responsibilities not listed in "
            "the source, so none added. Wording changed: bank-implying phrases replaced by the proposed Citizen Bank "
            "(licence application in progress). Salary omitted (sources conflict). Source closing date 2026-10-25 "
            "not applied. Experience conflict: 8+ (plan) vs 10+ (Quick Apply ad)."
        ),
    },
    {
        "slug": "compliance-officer-mlro", "title": "Compliance Officer / Money Laundering Reporting Officer (MLRO)",
        "department": "Compliance", "employment_type": "Full-time", "location": "Maseru, Lesotho",
        "summary": (
            f"Lead regulatory compliance, AML/CFT enforcement, policy implementation and staff training for "
            f"{_APPLICANT}. Appointments are subject to background, reference and regulatory fit-and-proper checks."
        ),
        "responsibilities": [
            "Design and run the compliance and AML/CFT programme",
            "Own the customer due diligence, enhanced due diligence and PEP frameworks",
            "Oversee sanctions screening and transaction monitoring",
            "Act as MLRO, filing suspicious transaction reports with the Financial Intelligence Unit",
            "Monitor regulatory change",
            "Train staff and the Board on compliance and AML/CFT",
        ],
        "requirements": [
            "10 or more years of compliance and AML/CFT experience in a regulated financial institution",
            "Experience as, or deputy to, an MLRO",
            "Suspicious transaction report filing experience",
            "KYC/CDD/EDD, sanctions and PEP screening, and transaction monitoring",
            "FATF-aligned programme design",
            "CAMS or ICA Diploma preferred",
        ],
        "source_note": (
            "Source: Position Detail Sheet (the cleaner wording) and recruitment plan. Wording changed: the plan "
            "advert's bank-style wording replaced by the proposed Citizen Bank (licence application in progress). "
            "Salary omitted (sources conflict). Closing date: plan says 2026-10-25, Detail Sheet has an unfilled "
            "placeholder; not applied. Reporting line conflicts (Audit Committee vs CEO), so omitted. The Detail "
            "Sheet letterhead contact (info@citizenhub.co.za, +27 numbers) differs from the recruitment contacts "
            "and was not used."
        ),
    },
    {
        "slug": "board-chair-non-executive", "title": "Board Chair (Non-Executive, Independent)",
        "department": "Board of Directors", "employment_type": "Board appointment (non-executive)",
        "location": "Maseru, Lesotho",
        "summary": (
            f"Independent oversight of management, board leadership and regulatory compliance for {_APPLICANT}. "
            "Chairs the Governance and Remuneration committees. Appointment needs shareholder approval and Central "
            "Bank of Lesotho fit-and-proper approval before taking office."
        ),
        "responsibilities": [],
        "requirements": [
            "Regional banking or finance leader with 20 or more years of experience",
            "Prior board chair or senior independent director experience",
            "Knowledge of Central Bank of Lesotho regulations",
            "Integrity, independence and sound judgment",
            "Available for quarterly meetings plus special sessions",
            "Willing to undergo Central Bank of Lesotho fit-and-proper vetting",
        ],
        "source_note": (
            "Source: recruitment plan, Board Chair brief. The plan describes direct outreach, not an open advert, "
            "so this should normally stay a draft. Remuneration omitted (sources conflict: honorarium M20-40k vs "
            "M350-500k). Source deadline conflict: 2026-10-15 (plan) vs 2026-11-05 (guide); not applied. "
            "'Represents the bank to CBL' reworded. Directors need shareholder and CBL approval before taking office."
        ),
    },
    {
        "slug": "independent-non-executive-directors", "title": "Independent Non-Executive Directors (4 to 5 positions)",
        "department": "Board of Directors", "employment_type": "Board appointment (non-executive)",
        "location": "Maseru, Lesotho",
        "summary": (
            f"Independent governance oversight, strategic guidance and risk monitoring for {_APPLICANT}, with seats "
            "on the Audit, Risk, Credit and Governance and Remuneration committees. Appointments need shareholder "
            "approval and Central Bank of Lesotho fit-and-proper approval before taking office."
        ),
        "responsibilities": [],
        "requirements": [
            "15 or more years of professional experience (finance, banking, law, accounting or technology)",
            "Prior board or senior management experience",
            "Knowledge of banking regulation and governance",
            "Integrity and sound judgment",
            "Available for at least four quarterly meetings a year",
            "Willing to undergo Central Bank of Lesotho fit-and-proper vetting",
        ],
        "source_note": (
            "Source: recruitment plan, Board Members brief. Board appointments are CBL-mandated vetting items "
            "(Schedule 3, shareholder vote, board resolution) before taking office; keep as a draft unless the "
            "company decides to advertise. Remuneration omitted (sources conflict). Source closing date "
            "2026-11-05 not applied."
        ),
    },
]

# ---------------------------------------------------------------------------------------------- timeline
# date, title, story, status, published. Evidence for each is in audit-content.md section 2.1 and the
# newsletter events marked public_ok in drive-newsletters.json. Items whose date or substance still needs the
# owner's confirmation are seeded UNPUBLISHED so one click publishes them.
TIMELINE: list[dict] = [
    {"date": "2026-08-01", "published": False, "status": "completed",
     "title": "Central Bank of Lesotho notified of the licence application lead",
     "story": "The Central Bank of Lesotho was notified that Citizen Digital has been appointed to lead the licence "
              "application. This is a notification, not an approval: no licence has been granted."},
    {"date": "2026-08-01", "published": False, "status": "completed",
     "title": "First Quarterly Review published",
     "story": "Citizen Digital published its first Quarterly Review, which replaces the newsletter series."},
    {"date": "2026-08-16", "published": True, "status": "completed",
     "title": "Member verification and RSVP system built",
     "story": "A system to verify members and record RSVPs for general meetings was built."},
    {"date": "2026-08-17", "published": True, "status": "completed",
     "title": "Board and Shareholders Meeting held",
     "story": "A combined Board and Shareholders Meeting was held on 17 August 2026."},
    {"date": "2026-08-30", "published": True, "status": "completed",
     "title": "Company records moved into a structured library",
     "story": "The company's records were moved into a structured records library."},
    {"date": "2026-09-01", "published": False, "status": "in_progress",
     "title": "Licence application not yet lodged",
     "story": "The target of 1 September 2026 for lodging the licence application with the Central Bank of Lesotho "
              "was not met. The application has not yet been lodged."},
    {"date": "2026-09-25", "published": True, "status": "completed",
     "title": "Banking platform build begins",
     "story": "Work starts on the technology behind Citizen Bank: a core ledger, internet banking for the web and a "
              "mobile banking app. A working prototype was built using demonstration data only."},
    {"date": "2026-09-25", "published": True, "status": "completed",
     "title": "Citizen AI assistant added",
     "story": "Our AI assistant can answer questions about a customer's own accounts and prepare payments for the "
              "customer to confirm. It cannot move money by itself."},
    {"date": "2026-09-27", "published": True, "status": "completed",
     "title": "Investor and board platform prepared for launch",
     "story": "The investor, share subscription and board tools are consolidated into one codebase with production "
              "launch settings."},
    {"date": "2026-09-27", "published": True, "status": "completed",
     "title": "Licence submission pack prepared",
     "story": "A 44-document submission pack for the Central Bank of Lesotho licence application was prepared. It has "
              "not been lodged and is not an approval."},
    {"date": "2026-09-28", "published": True, "status": "completed",
     "title": "Business plan revised",
     "story": "Version 1.1 of the business plan was issued as part of the licence submission pack."},
    {"date": "2026-10-05", "published": True, "status": "completed",
     "title": "Passkey sign-in and step-by-step identity checks",
     "story": "Customers can sign in with a passkey, and identity checks are requested only when a product needs "
              "them. This is a demonstration policy; no external verification providers are connected yet."},
    {"date": "2026-10-05", "published": True, "status": "completed",
     "title": "Spoken AI replies, clearly labelled as AI",
     "story": "Citizen AI can speak its replies in the web and mobile apps, and tells the customer that the voice "
              "is AI-generated."},
    {"date": "2026-10-05", "published": True, "status": "completed",
     "title": "Backup AI provider for reliability",
     "story": "If the main AI service is unavailable, a second provider takes over so the assistant keeps working."},
    {"date": "2026-10-06", "published": True, "status": "completed",
     "title": "One Citizen sign-in across website, Hub and banking",
     "story": "A person signs in once on the website and is passed securely to internet banking or the mobile app "
              "without a second login."},
    {"date": "2026-10-06", "published": True, "status": "completed",
     "title": "Shared identity design for the whole platform",
     "story": "One person record and one set of roles now sit behind the website, Hub and banking."},
    {"date": "2026-10-06", "published": True, "status": "completed",
     "title": "Website rebuilt to run on a modern hosting stack",
     "story": "The website and its API no longer depend on the original site-builder platform. The live site itself "
              "is still being moved."},
    {"date": "2026-10-06", "published": True, "status": "completed",
     "title": "Demonstration environment opened",
     "story": "A separate demonstration of the platform with seven role accounts, with automated checks of what each "
              "role can reach. All banking in it is simulated."},
    {"date": "2026-10-06", "published": True, "status": "completed",
     "title": "Automated testing on every repository",
     "story": "Every code repository now runs its tests, type checks and build on each change."},
    {"date": "2026-10-06", "published": True, "status": "completed",
     "title": "Citizen Hub becomes its own site",
     "story": "The tools for investors, shareholders, board members and staff get their own home, with role-based "
              "access."},
    {"date": "2026-10-07", "published": True, "status": "in_progress",
     "title": "Citizen Hub rebuilt around 14 features",
     "story": "The Hub is being rebuilt from about 50 screens to 14 focused features, with shared error handling "
              "and screen-by-screen tests."},
    {"date": "2026-10-07", "published": True, "status": "in_progress",
     "title": "One notification system for investors and board",
     "story": "Subscription, payment, certificate and invitation messages are moving to one notification pipeline."},
]

# ---------------------------------------------------------------------------------------------- achievements
ACHIEVEMENTS: list[dict] = [
    {"date": "2026-09-01", "published": False, "category": "milestone",
     "title": "Governance documentation drafted",
     "description": "In September 2026, draft charters for the Audit, Risk Management, Credit, and Governance and "
                    "Nominations committees were prepared, with a draft shareholders' agreement and core policies."},
    {"date": "2026-09-25", "published": True, "category": "milestone", "title": "Core ledger built",
     "description": "A double-entry ledger records every transaction as balanced entries and makes payment retries "
                    "safe. It runs as a simulated ledger for demonstration."},
    {"date": "2026-09-25", "published": True, "category": "milestone",
     "title": "Internet banking and mobile app built",
     "description": "A web banking experience and an installable mobile app, both connected to the core ledger and "
                    "shown as a pre-licensing demonstration."},
    {"date": "2026-09-27", "published": True, "category": "milestone", "title": "Investor and board platform",
     "description": "Tools for share subscriptions, payment proof, share certificates, a data room, board meetings, "
                    "votes and board document compliance."},
    {"date": "2026-09-27", "published": True, "category": "milestone", "title": "Licence submission pack prepared",
     "description": "A 44-document pack for the Central Bank of Lesotho licence application was prepared. It has not "
                    "been lodged and is not an approval."},
    {"date": "2026-10-05", "published": True, "category": "milestone", "title": "Citizen AI with spoken replies",
     "description": "An AI assistant that answers account questions in text or voice, says that spoken replies are "
                    "AI-generated, and falls back to a second provider if needed."},
    {"date": "2026-10-05", "published": True, "category": "milestone",
     "title": "Passkey sign-in and progressive identity checks",
     "description": "Passwordless sign-in and identity checks that only appear when needed, with an audit trail and "
                    "manual review. A demonstration policy with no external providers."},
    {"date": "2026-10-06", "published": True, "category": "milestone",
     "title": "Single sign-on across website, Hub and banking",
     "description": "One identity and one login across the public site, the investor and board Hub, and both "
                    "banking apps."},
    {"date": "2026-10-06", "published": True, "category": "milestone",
     "title": "Demonstration environment verified across all roles",
     "description": "A full demonstration with seven role accounts, checked automatically against the deployed "
                    "demonstration."},
]


def ordered(items: list[dict]) -> list[tuple[int, dict]]:
    """Items sorted by date (stable within a date), with display_order 10, 20, 30 ..."""
    ranked = sorted(enumerate(items), key=lambda p: (p[1]["date"], p[0]))
    return [((i + 1) * 10, item) for i, (_, item) in enumerate(ranked)]
