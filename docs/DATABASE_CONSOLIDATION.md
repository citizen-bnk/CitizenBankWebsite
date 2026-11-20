# Database consolidation — 20 November 2026

## Approved outcome

Use Neon project `damp-term-89130008` as the production data home, keep the free plan, preserve every existing investor, invitation, subscription, payment, document reference, role and board appointment. No reseeding or substitution of older backups for the current register is authorised by this migration.

## Verified inventory

| Project/database | Finding |
| --- | --- |
| `lucky-frog-62757466` / `citizen_website_production` | Current website investor source. Reads fail with an explicit Neon quota error. |
| `damp-term-89130008` / `neondb` | Banking and authentication tables. A read-only connection succeeds. |
| `damp-term-89130008` / `citizen_canonical_production` | Corporate framework exists, but people, holders, subscriptions and appointments currently contain zero rows. This is not a copy of the investor register. |

Preservation branches created without compute:

- Source: `br-dawn-firefly-b1hfz50v` (`investor-source-preserved-2026-11-20`), parent `br-gentle-hat-b1vq0h8h`, LSN `0/1AA28BC8`.
- Destination: `br-morning-sunset-av4nsum5` (`before-investor-consolidation-2026-11-20`), parent `br-restless-resonance-avby6n2k`, LSN `0/31B9618`.

These preserve database state inside Neon. They are not exported archives and do not prove row-level reconciliation. Both branches were verified ready.

## Cutover gate

The source quota prevents obtaining a fresh complete export. Its reported consumption period ends 1 December 2026. Do not switch production connections while the current source cannot be read and compared. The target's successful connection does not remove this requirement.

1. Recover read access to the source on its existing free plan.
2. Inventory every active application connection. Include website, Hub, original provider Core and the separate Core currently serving banking. The latter must not be confused with the original provider project.
3. Enter a controlled write pause; stop scheduled sends and provisioning during the snapshot/cutover. Record a cutover timestamp. Preserve in-flight email states to avoid duplicate delivery.
4. Export the complete current source using a consistent snapshot and a direct connection. Store the archive privately with a checksum. Do not use October archives or reconstruct rows from source documents as a replacement for this export.
5. Rehearse on an isolated branch of `damp-term-89130008`. Compare schema and column definitions first. Both the website and banking have a table called `public.notifications`; they have different structures and must not be merged or overwritten by name. Preserve banking authentication/session data and provider subject mappings.
6. Establish explicit ownership of identity, investments, board records and banking data. Keep one canonical identity/role service; avoid a second editable investor profile store in the Hub. The Hub's institutional operations already call the website's authorised API.
7. Compare all table row counts and deterministic row checksums, IDs, foreign keys, sequence positions, document locations and invitation tokens. Review pending versus sent emails and partially paid subscriptions separately. Retain the current A/B/C allocation and pending reconciliation/conversion statuses.
8. Test sign-in, administrator roles, investor directory, portfolio, certificate preview, invitation acceptance/password setup and email queue delivery against the staged production build.
9. Set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in the relevant Vercel projects to the validated destination. The website entry point already derives its legacy production/development aliases from these two values; do not leave conflicting aliases. Rebuild, recheck readiness, then promote and resume writes/jobs.
10. Keep the old source read-only for rollback. Do not delete any source project or banking database during this task.

## Free-plan protection

Website governance and communication queue scans run together every 15 minutes, rather than every minute. Investor account provisioning runs hourly. This gives an idle database an opportunity to suspend; it is not a guarantee that all production traffic will fit the free allowance. Queued mail may wait up to 15 minutes for its scheduled processor. Interactive onboarding remains available independently of the hourly imported-account scan.

Quota failures return HTTP 503 with `DATA_QUOTA_EXHAUSTED` and a retry-later recovery. Readiness returns `DATABASE_QUOTA_EXHAUSTED`; it must never report an empty or inaccessible destination as ready.

No production database connection has been switched by this preparation. Migration and live end-to-end verification remain blocked until a fresh source export is possible.
