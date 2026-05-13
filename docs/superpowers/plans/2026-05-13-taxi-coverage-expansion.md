# Taxi Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand taxi fallback coverage from province-only entries to verified destination-aware services, and render covered destination names in the crawlable footer.

**Architecture:** Keep the taxi logic local to the existing client-side modules. Evolve the checked-in taxi registry into service entries with explicit coverage metadata, teach the route lookup to match stop records against that coverage before falling back to province, and render coverage labels in the shared taxi card UI.

**Tech Stack:** Vanilla JavaScript, Vitest, static SPA rendering

---

### Task 1: Expand The Verified Taxi Registry

**Files:**
- Modify: `src/lib/taxiDirectory.js`
- Test: `tests/lib/taxiDirectory.test.js`

- [ ] **Step 1: Write the failing registry tests**

```js
import { describe, expect, it } from 'vitest';
import {
  findTaxiOptionByProvince,
  findTaxiOptionByStop,
  listTaxiOptions,
} from '../../src/lib/taxiDirectory.js';

const stop = (id, canonical) => ({ id, canonical, variants: [] });

describe('taxi directory coverage', () => {
  it('lists verified services with covered destination labels', () => {
    const services = listTaxiOptions();

    expect(services.map((entry) => entry.serviceId)).toEqual([
      'taxi-imperia',
      'mauro-taxi-diano-marina',
      'radio-taxi-sanremo',
      'taxi-ventimiglia',
      'taxi-bordighera',
      'radio-taxi-albenga',
    ]);

    expect(services.find((entry) => entry.serviceId === 'radio-taxi-sanremo')).toMatchObject({
      coverageLabels: expect.arrayContaining(['Sanremo', 'Arma di Taggia', 'Taggia']),
    });

    expect(services.find((entry) => entry.serviceId === 'radio-taxi-albenga')).toMatchObject({
      coverageLabels: expect.arrayContaining(['Andora', 'Albenga']),
    });
  });

  it('returns destination-specific verified services by stop before province fallback', () => {
    expect(findTaxiOptionByStop(stop('diano-marina', 'diano marina'))?.serviceId).toBe('mauro-taxi-diano-marina');
    expect(findTaxiOptionByStop(stop('arma-di-taggia', 'arma di taggia'))?.serviceId).toBe('radio-taxi-sanremo');
    expect(findTaxiOptionByStop(stop('andora-stazione-fs', 'andora stazione fs'))?.serviceId).toBe('radio-taxi-albenga');
  });

  it('keeps province fallback lookups for broad coverage', () => {
    expect(findTaxiOptionByProvince('imperia')?.serviceId).toBe('taxi-imperia');
    expect(findTaxiOptionByProvince('savona')?.serviceId).toBe('radio-taxi-albenga');
  });
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- tests/lib/taxiDirectory.test.js`
Expected: FAIL because `findTaxiOptionByStop` does not exist and service coverage labels are missing.

- [ ] **Step 3: Write the minimal registry implementation**

```js
import { normalizeText } from './normalize.js';

const TAXI_SERVICES = [
  {
    serviceId: 'taxi-imperia',
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Taxi Imperia',
    phones: [{ label: '+39 0183 3785', href: 'tel:+3901833785' }],
    sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
    verifiedAt: '2026-05-13',
    coverageLabels: ['Imperia', 'Porto Maurizio'],
    coverageMatchTokens: ['imperia porto maurizio', 'porto maurizio', 'imperia oneglia'],
    provinceFallback: true,
  },
  {
    serviceId: 'mauro-taxi-diano-marina',
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Mauro Taxi Diano Marina',
    phones: [{ label: '+39 347 0439704', href: 'tel:+393470439704' }],
    bookingUrl: 'https://maurotaxi.it/it/',
    sourceUrl: 'https://maurotaxi.it/it/',
    verifiedAt: '2026-05-13',
    coverageLabels: ['Diano Marina'],
    coverageMatchTokens: ['diano marina', 'd marina'],
  },
];

const PROVINCE_FALLBACKS = new Map(
  TAXI_SERVICES.filter((entry) => entry.provinceFallback).map((entry) => [entry.provinceId, entry]),
);

function stopMatchesCoverage(stop, entry) {
  const canonical = normalizeText(stop?.canonical ?? '');
  return entry.coverageMatchTokens?.some((token) => canonical.includes(normalizeText(token)));
}

export function findTaxiOptionByStop(stop) {
  return TAXI_SERVICES.find((entry) => stopMatchesCoverage(stop, entry)) ?? null;
}

export function findTaxiOptionByProvince(provinceId) {
  return PROVINCE_FALLBACKS.get(provinceId) ?? null;
}

export function listTaxiOptions() {
  return TAXI_SERVICES;
}
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- tests/lib/taxiDirectory.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/taxiDirectory.js tests/lib/taxiDirectory.test.js
git commit -m "feat: expand verified taxi registry"
```

### Task 2: Match Route Endpoints To Verified Taxi Services

**Files:**
- Modify: `src/lib/routeTaxiOptions.js`
- Test: `tests/lib/routeTaxiOptions.test.js`

- [ ] **Step 1: Write the failing route-resolution tests**

```js
import { describe, expect, it } from 'vitest';
import { findTaxiOptionsForRoute } from '../../src/lib/routeTaxiOptions.js';

const stops = [
  { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio', variants: ['porto maurizio'] },
  { id: 'diano-marina', canonical: 'diano marina', variants: [] },
  { id: 'sanremo-autostazione', canonical: 'sanremo autostazione', variants: ['sanremo'] },
  { id: 'arma-di-taggia', canonical: 'arma di taggia', variants: [] },
  { id: 'andora-stazione-fs', canonical: 'andora stazione fs', variants: ['andora'] },
];

describe('findTaxiOptionsForRoute', () => {
  it('prefers destination-specific services for named endpoints', () => {
    const options = findTaxiOptionsForRoute({
      fromInput: 'Diano Marina',
      fromStopId: 'diano-marina',
      toInput: 'Sanremo',
      toStopId: 'sanremo-autostazione',
      stops,
    });

    expect(options.map((entry) => entry.serviceId)).toEqual([
      'mauro-taxi-diano-marina',
      'radio-taxi-sanremo',
    ]);
  });

  it('keeps a province fallback when one endpoint has no destination-specific service', () => {
    const options = findTaxiOptionsForRoute({
      fromInput: 'Porto Maurizio',
      fromStopId: 'imperia-porto-maurizio',
      toInput: 'Andora',
      toStopId: 'andora-stazione-fs',
      stops,
    });

    expect(options.map((entry) => entry.serviceId)).toEqual([
      'taxi-imperia',
      'radio-taxi-albenga',
    ]);
  });

  it('deduplicates identical services across both endpoints', () => {
    const options = findTaxiOptionsForRoute({
      fromInput: 'Sanremo',
      fromStopId: 'sanremo-autostazione',
      toInput: 'Arma di Taggia',
      toStopId: 'arma-di-taggia',
      stops,
    });

    expect(options.map((entry) => entry.serviceId)).toEqual(['radio-taxi-sanremo']);
  });
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- tests/lib/routeTaxiOptions.test.js`
Expected: FAIL because the route lookup still returns province ids only.

- [ ] **Step 3: Write the minimal route-matching implementation**

```js
import { findExactStopMatch } from './localities.js';
import { resolveProvinceForStop } from './provinceLookup.js';
import { findTaxiOptionByProvince, findTaxiOptionByStop } from './taxiDirectory.js';

function resolveTaxiOptionForStop(stop, stops) {
  if (!stop) {
    return null;
  }

  return (
    findTaxiOptionByStop(stop)
    ?? findTaxiOptionByProvince(resolveProvinceForStop(stop.id, stops))
  );
}

export function findTaxiOptionsForRoute({ fromInput = '', fromStopId = null, toInput = '', toStopId = null, stops = [] }) {
  const endpointStops = [
    resolveSelectedStop({ stopId: fromStopId, inputValue: fromInput, stops }),
    resolveSelectedStop({ stopId: toStopId, inputValue: toInput, stops }),
  ].filter(Boolean);

  const options = endpointStops
    .map((stop) => resolveTaxiOptionForStop(stop, stops))
    .filter(Boolean);

  return [...new Map(options.map((entry) => [entry.serviceId, entry])).values()];
}
```

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm test -- tests/lib/routeTaxiOptions.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/routeTaxiOptions.js tests/lib/routeTaxiOptions.test.js
git commit -m "feat: resolve route taxis by verified destination coverage"
```

### Task 3: Render Covered Destination Names In Taxi Cards And Footer

**Files:**
- Modify: `src/ui/renderTaxiOption.js`
- Modify: `tests/ui/renderShell.test.js`
- Modify: `tests/ui/renderResults.test.js`
- Modify: `tests/ui/renderNoDirectFallback.test.js`

- [ ] **Step 1: Write the failing UI tests**

```js
it('renders covered destination labels in the shell taxi directory', () => {
  const html = renderShell('<section>Body</section>', {
    language: 'en',
    languages: SUPPORTED_LANGUAGES,
    taxiDirectory: [
      {
        serviceId: 'radio-taxi-sanremo',
        provinceLabel: 'Provincia di Imperia',
        serviceLabel: 'Radio Taxi Sanremo',
        phones: [{ label: '+39 0184 541454', href: 'tel:+390184541454' }],
        sourceUrl: 'https://radiotaxisanremo.com/',
        verifiedAt: '2026-05-13',
        coverageLabels: ['Sanremo', 'Arma di Taggia', 'Taggia'],
      },
    ],
    t: createTranslator('en'),
  });

  expect(html).toContain('Sanremo');
  expect(html).toContain('Arma di Taggia');
  expect(html).toContain('Taggia');
});

it('renders destination-aware route taxi cards in results', () => {
  const html = renderResultsView({
    routeLabel: 'Diano Marina -> Sanremo',
    summary: { lines: ['12'], nextDeparture: null, soonestArrival: null, lastDepartureTime: '19:20', averageDurationMinutes: 52, serviceEnded: false },
    nextDepartures: [],
    allDepartures: [],
    taxiOptions: [
      {
        serviceId: 'mauro-taxi-diano-marina',
        provinceLabel: 'Provincia di Imperia',
        serviceLabel: 'Mauro Taxi Diano Marina',
        phones: [{ label: '+39 347 0439704', href: 'tel:+393470439704' }],
        sourceUrl: 'https://maurotaxi.it/it/',
        verifiedAt: '2026-05-13',
        coverageLabels: ['Diano Marina'],
      },
    ],
  });

  expect(html).toContain('Diano Marina');
});
```

- [ ] **Step 2: Run the targeted UI tests to verify they fail**

Run: `npm test -- tests/ui/renderShell.test.js tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js`
Expected: FAIL because the shared taxi renderer does not output coverage labels.

- [ ] **Step 3: Write the minimal shared rendering update**

```js
function renderCoverageLabels(taxiOption) {
  if (!Array.isArray(taxiOption.coverageLabels) || !taxiOption.coverageLabels.length) {
    return '';
  }

  return `
    <p class="taxi-option-coverage">
      ${escapeHtml(taxiOption.coverageLabels.join(', '))}
    </p>
  `;
}

export function renderTaxiOption(taxiOption, { t = createTranslator('en') } = {}) {
  return `
    <aside class="taxi-option-card">
      <p class="eyebrow">${escapeHtml(t('taxi.eyebrow'))}</p>
      <h3>${escapeHtml(taxiOption.serviceLabel)}</h3>
      <p>${escapeHtml(t('taxi.copy', { province: taxiOption.provinceLabel }))}</p>
      ${renderCoverageLabels(taxiOption)}
      <div class="taxi-option-actions">...</div>
      <p class="taxi-option-meta">...</p>
    </aside>
  `;
}
```

- [ ] **Step 4: Run the targeted UI tests to verify they pass**

Run: `npm test -- tests/ui/renderShell.test.js tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS with all tests green

- [ ] **Step 6: Commit**

```bash
git add src/ui/renderTaxiOption.js tests/ui/renderShell.test.js tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js
git commit -m "feat: show destination coverage in taxi fallback UI"
```
