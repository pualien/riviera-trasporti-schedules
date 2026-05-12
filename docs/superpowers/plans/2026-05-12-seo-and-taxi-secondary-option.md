# SEO And Taxi Secondary Option Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the SPA's default SEO surface and add a verified taxi secondary option on direct-result and no-direct search outcomes when the selected destination can be mapped to a province with curated taxi coverage.

**Architecture:** Add small pure modules for province resolution, taxi data lookup, and runtime SEO metadata management, then thread their outputs into `main.js`, the shell renderer, and the existing results/fallback renderers. Keep all external transport contacts curated in source control with verification dates and source URLs; do not fetch them at runtime.

**Tech Stack:** Static HTML, vanilla JavaScript modules, Vitest, GitHub Pages deployment, curated web-verified taxi source URLs.

---

## File Structure

- Create: `src/lib/taxiDirectory.js`
- Create: `src/lib/provinceLookup.js`
- Create: `src/lib/seo.js`
- Create: `src/ui/renderTaxiOption.js`
- Create: `tests/lib/taxiDirectory.test.js`
- Create: `tests/lib/provinceLookup.test.js`
- Create: `tests/lib/seo.test.js`
- Modify: `src/main.js`
- Modify: `src/ui/renderResults.js`
- Modify: `src/ui/renderNoDirectFallback.js`
- Modify: `src/ui/renderShell.js`
- Modify: `src/lib/i18n.js`
- Modify: `src/lib/brand.js`
- Modify: `styles.css`
- Modify: `index.html`
- Modify: `tests/ui/renderResults.test.js`
- Modify: `tests/ui/renderNoDirectFallback.test.js`
- Modify: `tests/ui/renderShell.test.js`
- Modify: `tests/ui/indexHtmlBranding.test.js`

## Implementation Notes

- Use the destination stop id as the primary lookup input for taxi coverage, with a checked-in rule layer that maps current dataset stop patterns to `imperia` or `savona`.
- Curated taxi coverage starts with:
  - Imperia: Comune di Imperia taxi page, phone `+39 0183 3785`
  - Savona-province destinations in the current dataset: Radio Taxi Albenga, phone `+39 328 7254729`
- Use the repository GitHub Pages URL as the canonical app URL: `https://pualien.github.io/riviera-trasporti-schedules/`
- Keep runtime SEO updates limited to `document.title`, `meta[name="description"]`, `meta[property="og:title"]`, `meta[property="og:description"]`, `meta[name="twitter:title"]`, and `meta[name="twitter:description"]`.
- Do not change search or routing behavior beyond attaching taxi data and updating metadata after searches.

### Task 1: Add Province Resolution And Curated Taxi Data

**Files:**
- Create: `src/lib/taxiDirectory.js`
- Create: `src/lib/provinceLookup.js`
- Create: `tests/lib/taxiDirectory.test.js`
- Create: `tests/lib/provinceLookup.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/taxiDirectory.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { findTaxiOptionByProvince } from '../../src/lib/taxiDirectory.js';

describe('findTaxiOptionByProvince', () => {
  it('returns the curated Imperia and Savona taxi options', () => {
    expect(findTaxiOptionByProvince('imperia')).toMatchObject({
      provinceId: 'imperia',
      phone: '+39 0183 3785',
      sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
      verifiedAt: '2026-05-12',
    });

    expect(findTaxiOptionByProvince('savona')).toMatchObject({
      provinceId: 'savona',
      phone: '+39 328 7254729',
      sourceUrl: 'https://www.radiotaxialbenga.it/',
      verifiedAt: '2026-05-12',
    });
  });

  it('returns null for provinces without curated coverage', () => {
    expect(findTaxiOptionByProvince('genova')).toBeNull();
  });
});
```

Create `tests/lib/provinceLookup.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { resolveProvinceForStop } from '../../src/lib/provinceLookup.js';

const stops = [
  { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
  { id: 'andora-stazione-fs', canonical: 'andora stazione fs' },
  { id: 'albenga', canonical: 'albenga' },
  { id: 'bastia-/-leca', canonical: 'bastia / leca' },
  { id: 'mystery-stop', canonical: 'mystery stop' },
];

describe('resolveProvinceForStop', () => {
  it('maps current destination stop patterns to Imperia or Savona', () => {
    expect(resolveProvinceForStop('sanremo-autostazione', stops)).toBe('imperia');
    expect(resolveProvinceForStop('andora-stazione-fs', stops)).toBe('savona');
    expect(resolveProvinceForStop('albenga', stops)).toBe('savona');
    expect(resolveProvinceForStop('bastia-/-leca', stops)).toBe('savona');
  });

  it('returns null when the stop cannot be mapped', () => {
    expect(resolveProvinceForStop('mystery-stop', stops)).toBeNull();
    expect(resolveProvinceForStop(null, stops)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run tests/lib/taxiDirectory.test.js tests/lib/provinceLookup.test.js
```

Expected: FAIL with module-resolution errors because the new lookup modules do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/taxiDirectory.js`:

```js
const TAXI_DIRECTORY = {
  imperia: {
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Taxi Imperia',
    phone: '+39 0183 3785',
    callHref: 'tel:+3901833785',
    bookingUrl: null,
    sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
    verifiedAt: '2026-05-12',
  },
  savona: {
    provinceId: 'savona',
    provinceLabel: 'Provincia di Savona',
    serviceLabel: 'Radio Taxi Albenga',
    phone: '+39 328 7254729',
    callHref: 'tel:+393287254729',
    bookingUrl: 'https://www.taxialbenga.it/contatti/',
    sourceUrl: 'https://www.radiotaxialbenga.it/',
    verifiedAt: '2026-05-12',
  },
};

export function findTaxiOptionByProvince(provinceId) {
  return TAXI_DIRECTORY[provinceId] ?? null;
}
```

Create `src/lib/provinceLookup.js`:

```js
const SAVONA_PATTERNS = [
  /^andora/,
  /^albenga$/,
  /^ortovero$/,
  /^bastia-\/-leca$/,
  /^leca-\/-bastia$/,
];

const IMPERIA_PATTERNS = [
  /^imperia/,
  /^sanremo/,
  /^ventimiglia/,
  /^bordighera/,
  /^taggia/,
  /^arma/,
  /^ospedaletti/,
  /^vallecrosia/,
  /^camporosso/,
  /^dolceacqua/,
];

function matchesAny(stopId, patterns) {
  return patterns.some((pattern) => pattern.test(stopId));
}

export function resolveProvinceForStop(stopId, stops = []) {
  if (!stopId) {
    return null;
  }

  if (matchesAny(stopId, SAVONA_PATTERNS)) {
    return 'savona';
  }

  if (matchesAny(stopId, IMPERIA_PATTERNS)) {
    return 'imperia';
  }

  const stop = stops.find((entry) => entry.id === stopId);
  if (!stop) {
    return null;
  }

  const canonical = stop.canonical ?? '';

  if (canonical.startsWith('andora') || canonical.startsWith('albenga') || canonical.includes('leca')) {
    return 'savona';
  }

  if (
    canonical.startsWith('imperia')
    || canonical.startsWith('sanremo')
    || canonical.startsWith('ventimiglia')
    || canonical.startsWith('bordighera')
  ) {
    return 'imperia';
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run tests/lib/taxiDirectory.test.js tests/lib/provinceLookup.test.js
```

Expected: PASS for both new test files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/taxiDirectory.js src/lib/provinceLookup.js tests/lib/taxiDirectory.test.js tests/lib/provinceLookup.test.js
git commit -m "feat: add taxi directory and province lookup"
```

### Task 2: Render The Taxi Secondary Option In Results And Fallback States

**Files:**
- Create: `src/ui/renderTaxiOption.js`
- Modify: `src/ui/renderResults.js`
- Modify: `src/ui/renderNoDirectFallback.js`
- Modify: `src/lib/i18n.js`
- Modify: `styles.css`
- Modify: `src/main.js`
- Modify: `tests/ui/renderResults.test.js`
- Modify: `tests/ui/renderNoDirectFallback.test.js`

- [ ] **Step 1: Write the failing renderer tests**

Update `tests/ui/renderResults.test.js` with a taxi assertion:

```js
it('renders a taxi secondary option card when curated coverage exists', () => {
  const html = renderResultsView({
    t: createTranslator('en'),
    routeLabel: 'Porto Maurizio -> Sanremo',
    pdfUrl: 'https://example.com/riviera.pdf',
    summary: {
      serviceEnded: false,
      nextDeparture: { departureTime: '16:45' },
      soonestArrival: { arrivalTime: '17:25' },
      lastDepartureTime: '19:45',
      averageDurationMinutes: 39,
      lines: ['12'],
    },
    nextDepartures: [],
    allDepartures: [],
    taxiOption: {
      provinceLabel: 'Provincia di Imperia',
      serviceLabel: 'Taxi Imperia',
      phone: '+39 0183 3785',
      callHref: 'tel:+3901833785',
      sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
      verifiedAt: '2026-05-12',
    },
  });

  expect(html).toContain('Secondary option');
  expect(html).toContain('Taxi Imperia');
  expect(html).toContain('tel:+3901833785');
  expect(html).toContain('2026-05-12');
});
```

Update `tests/ui/renderNoDirectFallback.test.js`:

```js
it('renders the taxi secondary option when fallback taxi coverage exists', () => {
  const html = renderNoDirectFallback({
    t: createTranslator('en'),
    routeLabel: 'Porto Maurizio -> Sanremo',
    pdfUrl: 'https://example.com/riviera.pdf',
    suggestions: [],
    taxiOption: {
      provinceLabel: 'Provincia di Imperia',
      serviceLabel: 'Taxi Imperia',
      phone: '+39 0183 3785',
      callHref: 'tel:+3901833785',
      sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
      verifiedAt: '2026-05-12',
    },
  });

  expect(html).toContain('Secondary option');
  expect(html).toContain('Taxi Imperia');
  expect(html).toContain('tel:+3901833785');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js
```

Expected: FAIL because `renderResultsView()` and `renderNoDirectFallback()` do not render taxi content yet.

- [ ] **Step 3: Write the minimal implementation**

Create `src/ui/renderTaxiOption.js`:

```js
import { createTranslator } from '../lib/i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderTaxiOption(taxiOption, { t = createTranslator('en') } = {}) {
  if (!taxiOption) {
    return '';
  }

  return `
    <aside class="taxi-option-card">
      <p class="eyebrow">${escapeHtml(t('taxi.eyebrow'))}</p>
      <h3>${escapeHtml(taxiOption.serviceLabel)}</h3>
      <p>${escapeHtml(t('taxi.copy', { province: taxiOption.provinceLabel }))}</p>
      <div class="taxi-option-actions">
        <a class="topbar-link" href="${taxiOption.callHref}">${escapeHtml(t('taxi.call'))} ${escapeHtml(taxiOption.phone)}</a>
        ${taxiOption.bookingUrl ? `<a class="topbar-link" href="${taxiOption.bookingUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('taxi.bookOnline'))}</a>` : ''}
      </div>
      <p class="taxi-option-meta">
        <a href="${taxiOption.sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('taxi.source'))}</a>
        · ${escapeHtml(t('taxi.verified', { date: taxiOption.verifiedAt }))}
      </p>
    </aside>
  `;
}
```

Update `src/ui/renderResults.js`:

```js
import { renderTaxiOption } from './renderTaxiOption.js';

export function renderResultsView({
  // existing props...
  taxiOption = null,
}) {
  return `
    <section class="results-shell">
      <article class="summary-card">
        <!-- existing summary -->
        ${renderSummaryMetrics(summary, t)}
        ${renderTaxiOption(taxiOption, { t })}
      </article>
      <!-- existing sections -->
    </section>
  `;
}
```

Update `src/ui/renderNoDirectFallback.js`:

```js
import { renderTaxiOption } from './renderTaxiOption.js';

export function renderNoDirectFallback({
  t = createTranslator('en'),
  routeLabel,
  pdfUrl,
  suggestions = [],
  taxiOption = null,
}) {
  return `
    <section class="empty-state empty-state--fallback">
      <!-- existing fallback copy -->
      <div class="fallback-suggestions">
        ${suggestions.map((suggestion) => `<span class="picker-panel-tag">${escapeHtml(suggestion.label)}</span>`).join('')}
      </div>
      ${renderTaxiOption(taxiOption, { t })}
    </section>
  `;
}
```

Add translation keys in `src/lib/i18n.js` for every language:

```js
'taxi.eyebrow': 'Secondary option',
'taxi.copy': 'If you need a fallback in {province}, you can call a verified taxi contact.',
'taxi.call': 'Call',
'taxi.bookOnline': 'Book online',
'taxi.source': 'Source',
'taxi.verified': 'Verified {date}',
```

Update `src/main.js` so both search outcomes receive `taxiOption`:

```js
import { resolveProvinceForStop } from './lib/provinceLookup.js';
import { findTaxiOptionByProvince } from './lib/taxiDirectory.js';

function currentTaxiOption() {
  const provinceId = resolveProvinceForStop(state.formValues.toStopId, state.stops);
  return findTaxiOptionByProvince(provinceId);
}

// inside renderApp()
const taxiOption = currentTaxiOption();

// pass `taxiOption` into both renderResultsView() and renderNoDirectFallback()
```

Add card styles in `styles.css`:

```css
.taxi-option-card {
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.82);
  display: grid;
  gap: 10px;
}

.taxi-option-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.taxi-option-meta {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js
```

Expected: PASS with the new taxi card assertions and the existing results/fallback assertions still green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/renderTaxiOption.js src/ui/renderResults.js src/ui/renderNoDirectFallback.js src/lib/i18n.js src/main.js styles.css tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js
git commit -m "feat: render taxi secondary option in search outcomes"
```

### Task 3: Strengthen Static SEO And Add Runtime Metadata Updates

**Files:**
- Create: `src/lib/seo.js`
- Modify: `src/lib/brand.js`
- Modify: `src/ui/renderShell.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Modify: `tests/ui/renderShell.test.js`
- Modify: `tests/ui/indexHtmlBranding.test.js`
- Create: `tests/lib/seo.test.js`

- [ ] **Step 1: Write the failing SEO tests**

Create `tests/lib/seo.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { applySeoMetadata, buildRouteSeoMetadata, buildDefaultSeoMetadata } from '../../src/lib/seo.js';

describe('seo metadata helpers', () => {
  it('builds default and route-aware metadata', () => {
    expect(buildDefaultSeoMetadata()).toMatchObject({
      title: 'Riviera Trasporti Ricerca Percorsi',
    });

    expect(buildRouteSeoMetadata({
      from: 'Porto Maurizio',
      to: 'Sanremo',
      dayTypeLabel: 'Weekday',
    })).toMatchObject({
      title: 'Porto Maurizio to Sanremo | Riviera Trasporti Ricerca Percorsi',
    });
  });

  it('applies metadata to title, description, og, and twitter tags', () => {
    document.head.innerHTML = `
      <meta name="description" content="old" />
      <meta property="og:title" content="old" />
      <meta property="og:description" content="old" />
      <meta name="twitter:title" content="old" />
      <meta name="twitter:description" content="old" />
    `;

    applySeoMetadata(document, {
      title: 'New Title',
      description: 'New description',
    });

    expect(document.title).toBe('New Title');
    expect(document.querySelector('meta[name="description"]').content).toBe('New description');
    expect(document.querySelector('meta[property="og:title"]').content).toBe('New Title');
    expect(document.querySelector('meta[name="twitter:description"]').content).toBe('New description');
  });
});
```

Update `tests/ui/indexHtmlBranding.test.js`:

```js
it('includes canonical, description, social metadata, and crawlable shell copy', () => {
  expect(html).toContain('rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/"');
  expect(html).toContain('name="description"');
  expect(html).toContain('property="og:title"');
  expect(html).toContain('name="twitter:card" content="summary_large_image"');
  expect(html).toContain('official Riviera Trasporti PDF');
  expect(html).toContain('Imperia, Sanremo, Ventimiglia, Andora');
});
```

Update `tests/ui/renderShell.test.js`:

```js
it('renders supporting crawlable network copy in the shell', () => {
  const html = renderShell('<section>Body</section>', {
    language: 'en',
    languages: SUPPORTED_LANGUAGES,
    t: createTranslator('en'),
  });

  expect(html).toContain('Riviera Trasporti bus timetable');
  expect(html).toContain('Imperia');
  expect(html).toContain('Andora');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run tests/lib/seo.test.js tests/ui/indexHtmlBranding.test.js tests/ui/renderShell.test.js
```

Expected: FAIL because the SEO helper does not exist and the static shell/head metadata is still minimal.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/seo.js`:

```js
const DEFAULT_TITLE = 'Riviera Trasporti Ricerca Percorsi';
const DEFAULT_DESCRIPTION = 'Search direct Riviera Trasporti bus timetables faster than scanning the official PDF across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera destinations.';

export function buildDefaultSeoMetadata() {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  };
}

export function buildRouteSeoMetadata({ from, to, dayTypeLabel }) {
  return {
    title: `${from} to ${to} | ${DEFAULT_TITLE}`,
    description: `Direct Riviera Trasporti timetable lookup for ${from} to ${to} on ${dayTypeLabel}. Compare next departures, full schedules, and taxi fallback options from the official PDF dataset.`,
  };
}

export function applySeoMetadata(doc, { title, description }) {
  doc.title = title;
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
  ]) {
    const element = doc.querySelector(selector);
    if (!element) {
      continue;
    }

    if (selector.includes('title')) {
      element.setAttribute('content', title);
    } else {
      element.setAttribute('content', description);
    }
  }

  const descriptionMeta = doc.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    descriptionMeta.setAttribute('content', description);
  }
}
```

Update `src/lib/brand.js`:

```js
export const APP_SITE_URL = 'https://pualien.github.io/riviera-trasporti-schedules/';
```

Update `src/ui/renderShell.js` to append a crawlable support block:

```js
function renderSeoSupportCopy(t) {
  return `
    <section class="seo-support-copy">
      <h2>${t('shell.seoTitle')}</h2>
      <p>${t('shell.seoBody')}</p>
    </section>
  `;
}

export function renderShell(content, options = {}) {
  // existing shell
  return `
    <div class="app-shell">
      <!-- existing topbar -->
      ${renderSeoSupportCopy(t)}
      ${content}
    </div>
  `;
}
```

Update `src/main.js`:

```js
import {
  applySeoMetadata,
  buildDefaultSeoMetadata,
  buildRouteSeoMetadata,
} from './lib/seo.js';

function updateSeoForCurrentState(t) {
  if (!state.formValues.fromInput || !state.formValues.toInput) {
    applySeoMetadata(document, buildDefaultSeoMetadata());
    return;
  }

  const dayTypeLabel = t(`search.dayType.${state.formValues.dayType}`);
  applySeoMetadata(document, buildRouteSeoMetadata({
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    dayTypeLabel,
  }));
}

// call `updateSeoForCurrentState(t)` at the end of renderApp()
```

Update `index.html` head and initial body:

```html
<title>Riviera Trasporti Ricerca Percorsi</title>
<meta
  name="description"
  content="Search direct Riviera Trasporti bus timetables faster than scanning the official PDF across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera destinations."
/>
<link rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/" />
<meta property="og:title" content="Riviera Trasporti Ricerca Percorsi" />
<meta property="og:description" content="Search direct Riviera Trasporti bus timetables faster than scanning the official PDF." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://pualien.github.io/riviera-trasporti-schedules/" />
<meta property="og:image" content="https://pualien.github.io/riviera-trasporti-schedules/assets/brand/riviera-trasporti-ricerca-percorsi-ios-1024.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Riviera Trasporti Ricerca Percorsi" />
<meta name="twitter:description" content="Search direct Riviera Trasporti bus timetables faster than scanning the official PDF." />
<script type="application/ld+json">
  {"@context":"https://schema.org","@type":"WebApplication","name":"Riviera Trasporti Ricerca Percorsi","url":"https://pualien.github.io/riviera-trasporti-schedules/","applicationCategory":"TravelApplication"}
</script>
```

And replace the empty app root with crawlable fallback content:

```html
<div id="app">
  <section>
    <h1>Riviera Trasporti Ricerca Percorsi</h1>
    <p>Search direct Riviera Trasporti bus timetables from the official Riviera Trasporti PDF across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera destinations.</p>
    <p>This single-page tool focuses on direct bus routes, next departures, and trusted fallback guidance.</p>
  </section>
</div>
```

Add translation keys in `src/lib/i18n.js`:

```js
'shell.seoTitle': 'Riviera Trasporti bus timetable lookup',
'shell.seoBody': 'Browse direct Riviera Trasporti bus times from the official PDF for trips across Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera destinations.',
```

Add supporting shell styles:

```css
.seo-support-copy {
  padding: 20px 24px;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  background: rgba(255, 251, 247, 0.7);
  box-shadow: var(--shadow);
}

.seo-support-copy h2,
.seo-support-copy p {
  margin: 0;
}

.seo-support-copy {
  display: grid;
  gap: 8px;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run tests/lib/seo.test.js tests/ui/indexHtmlBranding.test.js tests/ui/renderShell.test.js
```

Expected: PASS for the new SEO helper tests and the stronger static shell/head assertions.

- [ ] **Step 5: Run the full suite and commit**

Run:

```bash
npm test
```

Expected: PASS with all existing and new tests green.

Commit:

```bash
git add src/lib/seo.js src/lib/brand.js src/ui/renderShell.js src/main.js src/lib/i18n.js styles.css index.html tests/lib/seo.test.js tests/ui/indexHtmlBranding.test.js tests/ui/renderShell.test.js
git commit -m "feat: improve SEO metadata and shell copy"
```

## Self-Review

- Spec coverage: taxi registry, province resolution, taxi rendering in both outcomes, static SEO metadata, crawlable shell copy, and runtime metadata updates are each covered by Tasks 1-3.
- Placeholder scan: no `TBD`, `TODO`, or unresolved “appropriate handling” language remains in the task steps.
- Type consistency: the plan consistently uses `findTaxiOptionByProvince`, `resolveProvinceForStop`, `renderTaxiOption`, `buildDefaultSeoMetadata`, `buildRouteSeoMetadata`, and `applySeoMetadata`.
