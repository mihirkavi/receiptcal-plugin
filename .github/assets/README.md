# README images

Images used by the root `README.md`.

| File | What it is | How it was made |
| --- | --- | --- |
| `banner-light.png`, `banner-dark.png` | Title banner for light and dark GitHub themes | Rendered from [`source/banner.html`](source/banner.html) with headless Chrome (Playwright) at 3200 × 1200, using `assets/app-icon.png`. See [`source/README.md`](source/README.md) |
| `hero.png` | The public receiptcal.com home page on desktop and phone | Captured from the live public site with headless Chrome and framed. The app preview on the page is demo mode with local sample data. |
| `mcp-terminal.png` | Terminal card: `npm run validate`, the local server's tool list, the hosted OAuth metadata and an unauthenticated `401` | Real output from running each command locally on 2026-10-26, without signing in |

## Visual identity

The plugin shares the ReceiptCal app's design tokens (from receiptcal.com's CSS) and adds a developer twist: a thermal receipt printed with MCP tool calls.

- **Colors:** forest `#063022` / `#032B20`, accent green `#127A3D`, leaf `#24C96B`, mint `#CAFFDD`, canvas `#F6F7F1`, paper `#FFFEF9`. Dark theme: forest `#032B20` background with mint and `#65E892` text.
- **Type:** Nunito (rounded display and body; the closest open font to the site's `ui-rounded` / SF Pro Rounded stack), Space Mono (the receipt).
- **Motif:** a receipt whose line items are real tools (`list_meals`, `prepare_create_meal_plan`, `create_cart_url`), totals for tools in source, prepare-then-confirm tools and purchases (0), and an "Awaiting your OK" stamp for `confirm_action`.
- **README:** badges in forest `063022` and accent `127A3D`, status in `56675F`. Emoji stay: the brand is friendly and consumer-facing.

Rules for agents: images must show only public pages, demo-mode sample data or tool lists. Never include real receipts, meals, health data, account identifiers, emails or tokens. Regenerate an image rather than editing its output by hand.
