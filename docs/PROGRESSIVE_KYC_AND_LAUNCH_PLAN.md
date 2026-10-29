# Progressive profile and access gates (working plan)

This is a product control plan, not a statement of statutory thresholds. Citizen Bank is pre-licensing. Banking transactions and balances must remain fictional until licensing, compliance approval and payment controls are complete. The internal KYC policy dated 25 September 2026 calls for identity and address verification and officer review before account activation: https://drive.google.com/file/d/1Nqqxjt6txcSl7DlxLJpbxvybQ7uQabwc/view.

| Trigger | Prompt only for | Access after response |
| --- | --- | --- |
| Explore website, careers, investment information | No full profile | Public information; application or investment intent can be started |
| Save an investment intent / view own portfolio | Basic: name, contact, date of birth, address, occupation, ID type and number | Draft/subscription record; no banking spend or confirmed holding solely from self declaration |
| Activate a dormant cheque/savings account, use cards, transfer, withdraw or receive spendable funds | Standard: verified ID and address evidence, source of funds and KYC officer decision | Account activation only after approval; no real banking during pre-licensing |
| High-value, unusual or cross-border activity; business/representative account; dividend disbursement | Enhanced: source of wealth/funds, PEP screening, beneficial owner, tax residence, manual risk decision | Approved transaction-specific capability, subject to configurable limits set by compliance |
| Board nomination and fit-and-proper process | Basic identity, then enhanced declarations, conflicts, qualifications, references and evidence as the nomination advances | Draft nomination first; appointment only after governance and regulatory checks |
| Job application | Contact, CV, position questions; identity and fit-and-proper evidence only for shortlisted control roles | Application can be submitted without a banking profile |

RICA refers to South African SIM registration; banking customer identification here should be labelled KYC/CDD. Do not hardcode a transaction limit as a legal threshold. Compliance must approve thresholds, sanctions/PEP handling, record retention and reviewer roles before a market release.

The website owns public licensing progress, careers and recruitment publication. Hub owns private investor/board records; Core owns banking KYC and account state. A single platform person ID should link these without copying sensitive evidence into public pages. Website progress drafts in `backend/scripts/seed_licensing_progress_drafts.sql` are intentionally unpublished because September plans and deadlines do not prove current completion. An administrator should verify each item, attach current evidence and publish only confirmed facts.

Remaining integration work: (1) send an idempotent, signed investor-created event from website/Hub to Core so dormant accounts appear before the first banking sign-in; (2) provide a secure evidence upload with actual storage references rather than user-entered links; (3) enforce KYC gates at every Core debit/card/transfer endpoint and in Hub investment/board mutations, not only at account activation; (4) show the same activation wizard in the mobile app; (5) route actual dividends only after licensing and payment reconciliation. No production rollout should claim these controls are complete before end-to-end tests.

## Optional daily profile questions

After sign-in, Core may offer one missing profile field at a time, with a maximum of two answered prompts per Maseru calendar day. General prompts start with a missing mobile number and employment status. Employer/business and income questions appear in a loan context; dependants in insurance; experience and risk preference in investment/trading contexts. A user may skip a prompt for the day or suppress that specific question. Product-specific verification may still be necessary even when a general reminder is suppressed. Citizen AI may propose saving an explicitly volunteered missing fact, but the exact field and value must be confirmed by the user before Core updates the profile. The AI may not treat a casual statement as verified identity evidence.
