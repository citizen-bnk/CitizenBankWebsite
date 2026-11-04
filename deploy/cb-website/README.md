# cb-website compatibility deployment

This project forwards browser pages to `https://citizenbank.co.ls` and proxies
`/api/*` to that website's API. It does not host another application, own a
database, or initialise data.

Vercel project `cb-website` uses this directory as its project root. Its build
requires Node only (`node build.mjs`); do not select the Vite framework or run
the parent website's build here. Keep deployment protection enabled.

Publish from the same reviewed commit as the canonical website. When changing
the canonical domain, update both destinations in this directory's
`vercel.json`. The primary website continues to own user, role and investment
records.
