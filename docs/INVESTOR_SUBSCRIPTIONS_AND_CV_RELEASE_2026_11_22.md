# Investor records, invitation delivery and CV review

The 22 November campaign targets 42 distinct, clear individual investor email addresses. Shared family contacts receive one invitation; unresolved contacts are excluded. Existing accepted invitations are preserved. Delivery is queued transactionally with a campaign-specific idempotency key, and provider message IDs are retained separately from invitation acceptance.

The historical import prepares 20 subscriptions: SAFE commitments from the investor contracts plus one working-register commitment and the administrator-confirmed CB36-01 top-up. The current bank-allocation workbook supports R52,000; the two explicitly confirmed CB36 payments contribute R1,000. Each payment has an idempotent allocation reference and source evidence. Five commitments are fully paid. Historical payment verification does not certify allotment or SAFE conversion. The live Class A/B/C offer and working register are preserved.

Administrator-confirmed quantities are 4,000 reference units for CB64 and 1,000 for CB68, with conversion pending. CB31 and CB44 retain unknown quantities. CB22 carries the 1,000-unit contractual commitment while its working member-register position remains 500. CB36-01 includes 100 purchased reference units and 100 company bonus units, pending conversion. The working-register Mofokeng commitment is explicitly historical and pending reconciliation, rather than being represented as an executed SAFE.

Historical records use `investor_person_id` and provenance fields. Shared-email fallback cannot expose another family member's historical subscription. Historical payment records cannot automatically issue ordinary certificates, transfer issued shares or change share class. They do not reserve units from the current Class B offer.

The signed CB22 and CB36 SAFE banking clauses agree on the South African Citizen Pay collection account and the Lesotho Citizen Digital account. These are seeded in bank-account settings for ZAR and LSL with source descriptions. No personal investor bank account is used as a receiving destination.

## CV handling

All website profile stages can reach the optional Your CV section. PDF and DOCX uploads are limited to 3 MB, keeping multipart requests within the hosting request limit. Private file storage holds immutable versions; the database stores only the current file reference and upload metadata. A failed storage operation preserves the previous reference.

PDFs can be reviewed inline; PDF and Word files can be downloaded. The user can replace a CV and reopen the saved file after signing in again. Administrator full-profile review can read the CV through a protected route. Public, long-lived CV share links are not generated. The CV routes do not overlap the existing generic profile route.
