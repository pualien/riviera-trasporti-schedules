# Riviera Brand Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved `Riviera Trasporti Ricerca Percorsi` icon family, favicon set, and horizontal wordmark, then wire those assets into the existing static site so the document title, header, and favicon surfaces all use the new identity.

**Architecture:** Keep generated raster assets under `assets/brand/`, expose brand strings and asset paths through a focused `src/lib/brand.js` module, and move the topbar markup into a dedicated `src/ui/renderShell.js` renderer so branding becomes testable. Then update `index.html`, `styles.css`, and `src/ui/renderSearchForm.js` to consume the approved name and secondary `Route Lookup` descriptor without changing route-finding behavior.

**Tech Stack:** Vanilla JavaScript, static HTML/CSS, Vitest, GPT Image generation, macOS `sips`

---

## File Structure

- Create: `assets/brand/README.md`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-lockup-master.png`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png`
- Create: `assets/brand/apple-touch-icon.png`
- Create: `assets/brand/favicon-32x32.png`
- Create: `assets/brand/favicon-16x16.png`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-lockup.png`
- Create: `src/lib/brand.js`
- Create: `src/ui/renderShell.js`
- Create: `tests/ui/renderShell.test.js`
- Create: `tests/ui/indexHtmlBranding.test.js`
- Modify: `src/main.js`
- Modify: `src/ui/renderSearchForm.js`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `tests/ui/renderSearchForm.test.js`

## Implementation Notes

- Keep image filenames ASCII-only and explicit; avoid generic names such as `logo.png`.
- Treat `assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png` as the canonical icon source for resizes.
- Treat `assets/brand/riviera-trasporti-ricerca-percorsi-lockup-master.png` as the canonical horizontal lockup source.
- Use transparent backgrounds for the lockup images so they can sit on the existing warm page surfaces.
- Do not introduce a web app manifest in this pass; the design spec explicitly deferred that.

### Task 1: Generate And Catalog Brand Assets

**Files:**
- Create: `assets/brand/README.md`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-lockup-master.png`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png`
- Create: `assets/brand/apple-touch-icon.png`
- Create: `assets/brand/favicon-32x32.png`
- Create: `assets/brand/favicon-16x16.png`
- Create: `assets/brand/riviera-trasporti-ricerca-percorsi-lockup.png`

- [ ] **Step 1: Create the brand asset inventory**

```md
# Riviera Brand Assets

Canonical sources:

- `riviera-trasporti-ricerca-percorsi-icon-master.png`: master transit badge used for app-icon derivatives
- `riviera-trasporti-ricerca-percorsi-lockup-master.png`: master horizontal logo lockup

Exports:

- `riviera-trasporti-ricerca-percorsi-ios-1024.png`: iOS-ready square app icon
- `riviera-trasporti-ricerca-percorsi-android-512.png`: Android-ready square app icon
- `apple-touch-icon.png`: 180x180 Apple touch icon for web surfaces
- `favicon-32x32.png`: 32x32 browser favicon
- `favicon-16x16.png`: 16x16 browser favicon
- `riviera-trasporti-ricerca-percorsi-lockup.png`: header-ready lockup used by the site shell

Brand rules:

- Primary name: `Riviera Trasporti Ricerca Percorsi`
- Secondary English descriptor: `Route Lookup`
- Visual direction: transit-first, warm, official, simplified
```

- [ ] **Step 2: Generate the master icon with GPT Image**

Use the image tool with this exact prompt:

```text
Create a clean, vector-like raster app icon on a warm coral-to-apricot background for a transit route lookup product named "Riviera Trasporti Ricerca Percorsi". The icon must contain only a simplified front-facing bus and a route arc above it to communicate transport plus route lookup. Style: official, trustworthy, warm, modern, not playful, not tourism branding, not startup-generic. Use off-white for the bus body, deep ink details only where necessary, balanced centered composition, high contrast, crisp edges, no text, no mockup, no device frame, no shadows outside the icon, export as a square image.
```

Save the result to:

```text
assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png
```

- [ ] **Step 3: Generate the horizontal lockup with GPT Image**

Use the image tool with this exact prompt:

```text
Create a horizontal logo lockup on a transparent background for a transit route lookup product. Place a rounded-square transit badge on the left using the same visual language as this identity: warm coral-to-apricot field, simplified off-white front-facing bus, subtle route arc. To the right, typeset the product name in a clean modern sans-serif with strong hierarchy: first line "Riviera Trasporti", second line "Ricerca Percorsi". Add a smaller secondary English descriptor "Route Lookup" only if it fits cleanly beneath or beside the Italian descriptor. Tone: practical, calm, trustworthy, official, modern. No decorative flourishes, no mockup, no photographic texture, no extra symbols.
```

Save the result to:

```text
assets/brand/riviera-trasporti-ricerca-percorsi-lockup-master.png
```

- [ ] **Step 4: Export the platform and favicon sizes from the canonical sources**

Run:

```bash
mkdir -p assets/brand
sips -z 1024 1024 assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png --out assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png
sips -z 512 512 assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png --out assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png
sips -z 180 180 assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png --out assets/brand/apple-touch-icon.png
sips -z 32 32 assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png --out assets/brand/favicon-32x32.png
sips -z 16 16 assets/brand/riviera-trasporti-ricerca-percorsi-icon-master.png --out assets/brand/favicon-16x16.png
cp assets/brand/riviera-trasporti-ricerca-percorsi-lockup-master.png assets/brand/riviera-trasporti-ricerca-percorsi-lockup.png
```

Expected: all seven exported files exist under `assets/brand/`.

- [ ] **Step 5: Verify the asset inventory**

Run:

```bash
ls -1 assets/brand
```

Expected output contains:

```text
README.md
apple-touch-icon.png
favicon-16x16.png
favicon-32x32.png
riviera-trasporti-ricerca-percorsi-android-512.png
riviera-trasporti-ricerca-percorsi-icon-master.png
riviera-trasporti-ricerca-percorsi-ios-1024.png
riviera-trasporti-ricerca-percorsi-lockup-master.png
riviera-trasporti-ricerca-percorsi-lockup.png
```

- [ ] **Step 6: Commit the generated asset bundle**

```bash
git add assets/brand
git commit -m "feat: add Riviera brand asset family"
```

### Task 2: Add Brand Constants And A Testable Shell Renderer

**Files:**
- Create: `src/lib/brand.js`
- Create: `src/ui/renderShell.js`
- Create: `tests/ui/renderShell.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: Write the failing shell-renderer test**

```js
import { describe, expect, it } from 'vitest';
import { renderShell } from '../../src/ui/renderShell.js';

describe('renderShell', () => {
  it('renders the approved lockup, descriptor, and official-site link', () => {
    const html = renderShell('<section>Body</section>');

    expect(html).toContain('./assets/brand/riviera-trasporti-ricerca-percorsi-lockup.png');
    expect(html).toContain('alt="Riviera Trasporti Ricerca Percorsi wordmark"');
    expect(html).toContain('Official PDF, clearer route lookup');
    expect(html).toContain('Official Riviera Trasporti site');
    expect(html).toContain('<section>Body</section>');
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
npx vitest run tests/ui/renderShell.test.js
```

Expected: FAIL with a module-resolution error because `src/ui/renderShell.js` does not exist yet.

- [ ] **Step 3: Create the brand constants module**

```js
export const BRAND_NAME = 'Riviera Trasporti Ricerca Percorsi';
export const BRAND_DESCRIPTOR = 'Route Lookup';
export const BRAND_SUBTITLE = 'Official PDF, clearer route lookup';
export const BRAND_LOCKUP_SRC = './assets/brand/riviera-trasporti-ricerca-percorsi-lockup.png';
export const BRAND_LOCKUP_ALT = `${BRAND_NAME} wordmark`;
export const BRAND_SITE_URL = 'https://rivieratrasporti.it/';
export const BRAND_SITE_LABEL = 'Official Riviera Trasporti site';
```

- [ ] **Step 4: Create the shell renderer and update `src/main.js` to use it**

`src/ui/renderShell.js`

```js
import {
  BRAND_LOCKUP_ALT,
  BRAND_LOCKUP_SRC,
  BRAND_SITE_LABEL,
  BRAND_SITE_URL,
  BRAND_SUBTITLE,
} from '../lib/brand.js';

export function renderShell(content) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <img
            class="brand-lockup-image"
            src="${BRAND_LOCKUP_SRC}"
            alt="${BRAND_LOCKUP_ALT}"
          />
          <p class="brand-subtitle">${BRAND_SUBTITLE}</p>
        </div>
        <a class="topbar-link" href="${BRAND_SITE_URL}" target="_blank" rel="noreferrer">
          ${BRAND_SITE_LABEL}
        </a>
      </header>
      ${content}
    </div>
  `;
}
```

`src/main.js`

```js
import { renderShell } from './ui/renderShell.js';
```

Remove the in-file `renderShell()` function from `src/main.js` and keep the existing `renderApp()` call site unchanged:

```js
  renderShell(parts.join(''));
```

- [ ] **Step 5: Run the shell test to verify it passes**

Run:

```bash
npx vitest run tests/ui/renderShell.test.js
```

Expected: PASS

- [ ] **Step 6: Commit the shell-branding refactor**

```bash
git add src/lib/brand.js src/ui/renderShell.js src/main.js tests/ui/renderShell.test.js
git commit -m "feat: wire branded shell renderer"
```

### Task 3: Wire The Document Title And Favicon Links

**Files:**
- Create: `tests/ui/indexHtmlBranding.test.js`
- Modify: `index.html`

- [ ] **Step 1: Write the failing document-head test**

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('index.html branding', () => {
  it('uses the approved title and favicon assets', () => {
    expect(html).toContain('<title>Riviera Trasporti Ricerca Percorsi</title>');
    expect(html).toContain('rel="icon" type="image/png" sizes="32x32" href="./assets/brand/favicon-32x32.png"');
    expect(html).toContain('rel="icon" type="image/png" sizes="16x16" href="./assets/brand/favicon-16x16.png"');
    expect(html).toContain('rel="apple-touch-icon" href="./assets/brand/apple-touch-icon.png"');
  });
});
```

- [ ] **Step 2: Run the new head test to verify it fails**

Run:

```bash
npx vitest run tests/ui/indexHtmlBranding.test.js
```

Expected: FAIL because `index.html` still contains `<title>Riviera Transit</title>` and no favicon links.

- [ ] **Step 3: Update the head metadata in `index.html`**

Replace the current `<head>` block content with:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Riviera Trasporti Ricerca Percorsi</title>
  <link rel="icon" type="image/png" sizes="32x32" href="./assets/brand/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="./assets/brand/favicon-16x16.png" />
  <link rel="apple-touch-icon" href="./assets/brand/apple-touch-icon.png" />
  <link rel="stylesheet" href="./styles.css" />
</head>
```

- [ ] **Step 4: Run the head test to verify it passes**

Run:

```bash
npx vitest run tests/ui/indexHtmlBranding.test.js
```

Expected: PASS

- [ ] **Step 5: Commit the document-head branding**

```bash
git add index.html tests/ui/indexHtmlBranding.test.js
git commit -m "feat: add branded title and favicon links"
```

### Task 4: Update Runtime Brand Copy And Style The New Lockup

**Files:**
- Modify: `src/ui/renderSearchForm.js`
- Modify: `styles.css`
- Modify: `tests/ui/renderSearchForm.test.js`

- [ ] **Step 1: Tighten the existing search-form test around the new descriptor copy**

Update the first test in `tests/ui/renderSearchForm.test.js` so these assertions replace the old eyebrow expectation:

```js
expect(html).toContain('Ricerca Percorsi / Route Lookup');
expect(html).toContain('Find direct Riviera buses faster than scanning the PDF.');
expect(html).not.toContain('Riviera Trasporti Search');
```

- [ ] **Step 2: Run the updated search-form test to verify it fails**

Run:

```bash
npx vitest run tests/ui/renderSearchForm.test.js
```

Expected: FAIL because the current eyebrow still renders `Riviera Trasporti Search`.

- [ ] **Step 3: Update the search-form eyebrow to the approved bilingual descriptor**

In `src/ui/renderSearchForm.js`, replace the hero-copy eyebrow line with:

```js
<p class="eyebrow">Ricerca Percorsi / Route Lookup</p>
```

Keep the existing headline and body copy unless a later visual review exposes a layout issue.

- [ ] **Step 4: Add lockup-specific CSS and mobile-safe topbar behavior**

Add or replace the relevant branding rules in `styles.css` with:

```css
.brand-subtitle,
.eyebrow,
.section-head p,
.metric span,
.summary-lines,
.topbar-link {
  margin: 0;
}

.brand-lockup {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.brand-lockup-image {
  display: block;
  width: min(100%, 340px);
  height: auto;
}

.brand-subtitle {
  color: var(--muted);
  max-width: 36ch;
  margin-top: 4px;
  font-size: 0.94rem;
}

.topbar-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.94);
  font-size: 0.92rem;
}

@media (max-width: 860px) {
  .brand-lockup-image {
    width: min(100%, 300px);
  }

  .topbar-link {
    width: 100%;
  }
}
```

Do not remove the existing `.eyebrow` typography rule. The new copy should inherit the current label styling.

- [ ] **Step 5: Run focused UI tests to verify copy and shell rendering**

Run:

```bash
npx vitest run tests/ui/renderSearchForm.test.js tests/ui/renderShell.test.js tests/ui/indexHtmlBranding.test.js
```

Expected: PASS

- [ ] **Step 6: Run the full test suite and remove stale runtime brand strings**

Run:

```bash
npm test
rg -n "Riviera Transit|Riviera Trasporti Search" index.html src styles.css tests
```

Expected:

- `npm test` reports PASS
- `rg` returns no matches in runtime files; test fixtures may still mention old strings only if intentionally preserved in historical docs, not in `index.html`, `src/`, `styles.css`, or `tests/`

- [ ] **Step 7: Perform a browser review of the branded surfaces**

Run:

```bash
python3 -m http.server 4173
```

Then inspect `http://localhost:4173` in the in-app browser and verify:

- the topbar shows the generated horizontal lockup image
- the subtitle reads `Official PDF, clearer route lookup`
- the tab/favicon uses the new badge instead of the browser default
- the hero eyebrow reads `Ricerca Percorsi / Route Lookup`
- the lockup remains legible on mobile width without overlapping the topbar link

- [ ] **Step 8: Commit the copy and styling updates**

```bash
git add src/ui/renderSearchForm.js styles.css tests/ui/renderSearchForm.test.js
git commit -m "feat: apply Riviera brand copy and lockup styling"
```

## Self-Review Checklist

- Spec coverage:
  - Approved name and English secondary descriptor are implemented by Tasks 2, 3, and 4.
  - Master icon, iOS icon, Android icon, favicon set, and horizontal lockup are produced by Task 1.
  - Header and marketing-style lockup integration are covered by Tasks 2 and 4.
  - Document title and favicon wiring are covered by Task 3.
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” language remains.
  - Every code-edit step includes exact code or exact replacement text.
- Type consistency:
  - `BRAND_*` constant names stay consistent across `src/lib/brand.js`, `src/ui/renderShell.js`, and the tests.
  - Asset filenames are identical across Task 1 exports, Task 2 runtime references, and Task 3 favicon links.
