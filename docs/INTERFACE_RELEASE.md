# Interface release — 8 October 2026

This release completes the current interface changes before the next business-integration phase. Existing working services are retained. New licensing, corporate-write, payment and password-recovery APIs are not introduced in this release.

Banking channels share a collapsible demo-account selector, small passkey control and guided registration. The selector is fed by the existing environment-controlled catalogue and stays hidden when demonstrations are disabled. Explore without an account retains the existing demo-only guest service. Shared profile links reach Hub investment discovery.

Website public progress and source-backed careers pages remain public. Investor actions reach the independent Hub. New investment discovery and account recovery are labelled Coming soon until their business workflows are released. Existing permission and profile contracts remain in force.

Basic interface/build and existing regression checks are performed for publication. Business acceptance testing, actual email delivery, Drive upload/access integration and financial workflows belong to the next phase.

## Account recovery update
The following release enables identity-provider email password recovery in Hub, with links from both banking sign-in screens. Seeded live accounts, including administrators, keep their existing identities and permissions. Passwords and email codes are never stored in Hub. Only verified recipient Hub sessions are revoked; banking sessions retain their existing expiration policy. A delivery test by the account owner remains required. Recruitment now uses the configured careers@citizenbank.co.ls inbox.
