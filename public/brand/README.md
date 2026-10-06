Images used by the website and by outgoing emails (served at `/brand/...`, so emails use `https://citizenbank.co.ls/brand/...`).

| File | Used in |
|---|---|
| `HappyCitizen 1/3/4/7.webp` (1280 x 800, 57 to 108 KB) | Home page hero slideshow and loading screen. WebP is supported by every current browser |
| `HappyCitizen 1/3/4/7.jpg` (122 to 164 KB) | Outgoing emails: many email clients cannot show WebP, every one can show JPEG |
| `logo-sm.webp` (180 x 200, 7 KB) | Header, footer, mobile menu, invitation page |
| `logo-sm.png` (23 KB) | Outgoing emails |
| `logo.png` (902 x 1000, transparent) | Push notification image; the source for the favicon set in `public/` |

The full-size originals (about 1.4 MB each) are kept in `brand-originals/` at the repository root. They are **not** deployed:
re-make the web and email versions from them if the pictures ever need to change (WebP quality 80, JPEG quality 84).

Recovered on 6 October 2026 from the old platform's public address, which still served them. The old platform has been
removed from the code, so **keep `brand-originals/`**: it is the only copy the project controls.

`HappyCitizen a.png` (used in the investor invitation email) could not be recovered from the old address or from web
archives; that email now uses picture 3. If the original turns up, convert it the same way and point the email at it.

`backend/tests/test_brand_assets.py` fails if the code refers to a picture under `/brand` that is not in this folder,
if an email uses WebP, or if a web picture grows past 300 KB.

Favicon set, generated from `logo.png` and padded to a square: `public/favicon.ico` (16, 32 and 48 px), `favicon.png`,
`icon.png`, `apple-touch-icon.png` (on white), `icons/icon-192.png` and `icons/icon-512.png`.
