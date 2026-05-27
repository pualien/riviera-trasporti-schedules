# Azzuriva Rebrand, SEO, And Ads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the live app to `Azzuriva`, strengthen static and runtime SEO around the new identity, and add ad-ready shell surfaces without activating a live ad network yet.

**Architecture:** Keep the app as a static vanilla JavaScript SPA. Centralize the new brand in `src/lib/brand.js` and `src/lib/seo.js`, move the visible shell away from the old raster lockup to a text wordmark, and add explicit optional ad-slot renderers so monetization can be enabled later without another shell rewrite. Preserve the current GitHub Pages canonical origin until `azzuriva.com` is actually live.

**Tech Stack:** Vanilla JavaScript ES modules, static HTML, Web App Manifest, Service Worker API, Vitest, GitHub Pages.

---

## Scope Check

This plan keeps the approved work in one implementation sequence because the three approved areas share the same public surfaces:

- the visible product identity
- the SEO metadata and crawlable shell copy
- the top-level shell layout where future ads would live

Splitting this into separate plans would duplicate shell and metadata edits and make regression review harder. Historical design/spec files are intentionally not rewritten; the new approved spec supersedes them.

## File Structure

Create:

- `src/ui/renderAdSlot.js`: explicit ad-slot renderer that returns nothing when a slot is inactive.
- `tests/ui/renderAdSlot.test.js`: unit coverage for inactive and configured slot rendering.

Modify:

- `src/lib/brand.js`: new primary brand constants and official-source URL constants.
- `src/lib/seo.js`: `Azzuriva` default/route titles and descriptions while retaining Riviera Trasporti trust terms.
- `src/lib/i18n.js`: new shell/search copy in all supported languages plus source-trust copy.
- `src/ui/renderShell.js`: text-based `Azzuriva` wordmark, richer crawlable support copy, optional high and low ad-slot insertion points.
- `styles.css`: wordmark styling and ad-slot shell styling.
- `src/main.js`: pass the shell without old image lockup assumptions; keep ad slots inactive.
- `index.html`: static metadata, `WebSite`/`WebApplication` JSON-LD, `og:site_name`, and crawlable body copy.
- `manifest.webmanifest`: app name/short name/description while keeping current icon files as temporary legacy raster assets.
- `service-worker.js`: `azzuriva` cache prefix and required asset list aligned to the new shell.
- `package.json`: package name rebrand to `azzuriva`.
- `package-lock.json`: top-level package name rebrand to `azzuriva`.
- `README.md`: repo overview rebrand and broader positioning.
- `PRODUCT.md`: product framing rebrand to independent Riviera companion.
- `DESIGN.md`: design-system naming update to `Azzuriva`.
- `assets/brand/README.md`: document that current PNG exports are legacy raster assets pending a dedicated `Azzuriva` refresh.
- `tests/lib/seo.test.js`: new brand metadata expectations.
- `tests/lib/serviceWorker.test.js`: new cache prefix expectations.
- `tests/ui/indexHtmlBranding.test.js`: static brand/SEO/canonical expectations.
- `tests/ui/renderSearchForm.test.js`: broadened `Azzuriva` search copy expectations.
- `tests/ui/renderShell.test.js`: text wordmark, support-copy, and ad-slot placement expectations.

## Task 1: Rebrand Core Metadata And Search Copy

**Files:**

- Modify: `src/lib/brand.js`
- Modify: `src/lib/seo.js`
- Modify: `src/lib/i18n.js`
- Modify: `tests/lib/seo.test.js`
- Modify: `tests/ui/renderSearchForm.test.js`

- [ ] **Step 1: Update metadata and search-copy tests to the approved `Azzuriva` wording**

Edit `tests/lib/seo.test.js`:

```js
expect(buildDefaultSeoMetadata()).toMatchObject({
  title: 'Azzuriva',
});

expect(buildRouteSeoMetadata({
  from: 'Porto Maurizio',
  to: 'Sanremo',
  dayTypeLabel: 'Weekday',
})).toMatchObject({
  title: 'Porto Maurizio to Sanremo | Azzuriva',
});
```

Edit `tests/ui/renderSearchForm.test.js` in the first and German-copy assertions:

```js
expect(html).toContain('Azzuriva');
expect(html).toContain('Find direct Riviera Trasporti buses and practical Riviera travel context faster with Azzuriva.');
expect(html).not.toContain('Riviera Trasporti Search');
```

```js
expect(html).toContain('Azzuriva');
expect(html).toContain('Finde direkte Riviera-Trasporti-Busse und klarere Riviera-Hinweise schneller mit Azzuriva.');
```

- [ ] **Step 2: Run the targeted tests to verify they fail on the old brand**

Run:

```bash
npm test -- tests/lib/seo.test.js tests/ui/renderSearchForm.test.js
```

Expected: FAIL because the app still returns `Riviera Trasporti Ricerca Percorsi`, `Route Lookup`, and the old search hero copy.

- [ ] **Step 3: Rebrand the shared brand and SEO helpers**

Update `src/lib/brand.js`:

```js
export const BRAND_NAME = 'Azzuriva';
export const OFFICIAL_SOURCE_NAME = 'Riviera Trasporti';
export const APP_SITE_URL = 'https://pualien.github.io/riviera-trasporti-schedules/';
export const BRAND_SITE_URL = 'https://rivieratrasporti.it/';
export const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/PLACEHOLDER/viewform';
```

Update `src/lib/seo.js`:

```js
import { BRAND_NAME, OFFICIAL_SOURCE_NAME } from './brand.js';

const DEFAULT_TITLE = BRAND_NAME;
const DEFAULT_DESCRIPTION = `${BRAND_NAME} helps you check direct ${OFFICIAL_SOURCE_NAME} buses from the official PDF across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera towns.`;

export function buildDefaultSeoMetadata() {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  };
}

export function buildRouteSeoMetadata({ from, to, dayTypeLabel }) {
  return {
    title: `${from} to ${to} | ${DEFAULT_TITLE}`,
    description: `${BRAND_NAME} helps you compare direct ${OFFICIAL_SOURCE_NAME} departures for ${from} to ${to} on ${dayTypeLabel}, with official-PDF trust and taxi fallback context.`,
  };
}
```

- [ ] **Step 4: Rebrand the translated shell and search copy in every supported language**

Update the changed dictionary keys in `src/lib/i18n.js`:

```js
it: {
  'shell.subtitle': 'Mobilita e luoghi della Riviera ligure',
  'shell.seoTitle': 'Azzuriva per la Riviera ligure',
  'shell.seoBody': 'Azzuriva ti aiuta a consultare le corse dirette di Riviera Trasporti dal PDF ufficiale per muoverti tra Imperia, Sanremo, Ventimiglia, Andora e altre localita della Riviera.',
  'shell.sourceTrustBody': 'Azzuriva e indipendente: gli orari autobus continuano a fare riferimento al PDF ufficiale Riviera Trasporti.',
  'search.eyebrow': 'Azzuriva',
  'search.title': 'Controlla le corse dirette di Riviera Trasporti e un contesto locale piu chiaro con Azzuriva.',
},
en: {
  'shell.subtitle': 'Italian Riviera travel companion',
  'shell.seoTitle': 'Azzuriva for the Italian Riviera',
  'shell.seoBody': 'Azzuriva helps you browse direct Riviera Trasporti buses from the official PDF across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera towns.',
  'shell.sourceTrustBody': 'Azzuriva is independent: bus times still point back to the official Riviera Trasporti PDF.',
  'search.eyebrow': 'Azzuriva',
  'search.title': 'Find direct Riviera Trasporti buses and practical Riviera travel context faster with Azzuriva.',
},
fr: {
  'shell.subtitle': 'Compagnon de voyage pour la Riviera ligure',
  'shell.seoTitle': 'Azzuriva pour la Riviera ligure',
  'shell.seoBody': 'Azzuriva vous aide a consulter les trajets directs de Riviera Trasporti depuis le PDF officiel pour voyager entre Imperia, Sanremo, Ventimiglia, Andora et les villes voisines de la Riviera.',
  'shell.sourceTrustBody': 'Azzuriva reste independant : les horaires de bus renvoient toujours au PDF officiel de Riviera Trasporti.',
  'search.eyebrow': 'Azzuriva',
  'search.title': 'Trouvez les bus directs Riviera Trasporti et un contexte Riviera plus clair avec Azzuriva.',
},
de: {
  'shell.subtitle': 'Reisebegleiter fur die ligurische Riviera',
  'shell.seoTitle': 'Azzuriva fur die ligurische Riviera',
  'shell.seoBody': 'Azzuriva hilft dir, direkte Riviera-Trasporti-Busse aus dem offiziellen PDF fur Fahrten zwischen Imperia, Sanremo, Ventimiglia, Andora und weiteren Riviera-Orten zu prufen.',
  'shell.sourceTrustBody': 'Azzuriva ist unabhangig: Buszeiten verweisen weiterhin auf das offizielle Riviera-Trasporti-PDF.',
  'search.eyebrow': 'Azzuriva',
  'search.title': 'Finde direkte Riviera-Trasporti-Busse und klarere Riviera-Hinweise schneller mit Azzuriva.',
},
es: {
  'shell.subtitle': 'Companero de viaje para la Riviera ligur',
  'shell.seoTitle': 'Azzuriva para la Riviera ligur',
  'shell.seoBody': 'Azzuriva te ayuda a consultar buses directos de Riviera Trasporti desde el PDF oficial para moverte entre Imperia, Sanremo, Ventimiglia, Andora y otras localidades cercanas de la Riviera.',
  'shell.sourceTrustBody': 'Azzuriva es independiente: los horarios de bus siguen remitiendo al PDF oficial de Riviera Trasporti.',
  'search.eyebrow': 'Azzuriva',
  'search.title': 'Encuentra buses directos de Riviera Trasporti y un contexto Riviera mas claro con Azzuriva.',
},
```

- [ ] **Step 5: Run the targeted tests to verify the rebrand passes**

Run:

```bash
npm test -- tests/lib/seo.test.js tests/ui/renderSearchForm.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the metadata and copy rebrand**

```bash
git add src/lib/brand.js src/lib/seo.js src/lib/i18n.js tests/lib/seo.test.js tests/ui/renderSearchForm.test.js
git commit -m "feat: rebrand core metadata and search copy to Azzuriva"
```

## Task 2: Replace The Old Lockup And Add Ad-Ready Shell Slots

**Files:**

- Create: `src/ui/renderAdSlot.js`
- Create: `tests/ui/renderAdSlot.test.js`
- Modify: `src/ui/renderShell.js`
- Modify: `src/main.js`
- Modify: `styles.css`
- Modify: `tests/ui/renderShell.test.js`

- [ ] **Step 1: Write failing ad-slot renderer tests**

Create `tests/ui/renderAdSlot.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { renderAdSlot } from '../../src/ui/renderAdSlot.js';

describe('renderAdSlot', () => {
  it('renders nothing when a slot has no content', () => {
    expect(renderAdSlot({ slotId: 'shell-lead', content: '' })).toBe('');
  });

  it('renders a configured slot with a stable identifier', () => {
    const html = renderAdSlot({
      slotId: 'shell-lead',
      className: 'ad-slot--lead',
      content: '<div>Lead sponsor</div>',
    });

    expect(html).toContain('data-ad-slot="shell-lead"');
    expect(html).toContain('class="ad-slot ad-slot--lead"');
    expect(html).toContain('<div>Lead sponsor</div>');
  });
});
```

- [ ] **Step 2: Run the new ad-slot test to verify it fails**

Run:

```bash
npm test -- tests/ui/renderAdSlot.test.js
```

Expected: FAIL because `src/ui/renderAdSlot.js` does not exist.

- [ ] **Step 3: Implement the explicit ad-slot renderer**

Create `src/ui/renderAdSlot.js`:

```js
function normalizeSlotContent(content) {
  return typeof content === 'string' ? content.trim() : '';
}

export function renderAdSlot({
  slotId,
  className = '',
  content = '',
} = {}) {
  const normalizedContent = normalizeSlotContent(content);

  if (!slotId || !normalizedContent) {
    return '';
  }

  const classes = ['ad-slot', className].filter(Boolean).join(' ');

  return `
    <aside class="${classes}" data-ad-slot="${slotId}">
      <div class="ad-slot-inner">
        ${normalizedContent}
      </div>
    </aside>
  `;
}
```

- [ ] **Step 4: Update shell integration tests for the text wordmark and slot placement**

Edit `tests/ui/renderShell.test.js`:

```js
expect(html).toContain('<h1 class="brand-name">Azzuriva</h1>');
expect(html).toContain('Italian Riviera travel companion');
expect(html).not.toContain('riviera-trasporti-ricerca-percorsi-lockup.png');
```

Add a configured-slot assertion:

```js
it('renders optional lead and utility ad slots in stable positions', () => {
  const html = renderShell('<section>Body</section>', {
    language: 'en',
    languages: SUPPORTED_LANGUAGES,
    adSlots: {
      lead: '<div>Lead sponsor</div>',
      utility: '<div>Utility sponsor</div>',
    },
    t: createTranslator('en'),
  });

  expect(html).toContain('data-ad-slot="shell-lead"');
  expect(html).toContain('data-ad-slot="shell-utility"');
  expect(html.indexOf('data-ad-slot="shell-lead"')).toBeLessThan(html.indexOf('<section>Body</section>'));
  expect(html.indexOf('data-ad-slot="shell-utility"')).toBeGreaterThan(html.indexOf('<section>Body</section>'));
});
```

- [ ] **Step 5: Run the shell tests to verify they fail on the old image lockup**

Run:

```bash
npm test -- tests/ui/renderShell.test.js tests/ui/renderAdSlot.test.js
```

Expected: FAIL because the shell still renders the old image lockup and has no ad-slot integration.

- [ ] **Step 6: Replace the image lockup with a text wordmark and add the inactive ad-slot hooks**

Update `src/ui/renderShell.js`:

```js
import {
  BRAND_NAME,
  BRAND_SITE_URL,
  FEEDBACK_FORM_URL,
} from '../lib/brand.js';
import { renderAdSlot } from './renderAdSlot.js';

function renderBrandLockup(datasetInfo, t) {
  return `
    <div class="brand-lockup-copy">
      <h1 class="brand-name">${BRAND_NAME}</h1>
      <p class="brand-subtitle">${t('shell.subtitle')}</p>
      ${renderFreshnessMarker(datasetInfo, t)}
    </div>
  `;
}

function renderSeoSupportCopy(t) {
  return `
    <section class="seo-support-copy">
      <h2>${t('shell.seoTitle')}</h2>
      <p>${t('shell.seoBody')}</p>
      <p class="seo-support-note">${t('shell.sourceTrustBody')}</p>
    </section>
  `;
}

export function renderShell(
  content,
  {
    language = 'en',
    languages = SUPPORTED_LANGUAGES,
    datasetInfo = null,
    taxiDirectory = [],
    tabNavigation = '',
    adSlots = {},
    t = createTranslator('en'),
  } = {},
) {
  return `
    <div class="app-shell">
      <header class="topbar">
        ${renderBrandLockup(datasetInfo, t)}
        <div class="topbar-actions">
          ...
        </div>
      </header>
      ${tabNavigation}
      ${renderSeoSupportCopy(t)}
      ${renderAdSlot({
        slotId: 'shell-lead',
        className: 'ad-slot--lead',
        content: adSlots.lead,
      })}
      ${content}
      ${renderAdSlot({
        slotId: 'shell-utility',
        className: 'ad-slot--utility',
        content: adSlots.utility,
      })}
      ${renderTaxiOptionsSection(...)}
    </div>
  `;
}
```

Update `src/main.js` where the shell is rendered so the hook is explicit but inactive:

```js
renderShell(parts.join(''), {
  language: state.language,
  languages: SUPPORTED_LANGUAGES,
  datasetInfo: state.metadata,
  taxiDirectory: listTaxiOptions(),
  tabNavigation: renderTabNav({ activeTab: state.activeTab, t }),
  adSlots: {
    lead: '',
    utility: '',
  },
  t,
});
```

Update `styles.css`:

```css
.brand-lockup-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.brand-name {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.9rem);
  line-height: 0.96;
  letter-spacing: -0.04em;
  font-weight: 760;
}

.seo-support-note {
  color: var(--muted);
  font-size: 0.94rem;
}

.ad-slot {
  padding: 18px 20px;
  border-radius: 24px;
  border: 1px solid rgba(62, 39, 24, 0.12);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: var(--shadow);
}

.ad-slot-inner {
  min-height: 72px;
}
```

- [ ] **Step 7: Run the shell tests to verify the wordmark and slot hooks pass**

Run:

```bash
npm test -- tests/ui/renderShell.test.js tests/ui/renderAdSlot.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit the shell rebrand and ad-slot surfaces**

```bash
git add src/ui/renderAdSlot.js tests/ui/renderAdSlot.test.js src/ui/renderShell.js src/main.js styles.css tests/ui/renderShell.test.js
git commit -m "feat: add Azzuriva shell branding and ad-ready slots"
```

## Task 3: Refresh Static HTML, Manifest, And Service Worker Branding

**Files:**

- Modify: `index.html`
- Modify: `manifest.webmanifest`
- Modify: `service-worker.js`
- Modify: `tests/ui/indexHtmlBranding.test.js`
- Modify: `tests/lib/serviceWorker.test.js`

- [ ] **Step 1: Update the static HTML and service-worker tests to the approved brand and cache prefix**

Edit `tests/ui/indexHtmlBranding.test.js`:

```js
expect(html).toContain('<title>Azzuriva</title>');
expect(html).toContain('property="og:title" content="Azzuriva"');
expect(html).toContain('property="og:site_name" content="Azzuriva"');
expect(html).toContain('rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/"');
expect(html).toContain('Azzuriva helps you check direct Riviera Trasporti buses');
expect(html).toContain('Azzuriva is independent');
expect(html).not.toContain('Riviera Trasporti Ricerca Percorsi');
```

Edit `tests/lib/serviceWorker.test.js`:

```js
keys: async () => [
  'azzuriva-route-tools-v0',
  'azzuriva-route-tools-v1',
  'other-static-app',
],
...
expect(deleted).toEqual(['azzuriva-route-tools-v0']);
```

- [ ] **Step 2: Run the static-shell tests to verify they fail**

Run:

```bash
npm test -- tests/ui/indexHtmlBranding.test.js tests/lib/serviceWorker.test.js
```

Expected: FAIL because `index.html` still contains the old brand and the service worker still uses `riviera-route-tools-`.

- [ ] **Step 3: Update the static HTML metadata and crawlable body copy**

Edit `index.html`:

```html
<title>Azzuriva</title>
<meta
  name="description"
  content="Azzuriva helps you check direct Riviera Trasporti buses from the official PDF across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera towns."
/>
<link rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/" />
<meta property="og:title" content="Azzuriva" />
<meta property="og:site_name" content="Azzuriva" />
<meta
  property="og:description"
  content="Independent Italian Riviera travel companion with official Riviera Trasporti PDF trust."
/>
<meta property="og:url" content="https://pualien.github.io/riviera-trasporti-schedules/" />
<meta name="twitter:title" content="Azzuriva" />
<meta
  name="twitter:description"
  content="Independent Italian Riviera travel companion with official Riviera Trasporti PDF trust."
/>
```

Update the JSON-LD and crawlable shell copy:

```html
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "Azzuriva",
      "url": "https://pualien.github.io/riviera-trasporti-schedules/"
    },
    {
      "@type": "WebApplication",
      "name": "Azzuriva",
      "url": "https://pualien.github.io/riviera-trasporti-schedules/",
      "applicationCategory": "TravelApplication"
    }
  ]
}
```

```html
<section>
  <h1>Azzuriva</h1>
  <p>Azzuriva is an independent Italian Riviera travel companion for checking direct Riviera Trasporti buses from the official PDF across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera towns.</p>
  <p>Today the product stays direct-route first: compare departures, inspect the timetable, and keep the official Riviera Trasporti source in view when you need to verify the trip.</p>
  <p>Azzuriva is independent, but its bus timetable guidance still points back to the official Riviera Trasporti PDF.</p>
  <section>
    <h2>All verified taxi numbers</h2>
    <p>Useful fallback taxi contacts across the current Riviera Trasporti coverage.</p>
    ...
  </section>
</section>
```

- [ ] **Step 4: Rebrand the manifest and service-worker cache ownership while keeping the current canonical origin**

Edit `manifest.webmanifest`:

```json
{
  "name": "Azzuriva",
  "short_name": "Azzuriva",
  "description": "Independent Italian Riviera travel companion built around direct Riviera Trasporti timetable lookup.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f7f1ea",
  "theme_color": "#eb4c60",
  "icons": [
    {
      "src": "./assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "./assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

Edit `service-worker.js`:

```js
const CACHE_PREFIX = 'azzuriva-route-tools-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;

const REQUIRED_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/brand/apple-touch-icon.png',
  './assets/brand/favicon-16x16.png',
  './assets/brand/favicon-32x32.png',
  './assets/brand/riviera-trasporti-ricerca-percorsi-android-512.png',
  './assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png',
  './assets/data/trips.json',
  ...
  './src/ui/renderAdSlot.js',
];
```

- [ ] **Step 5: Run the static-shell tests to verify the metadata and cache changes pass**

Run:

```bash
npm test -- tests/ui/indexHtmlBranding.test.js tests/lib/serviceWorker.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit the static-shell and cache rebrand**

```bash
git add index.html manifest.webmanifest service-worker.js tests/ui/indexHtmlBranding.test.js tests/lib/serviceWorker.test.js
git commit -m "feat: rebrand static shell and cache ownership to Azzuriva"
```

## Task 4: Rebrand Package And Documentation Surfaces, Then Verify The Whole App

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md`
- Modify: `assets/brand/README.md`

- [ ] **Step 1: Rebrand the package metadata and repo overview**

Edit `package.json`:

```json
{
  "name": "azzuriva",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build:data": "node scripts/fetch-pdf.mjs && node scripts/extract-pages.mjs && node scripts/build-route-data.mjs"
  }
}
```

Edit the top-level name fields in `package-lock.json`:

```json
{
  "name": "azzuriva",
  "packages": {
    "": {
      "name": "azzuriva",
      ...
    }
  }
}
```

Edit `README.md`:

```md
# azzuriva

Static Italian Riviera travel companion for Riviera Trasporti timetable data, built for GitHub Pages.

Azzuriva turns the official PDF into a calmer direct-route web experience. Instead of manually scanning the timetable, riders can search direct rides such as `Porto Maurizio -> Sanremo`, see the next departures, inspect the full timetable, and keep the official source close at hand for verification.
```

- [ ] **Step 2: Rebrand the product and design-system docs while keeping the direct-route boundary honest**

Edit `PRODUCT.md`:

```md
## Product Purpose

Azzuriva turns the official Riviera Trasporti PDF into an independent, route-first Riviera companion for direct rides. Its primary job is still to help riders find the fastest valid direct-route answer from an origin area to a destination stop, then confirm timing details against the official source with minimal effort and ambiguity.
```

Edit `DESIGN.md` top naming:

```md
name: Azzuriva
description: Independent Riviera mobility companion with direct-route timetable trust.
...
# Design System: Azzuriva
```

Edit `assets/brand/README.md`:

```md
# Azzuriva Brand Assets

Current PNG exports in this folder are legacy raster assets from the earlier product name and remain in use temporarily for favicon, touch-icon, and manifest compatibility.

Brand rules:

- Primary name: `Azzuriva`
- Italian descriptor: `Mobilita e luoghi della Riviera ligure`
- English descriptor: `Italian Riviera travel companion`
- Trust anchor: `Riviera Trasporti` appears only as official-source wording
```

- [ ] **Step 3: Run the full test suite to confirm the rebrand and slot prep did not break the app**

Run:

```bash
npm test
```

Expected: PASS across the full Vitest suite.

- [ ] **Step 4: Review the working tree for unintended historical-doc churn**

Run:

```bash
git status --short
```

Expected: only the planned source, test, package, and documentation files are modified; historical specs/plans are untouched.

- [ ] **Step 5: Commit the package/docs rebrand and green verification**

```bash
git add package.json package-lock.json README.md PRODUCT.md DESIGN.md assets/brand/README.md
git commit -m "docs: rebrand package and product docs to Azzuriva"
```

## Self-Review

### Spec Coverage

- `Azzuriva` becomes the primary brand: covered by Tasks 1-4.
- `Riviera Trasporti` remains source/trust wording: covered by Task 1 copy and Task 3 static HTML.
- Canonical stays on GitHub Pages until the real `.com` is live: covered by Task 3.
- Ad-ready shell zones are added without live ad code: covered by Task 2.
- Conservative AdSense-first preparation without `ads.txt`: covered by Task 2 and Task 3.
- Broader mobility/discovery positioning without pretending to be a full guide: covered by Task 1 copy and Task 4 docs.

### Placeholder Scan

- No `TODO` or `TBD` markers remain.
- Every code-bearing step includes concrete file content or exact snippets.
- Every test step includes an exact `npm test` command and expected outcome.

### Type Consistency

- Shared brand constants stay in `src/lib/brand.js`.
- Metadata helper names remain `buildDefaultSeoMetadata`, `buildRouteSeoMetadata`, and `applySeoMetadata`.
- Ad-slot IDs are consistently `shell-lead` and `shell-utility`.
- Cache prefix is consistently `azzuriva-route-tools-`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-15-azzuriva-rebrand-seo-ads.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
