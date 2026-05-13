# Taxi Single Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render all taxi contacts inside one shared panel instead of multiple standalone cards in results, no-direct fallback, and the footer directory.

**Architecture:** Keep all current taxi data and matching logic unchanged. Limit the patch to the shared taxi renderer and its CSS so every caller automatically gets the new single-panel presentation, then update the existing UI tests to pin the new markup and structure.

**Tech Stack:** Vanilla JavaScript, Vitest, static HTML rendering, CSS

---

### Task 1: Pin The Single-Panel Markup In UI Tests

**Files:**
- Modify: `tests/ui/renderResults.test.js`
- Modify: `tests/ui/renderNoDirectFallback.test.js`
- Modify: `tests/ui/renderShell.test.js`

- [ ] **Step 1: Write the failing test expectations for one shared panel**

```js
it('renders taxi route options inside one shared panel', () => {
  const html = renderResultsView({
    t: createTranslator('en'),
    routeLabel: 'Diano Marina -> Sanremo',
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
    taxiOptions: [
      {
        serviceId: 'mauro-taxi-diano-marina',
        provinceId: 'imperia',
        provinceLabel: 'Provincia di Imperia',
        serviceLabel: 'Mauro Taxi Diano Marina',
        phone: '+39 347 0439704',
        phones: [{ label: '+39 347 0439704', href: 'tel:+393470439704' }],
        sourceUrl: 'https://maurotaxi.it/it/',
        verifiedAt: '2026-05-13',
        coverageLabels: ['Diano Marina'],
      },
      {
        serviceId: 'radio-taxi-sanremo',
        provinceId: 'imperia',
        provinceLabel: 'Provincia di Imperia',
        serviceLabel: 'Radio Taxi Sanremo',
        phone: '+39 0184 541454',
        phones: [{ label: '+39 0184 541454', href: 'tel:+390184541454' }],
        sourceUrl: 'https://radiotaxisanremo.com/',
        verifiedAt: '2026-05-13',
        coverageLabels: ['Sanremo', 'Arma di Taggia', 'Taggia'],
      },
    ],
  });

  expect(html).toContain('class="taxi-panel"');
  expect((html.match(/class="taxi-panel-entry"/g) ?? [])).toHaveLength(2);
  expect(html).not.toContain('class="taxi-option-card"');
});
```

```js
it('renders the footer taxi directory as one shared panel', () => {
  const html = renderShell('<section>Body</section>', {
    language: 'en',
    languages: SUPPORTED_LANGUAGES,
    taxiDirectory: [
      {
        serviceId: 'taxi-imperia',
        provinceId: 'imperia',
        provinceLabel: 'Provincia di Imperia',
        serviceLabel: 'Taxi Imperia',
        phone: '+39 0183 3785',
        phones: [{ label: '+39 0183 3785', href: 'tel:+3901833785' }],
        sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
        verifiedAt: '2026-05-13',
        coverageLabels: ['Imperia', 'Porto Maurizio'],
      },
      {
        serviceId: 'radio-taxi-albenga',
        provinceId: 'savona',
        provinceLabel: 'Provincia di Savona',
        serviceLabel: 'Radio Taxi Albenga',
        phone: '+39 328 7254729',
        phones: [
          { label: '+39 328 7254729', href: 'tel:+393287254729' },
          { label: '+39 0182 0303', href: 'tel:+3901820303' },
        ],
        sourceUrl: 'https://www.radiotaxialbenga.it/',
        verifiedAt: '2026-05-13',
        coverageLabels: ['Andora', 'Albenga'],
      },
    ],
    t: createTranslator('en'),
  });

  expect((html.match(/class="taxi-panel"/g) ?? [])).toHaveLength(1);
  expect((html.match(/class="taxi-panel-entry"/g) ?? [])).toHaveLength(2);
  expect(html).not.toContain('class="taxi-option-card"');
});
```

```js
it('renders no-direct fallback taxi options inside one shared panel', () => {
  const html = renderNoDirectFallback({
    t: createTranslator('en'),
    routeLabel: 'Porto Maurizio -> Sanremo',
    pdfUrl: 'https://example.com/riviera.pdf',
    suggestions: [],
    taxiOptions: [
      {
        serviceId: 'radio-taxi-sanremo',
        provinceId: 'imperia',
        provinceLabel: 'Provincia di Imperia',
        serviceLabel: 'Radio Taxi Sanremo',
        phone: '+39 0184 541454',
        phones: [{ label: '+39 0184 541454', href: 'tel:+390184541454' }],
        sourceUrl: 'https://radiotaxisanremo.com/',
        verifiedAt: '2026-05-13',
        coverageLabels: ['Sanremo', 'Arma di Taggia', 'Taggia'],
      },
    ],
  });

  expect((html.match(/class="taxi-panel"/g) ?? [])).toHaveLength(1);
  expect((html.match(/class="taxi-panel-entry"/g) ?? [])).toHaveLength(1);
  expect(html).not.toContain('class="taxi-option-card"');
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js tests/ui/renderShell.test.js`

Expected: FAIL because the current renderer still outputs `taxi-option-card` entries inside a grid instead of one `taxi-panel` with `taxi-panel-entry` rows.

- [ ] **Step 3: Inspect the red diff before moving to implementation**

```bash
git diff -- tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js tests/ui/renderShell.test.js
```

Expected: test-only diff showing the new single-panel assertions.

### Task 2: Replace Card Grid Rendering With One Shared Taxi Panel

**Files:**
- Modify: `src/ui/renderTaxiOption.js`
- Modify: `styles.css`
- Test: `tests/ui/renderResults.test.js`
- Test: `tests/ui/renderNoDirectFallback.test.js`
- Test: `tests/ui/renderShell.test.js`

- [ ] **Step 1: Implement the shared panel markup in the taxi renderer**

Update `src/ui/renderTaxiOption.js` so the section wrapper renders one panel and each service renders a compact internal entry:

```js
function renderCoverageLabels(taxiOption) {
  if (!Array.isArray(taxiOption.coverageLabels) || !taxiOption.coverageLabels.length) {
    return '';
  }

  return `
    <p class="taxi-panel-entry-coverage">${escapeHtml(taxiOption.coverageLabels.join(' · '))}</p>
  `;
}

export function renderTaxiOption(taxiOption, { t = createTranslator('en') } = {}) {
  if (!taxiOption) {
    return '';
  }

  const phoneEntries = resolvePhoneEntries(taxiOption);

  return `
    <article class="taxi-panel-entry">
      <div class="taxi-panel-entry-copy">
        <p class="eyebrow">${escapeHtml(t('taxi.eyebrow'))}</p>
        <h4>${escapeHtml(taxiOption.serviceLabel)}</h4>
        <p>${escapeHtml(t('taxi.copy', { province: taxiOption.provinceLabel }))}</p>
        ${renderCoverageLabels(taxiOption)}
      </div>
      <div class="taxi-panel-entry-actions">
        ${phoneEntries.map((phoneEntry) => `
          <a class="topbar-link" href="${phoneEntry.href}">${escapeHtml(t('taxi.call'))} ${escapeHtml(phoneEntry.label)}</a>
        `).join('')}
        ${taxiOption.bookingUrl
    ? `<a class="topbar-link" href="${taxiOption.bookingUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('taxi.bookOnline'))}</a>`
    : ''}
      </div>
      <p class="taxi-panel-entry-meta">
        <a href="${taxiOption.sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(t('taxi.source'))}</a>
        · ${escapeHtml(t('taxi.verified', { date: taxiOption.verifiedAt }))}
      </p>
    </article>
  `;
}

export function renderTaxiOptionsSection(taxiOptions = [], {
  t = createTranslator('en'),
  titleKey = 'taxi.routeTitle',
  bodyKey = null,
  className = 'taxi-options-section',
} = {}) {
  if (!taxiOptions.length) {
    return '';
  }

  return `
    <section class="${className}">
      <div class="taxi-section-head">
        <h3>${escapeHtml(t(titleKey))}</h3>
        ${bodyKey ? `<p>${escapeHtml(t(bodyKey))}</p>` : ''}
      </div>
      <div class="taxi-panel">
        ${taxiOptions.map((taxiOption) => renderTaxiOption(taxiOption, { t })).join('')}
      </div>
    </section>
  `;
}
```

- [ ] **Step 2: Update CSS from multi-card layout to one panel with stacked entries**

Replace the old card/grid styling in `styles.css` with single-panel classes:

```css
.taxi-panel {
  margin-top: 18px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.82);
  display: grid;
  gap: 16px;
}

.taxi-panel-entry {
  display: grid;
  gap: 10px;
}

.taxi-panel-entry + .taxi-panel-entry {
  padding-top: 16px;
  border-top: 1px solid rgba(62, 39, 24, 0.1);
}

.taxi-panel-entry-copy h4,
.taxi-panel-entry-copy p {
  margin: 0;
}

.taxi-panel-entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.taxi-panel-entry-coverage {
  color: var(--text);
  font-size: 0.94rem;
  line-height: 1.5;
}

.taxi-panel-entry-meta {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
}
```

Also remove or stop using:

```css
.taxi-option-card { ... }
.taxi-option-grid { ... }
.taxi-option-actions { ... }
.taxi-option-coverage { ... }
.taxi-option-meta { ... }
```

- [ ] **Step 3: Run the targeted UI tests to verify they pass**

Run: `npm test -- tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js tests/ui/renderShell.test.js`

Expected: PASS with exactly one `taxi-panel` wrapper per section and the expected number of `taxi-panel-entry` items inside.

- [ ] **Step 4: Run the full suite to verify no regressions**

Run: `npm test`

Expected: PASS with all repository tests green.

- [ ] **Step 5: Commit the implementation**

```bash
git add src/ui/renderTaxiOption.js styles.css tests/ui/renderResults.test.js tests/ui/renderNoDirectFallback.test.js tests/ui/renderShell.test.js
git commit -m "feat: collapse taxi contacts into a single panel"
```
