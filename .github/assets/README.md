# README images

Images used by the root `README.md`.

| File | What it is | How it was made |
| --- | --- | --- |
| `banner-light.png`, `banner-dark.png` | Title banner for light and dark GitHub themes | Rendered from an HTML template with headless Chrome (Playwright) at 3200 × 1200, using `assets/app-icon.png` |
| `hero.png` | The public receiptcal.com home page on desktop and phone | Captured from the live public site with headless Chrome and framed. The app preview on the page is demo mode with local sample data. |
| `mcp-terminal.png` | Terminal card: `npm run validate`, the local server's tool list, the hosted OAuth metadata and an unauthenticated `401` | Real output from running each command locally on 2026-10-26, without signing in |

Rules for agents: images must show only public pages, demo-mode sample data or tool lists. Never include real receipts, meals, health data, account identifiers, emails or tokens. Regenerate an image rather than editing its output by hand.
