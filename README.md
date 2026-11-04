# MediGo site (PRD v2)

Static HTML/CSS/JS for MediGo — Netlify-ready. Full page map: [`../prd-v2-build.md`](../prd-v2-build.md).

## Hosting

Live production URL: **https://care-compass-site.netlify.app**

- Netlify site: `care-compass-site`
- Site id: `3383aca8-1aff-46ab-a6c1-de4e98cab6d7`
- Do **not** use Try Live / remote desktop for demos.

## Local open (Finder)

1. Download [`../care-compass-site-preview.zip`](../care-compass-site-preview.zip) from Context.
2. Double-click to unzip on your Mac.
3. Open the unzipped folder → double-click **`index.html`** (opens in your browser).

Or from Context: open `docs/site/index.html` directly if your client supports it.

Worker VM localhost is not reachable from your laptop — use the zip instead of deploying to preview.

## Structure

| Path | Role |
|---|---|
| `index.html` | Brand-first home + search |
| `destinations.html` / `destinations/` | Hub list + detail |
| `procedures.html` / `procedures/` | A–Z + detail |
| `clinics.html` / `clinics/` | Clinic directory + detail |
| `doctors/` | Doctor detail |
| `about.html` / `contact.html` | Product story + inquiry |
| `brand.css` / `brand.js` | Brand tokens + motion |
| `site.css` / `app.js` | Layout + search / filters / forms |
| `data/catalog.json` | Site catalog (synthetic) |
| `scripts/*.mjs` | Regenerate catalog + pages |

All catalog content is **synthetic demo data for product design** — no marketplace scrapes.
