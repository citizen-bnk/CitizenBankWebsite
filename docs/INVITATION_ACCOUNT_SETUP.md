# Invitation-first account setup

Board and investor invitations can be reviewed and accepted without signing in. Acceptance alone grants no access. A private, one-use setup link is queued through the existing Core email service and expires after one hour. The recipient sets a password and completes only the basic profile: name and mobile number (email is already confirmed by the link). Mailbox ownership must be established before new invited access is activated. An existing verified account can sign in with its current password after accepting; a password change is optional.

Recovery checks invitations: pending invitations receive an acceptance link; accepted invitations receive a setup link. Ordinary accounts retain identity-provider recovery. Recovery does not restore revoked roles. Expired, consumed, cancelled or recipient-changed links cannot alter credentials. The website and Hub recovery interfaces use this flow.

## Imported portfolios

The reviewed import creates 48 person/organisation profiles and links 80 source observations. Shared contacts and missing contacts remain for administrator review. No invented email addresses or shared family logins are created. Importing does not issue shares or convert SAFEs.

Hub navigation: Invest → Manage investors & shareholders → View portfolio. The overlay separates the working register, early subscriptions, SAFE schedule and form reconciliation. Source observations are not added together as issued shares. Historical document links preserve original Drive permissions.

Previews use the approved CitizenBank_Share_Certificate_Fillable.pdf template, Drive file `1K0ICAxD2MeuKqQ_f0INBbIWHj0pekMsQ`. PDFs are flattened, unsigned and labelled **UNSIGNED PREVIEW - NOT ISSUED**. SAFE observations show **SAFE CONVERSION PENDING**. Viewing a preview creates no issuance.

The live Class A/B/C allocation is unchanged. CB36-01 remains unconverted. Bongiwe Rongo remains at 500 working-register shares with the additional 500 flagged for reconciliation.

## Release and checks

Apply additive migrations 010–012 before promotion. Retain the pre-import Neon backup. Readiness requires the new profile, document and invitation tables. The protected provisioning job creates identities only for reviewed unique personal contacts, without sending unsolicited invitations.

Test acceptance, password setup, link replay/expiry, recipient binding, recovery without role restoration and transactional email creation in the isolated rehearsal database with a simulated identity provider. Verify the private Hub bridge, portfolio and PDF response separately. Do not insert test financial records or issue test certificates in production. Live recipient sign-in and inbox receipt require a separate observed check.
