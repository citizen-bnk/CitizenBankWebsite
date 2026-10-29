# Citizen Bank website launch readiness — 29 October 2026

## Verified in this pass

- The restored website builds with Vite. The Internet Banking and mobile app builds also pass.
- Public navigation in the website header, footer, home page, FAQ and help centre resolves to one of 141 declared website routes or to configured ecosystem URLs.
- Home page share-offer details are read from the live availability API. If that API fails, no price or availability is invented.
- Public media releases already load from the published-release API. Administrators manage releases through the existing back-office page.
- Fabricated performance figures, reports, branch addresses, support telephone numbers, fee schedules and FAQ promises were removed from public display in this pass.
- Website return links were added to Internet Banking and the mobile app, including their sign-in pages.

## Blocking a full public launch

1. **Hosting disabled:** both custom and `vercel.app` domains return HTTP 402 with `X-Vercel-Error: DEPLOYMENT_DISABLED`. Vercel reports the projects' latest production deployments as `READY`, but the public cannot access them. The team account restriction must be resolved before any end-to-end test or publication can be considered successful.
2. **Production is older than these branches:** Vercel production deployments currently reference `codex/interface-release-20261008`. The reviewed work is on `codex/restore-original-website` for the website and `codex/ecosystem-demo` for the two banking frontends. Build and test these branches as previews, then merge or deploy the intended release commits when hosting resumes.
3. **Legal content needs review:** `TermsOfService.tsx`, `PrivacyPolicy.tsx`, and `CookiePolicy.tsx` are dated October 2025. Terms describe real banking transactions, fees and lending despite the current pre-licensing stage. Have counsel approve current platform terms and disclosures before the public is asked to accept them.
4. **Public disclosures need a publication source:** the former page had fabricated report downloads. It now accurately shows that no document is published. Add an administrator-controlled public-disclosure record/API with approved files and dates before advertising reports.
5. **Careers:** the restored website now has a `/careers` gateway to the Hub's data-backed vacancy and application flow. Once hosting resumes, confirm that open roles, closing dates and guest applications load correctly; do not republish closed vacancies from old static content.
6. **Contact delivery:** the former contact form only simulated a successful send. The page now opens a real email composer using addresses configured in the backend. Confirm those mailboxes receive and are monitored, or replace this with a tested server-side contact form.
7. **Runtime and identity:** after hosting resumes, exercise website → Hub, website → banking/app, logged-out return, demo sign-in, account creation, investor subscriptions and API failure recovery on mobile and desktop. A successful build is not evidence that these flows work in production.

## Release verification

Run `npm run check:public-links` and `npm run build` in the website; run `npm run build` in both banking frontends. After Vercel access is restored, verify HTTP 200 on each canonical domain and test the flows above with fictional accounts. Check no production banking action can move real money before licensing.
