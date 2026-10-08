# Citizen Bank website

Public website built afresh using Next.js 15.5.26, React 19.1.9 and TypeScript, matching the retained banking applications. It owns public pages and navigation. Institutional features, sign-in and profiles live in Citizen Hub. Customer account opening and banking live in Internet Banking and the Citizen App.

Use Node 22 and `npm ci`. Configure `.env.example` privately, run `npm run dev` (port 3003), `npm test` and `npm run build`. On Vercel choose Next.js, `npm ci`, `npm run build`, and leave the output directory unset.

The website has no application database, document storage or authenticated business interface. The three explicit `/api/platform` compatibility endpoints forward the JWKS, public demonstration account catalogue and signed profile requests to Hub so existing Core and banking clients continue using their configured website address. Sign-in, investment, board, admin and profile links redirect to Hub. Old page addresses are retained as redirects where mapped in `lib/services.ts`.

The complete privacy notice, service terms and public contact details still require approved business content before market launch. Customer banking remains a demonstration during pre-licensing. The retained banking app and Core source are not replaced by this repository.
