# Banner source

`banner.html` is the self-contained design for `../banner-light.png` and `../banner-dark.png`. One file holds both themes: its `@media (prefers-color-scheme: dark)` block switches the palette.

## Re-render

Render it with any headless Chrome at a 1600 × 600 viewport and device scale factor 2, once with `prefers-color-scheme: light` and once with `dark`. For example, with Playwright:

```js
const page = await browser.newPage({ viewport: { width: 1600, height: 600 }, deviceScaleFactor: 2, colorScheme: 'dark' });
await page.goto('file://' + path.resolve('.github/assets/source/banner.html'));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: '.github/assets/banner-dark.png' });
```

Fonts load from Google Fonts, so rendering needs network access. The icon is read from `assets/app-icon.png` by relative path, so render the file from inside this repository.

## Notes for agents

- Edit the HTML, then re-render both PNGs. Never edit the PNGs by hand.
- Keep the banner free of personal data, real account content, tokens and invented product output.
- The receipt lists real tool names from `src/capabilities.ts`. Its totals (73 tools in source, 40 prepare-then-confirm, 0 purchases) must stay in step with the README and the code; update them if the registry changes.
