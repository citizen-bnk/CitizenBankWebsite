# Investor inventory reconciliation — 22 November 2026

Source: [Citizen Digital inventory dated 17 November](https://docs.google.com/spreadsheets/d/1jVPAfr3wLhDFRuwUz7qd4orFjgEludO3ad0JWYpa74I/edit).

The production import retains 66 source contact rows. Fifty-three rows map to existing people (including confirmed aliases), six create named prospect profiles, and seven remain unlinked for identity review. New prospect profiles do not grant sign-in credentials, roles or board appointments. Invitations remain an explicit administrator action.

The six new prospects are Dr Koena Motloi, Erick Dube, Isaac Galeboe Menyatso, Mthiyane Mokenela, Retselisitsoe Nko and Sampi Motshabi. Existing investor contacts were filled only where absent: 12 email addresses and 11 phone numbers. Existing populated contact details and provider identities were preserved.

Administrator-confirmed canonical names are Andre van Straten and Matumahole Clementina Phafane. The Tumi aliases and the Andre/Andries spelling variations link to the existing people; source spellings remain visible as history. Historical signed files are not renamed or overwritten.

The import stores 177 source rows: contacts, working holdings, document inventory, bank allocations, bank credits and bank-reconciliation summaries. It links 24 additional source document references, resulting in 46 investor-document links. File presence does not certify signing, allotment or conversion.

Financial invariants were checked transactionally: the existing subscription, certificate count, 80 working holding rows, total working units and authorized share allocation were preserved. Workbook bank allocations are reconciliation evidence rather than new ledger credits. SAFEs remain separate until conversion evidence is confirmed; CB36-01 remains pending. Bongiwe's working register remains at 500 shares while further entitlement is reviewed. Class A/B/C setup and the live Class B offer are unchanged.

## Administrator entry points

- `/admin-users`: row actions for role management (Super Admin), full profile, investor activity, board activity and invitations. Related activity counts appear in the user table. Full profiles use a field allowlist and never return authentication secrets.
- `/back-office-investor-invitations`: independent invitation list with acceptance status, email-service status, sent/expiry dates, resend/account-setup actions and email-history links. Older `#invitations` links redirect here.
- `/back-office-investor-reconciliation`: searchable source inventory, unresolved identity filter, source evidence popup and linked portfolios.
- `/back-office-investors`: investor profiles and certificate/document portfolios.

The source snapshot is not a second live cap table. Correct identity/contact details through the existing administrator controls; resolve financial discrepancies against the underlying contracts, bank evidence and corporate approvals before changing live holdings.
