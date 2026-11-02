# Original website and investment cutover

Status: preparation, 2 November 2026. This document describes the release gate; it does not authorize a data deletion or represent a completed cutover.

## Product ownership

- `citizenbank.co.ls` serves the restored original website. Its `/invest`, `/share-subscription`, and `/my-subscriptions` screens own the investor journey.
- The original website presents the investor portfolio, data room, board portal, and investment administration in its original layout. The institutional service remains the single writer and data source behind those screens until its records are migrated to a verified canonical database. Existing Hub routes must share that service or redirect; they must never create a second ledger.
- Internet Banking and the app use Bank Core for dormant pre-licensing accounts. The banking ledger is a separate bounded system of record, linked by the shared identity subject; it is not merged into an investor table.

## Verified source state

- The superseded Next.js website is preserved at Git tag `archive/website-next-2026-11-02`.
- Private, restorable PostgreSQL archives were taken on 2 November for the original website `neondb`, the institutional `citizen_platform_business`, and both Core databases. No source database was cleared.
- The original website's `neondb` contains 7 demonstration profiles and 3 demonstration subscriptions, and no verified live investor row. Its Class A share offer must not be published as the live offer.
- The restored home page retains the original four performance cards and their fixed values, prominently identified as illustrative design figures, not operating results. They cannot be described as live bank metrics during pre-licensing.
- The institutional database contains 19 live people, 5 live subscription requests, and a separately scoped demonstration dataset. Its approved live SAFE opportunity is the source of offer terms until a reconciled corporate register supersedes it.
- Both website and Hub production identity configuration point to the same Stack Auth project. The legacy website's built-in fallback points to a different project; production builds must receive `AUTH_PROVIDERS` explicitly and verify its project ID before promotion.
- The website's restored navigation now reads roles from the institutional identity bridge rather than its demonstration-only role table. The bridge also reads the live offer and the signed-in investor's portfolio. Subscription, payment, data-room, and board write paths are not yet cut over.

## Required release gates

1. Restore the original website on a protected preview. Confirm images, responsive navigation, investment routes, and safe failure states.
2. Make the website investment API use the live institutional investor records. Reuse the Hub's server-side subscription, payment, certificate, and document rules rather than implementing a second ledger. Match investors by verified Stack subject; never claim a record solely from an email match.
3. Reconcile each live subscription, payment, certificate reference, document version, and form response against the archive. Record unmatched and disputed items without inventing balances or issued shares.
4. Ensure every old website route that can create or modify an investment, data-room record, or board record either uses the canonical service or is disabled. Align the equivalent Hub actions to the same service so each action has one authoritative record.
5. Test one new subscription, an existing-investor top-up, partial and full payment, admin-on-behalf flow, portfolio privacy, document generation, and a cancelled/retried action against isolated data. Verify read and write consistency across website and Hub.
6. Promote the original website only after the above gates pass. Keep the archived Next.js deployment and all four database archives available for rollback and audit. Retire demonstration access without deleting records needed to explain past testing.

## Current block

The old investment frontend still calls the old `share_subscriptions` tables, while live investor records are in `hub_subscription_requests`. Pointing the old website at its original database would display demonstration data. Pointing it at the Hub database without an adapter would create duplicate investment tables and two sources of truth. Neither configuration is suitable for a real-data production investment release.
