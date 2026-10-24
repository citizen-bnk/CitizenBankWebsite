# Original website restoration status

The `codex/restore-original-website` branch restores the original website and its investment screens without replacing the current production website or Hub. The old application is a Vite/React frontend with a FastAPI backend and Stack Auth. Its public images are restored in `public/brand`.

## Verified

- Vite production build and three API retry tests pass.
- Original website preview built on Vercel (commit `ef01927`).
- Internet banking and app registration destinations respond with HTTP 200.
- API retries a failed safe read once; it does not replay a subscription or payment mutation.
- Render and router failures now show actionable recovery controls and issue codes.

## Release blockers

- Vercel rejected the 24 October 2026 deployment attempt with `Your team has an overdue balance. Please add a valid payment method to reactivate your account.` A team owner must restore the SmartMyCompany billing state before any new preview or production deployment can be verified.

- The connected website Neon database contains seven clearly fictional `demo.citizenbank.test` profiles and three sample subscriptions. Additive investment migrations now provide a legacy audit view, certificate metadata table, and missing subscription columns; the three existing subscriptions remained intact. The preview's `/api/health/ready` passed its table check after migration. This is a schema check, not an end-to-end transaction check. Do not import Core's demo bootstrap migration over this database: it contains fictional share terms and could conflict with existing records.
- The demo database's R10 price matched the agreed price, but its 100-share minimum did not. The active demo share configuration and class were corrected to 1,000 shares (R10,000). The sole configured class is still labelled `Class A (demo)` while all three sample subscriptions say `Class C`; the authorized/issued/offered totals are fictional and need reconciliation before real investor subscriptions.
- The original frontend has extensive existing TypeScript errors, including calls to API methods absent from its generated client. The Vite build passing does not validate those flows.
- The certificate issuance path now keeps PDF bytes in private object storage and writes a storage key to Neon; signing retains the unsigned PDF and creates a versioned signed object. A private Vercel Blob store is connected to the website project with OIDC; a CLI write/read/unauthenticated-access/delete smoke test passed. Upload through the deployed FastAPI adapter remains unverified. Other legacy certificate routes and old Google Drive document references still need end-to-end review. See `docs/DOCUMENT_STORAGE.md`.
- Live sign-in, investment subscription, payment and portfolio reads on this restored branch have not passed end-to-end checks against a populated database.
- `@stackframe/react`'s installed nested packages expect React 19 while this website uses React 18 with a custom `React.use` polyfill. Resolve and browser-test this mismatch before production promotion.

## Database and demo release sequence

1. Confirm a reachable destination database and inventory its tables and existing records. The new `/api/health/ready` endpoint reports connection and four critical investor-table checks.
2. Reconstruct the original schema from the old API queries and model contracts as reviewed, versioned migrations. Reconcile existing real investors and subscriptions by stable identity and subscription ID; never replace them with fictional seed rows.
3. Verify the seven existing fictional profiles against their Stack Auth identities. If any seed is missing, apply only with `DEMO_MODE=true` and the existing `backend/app/libs/demo_seed.py` preflight. The seeder does not create passwords. Keep fictional records clearly identified.
4. Test sign-in for every role, admin-created investor, subscription, partial payment, portfolio, certificate and document links through the preview URL. Then promote the same verified commit to production and check its custom domain.
