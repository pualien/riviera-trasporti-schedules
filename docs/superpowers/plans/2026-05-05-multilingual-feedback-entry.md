# Multilingual UI And Feedback Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent five-language selector and a translated feedback-form entry point to the Riviera route lookup app without changing route data.

**Architecture:** Introduce a single client-side i18n module that owns supported languages, translation dictionaries, and safe language persistence helpers. Thread translated copy through the existing string-based renderers, keep route data untouched, and let `src/main.js` own the selected language state plus re-rendering when the selector changes.

**Tech Stack:** Vanilla JavaScript modules, HTML template renderers, CSS, `vitest`

---

## File Map

- `src/lib/i18n.js`: supported language metadata, translation dictionaries, language fallback rules, and `localStorage` helpers.
- `src/lib/brand.js`: static brand assets and external URLs, including the placeholder feedback form URL.
- `src/main.js`: selected-language app state, startup persistence read, change handling, and passing the translator into renderers.
- `src/ui/renderShell.js`: header language selector, official-site link, and translated feedback CTA.
- `src/ui/renderSearchForm.js`: localized hero copy, field labels, helper text, picker text, and submit label.
- `src/ui/renderResults.js`: localized route summary, section labels, and PDF link text.
- `src/ui/renderEmptyState.js`: localized empty-state heading and guidance.
- `src/ui/renderLocationPicker.js`: localized nearby-stop messaging while leaving stop labels untouched.
- `styles.css`: compact header layout for the selector and feedback action.
- `tests/lib/i18n.test.js`: language fallback, dictionary lookup, and persistence-helper coverage.
- `tests/ui/renderShell.test.js`: shell-level language selector and feedback CTA rendering coverage.
- `tests/ui/renderSearchForm.test.js`: translated form copy coverage.
- `tests/ui/renderResults.test.js`: translated results copy coverage.
- `tests/ui/renderLocationPicker.test.js`: translated nearby-stop messaging coverage.

### Task 1: Add the i18n core and safe language persistence helpers

**Files:**
- Create: `src/lib/i18n.js`
- Create: `tests/lib/i18n.test.js`

- [ ] **Step 1: Write the failing i18n tests**

```js
// tests/lib/i18n.test.js
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  createTranslator,
  persistLanguage,
  readStoredLanguage,
} from '../../src/lib/i18n.js';

describe('i18n helpers', () => {
  it('falls back to Italian when storage contains no valid language', () => {
    expect(readStoredLanguage({ getItem: () => null })).toBe(DEFAULT_LANGUAGE);
    expect(readStoredLanguage({ getItem: () => 'pt' })).toBe(DEFAULT_LANGUAGE);
  });

  it('restores a saved supported language code', () => {
    expect(readStoredLanguage({ getItem: () => 'fr' })).toBe('fr');
  });

  it('translates shell and search copy for a non-default language', () => {
    const t = createTranslator('es');

    expect(SUPPORTED_LANGUAGES.map((language) => language.code)).toEqual(['it', 'en', 'fr', 'de', 'es']);
    expect(t('shell.feedback')).toBe('Dar consejos');
    expect(t('search.submit')).toBe('Mostrar salidas');
  });

  it('stores only supported language codes', () => {
    const writes = [];
    const storage = { setItem: (key, value) => writes.push([key, value]) };

    persistLanguage(storage, 'de');
    persistLanguage(storage, 'xx');

    expect(writes).toEqual([['language', 'de']]);
  });
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/lib/i18n.test.js`
Expected: FAIL because `src/lib/i18n.js` does not exist yet.

- [ ] **Step 3: Write the minimal i18n implementation**

```js
// src/lib/i18n.js
export const DEFAULT_LANGUAGE = 'it';
export const LANGUAGE_STORAGE_KEY = 'language';

export const SUPPORTED_LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
];

const DICTIONARY = {
  it: {
    'shell.feedback': 'Lascia un consiglio',
    'search.submit': 'Mostra partenze',
  },
  en: {
    'shell.feedback': 'Share advice',
    'search.submit': 'Show departures',
  },
  fr: {
    'shell.feedback': 'Donner un conseil',
    'search.submit': 'Afficher les départs',
  },
  de: {
    'shell.feedback': 'Hinweis geben',
    'search.submit': 'Abfahrten anzeigen',
  },
  es: {
    'shell.feedback': 'Dar consejos',
    'search.submit': 'Mostrar salidas',
  },
};

export function isSupportedLanguage(language) {
  return SUPPORTED_LANGUAGES.some((entry) => entry.code === language);
}

export function readStoredLanguage(storage) {
  const storedLanguage = storage?.getItem?.(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
}

export function persistLanguage(storage, language) {
  if (!isSupportedLanguage(language)) {
    return;
  }

  storage?.setItem?.(LANGUAGE_STORAGE_KEY, language);
}

export function createTranslator(language) {
  const resolvedLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;

  return function t(key) {
    return DICTIONARY[resolvedLanguage][key] ?? DICTIONARY[DEFAULT_LANGUAGE][key] ?? key;
  };
}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- tests/lib/i18n.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/lib/i18n.test.js src/lib/i18n.js
git commit -m "feat: add route picker i18n helpers"
```

### Task 2: Localize shell and renderer copy while keeping route data untouched

**Files:**
- Modify: `src/lib/brand.js`
- Modify: `src/ui/renderShell.js`
- Modify: `src/ui/renderSearchForm.js`
- Modify: `src/ui/renderResults.js`
- Modify: `src/ui/renderEmptyState.js`
- Modify: `src/ui/renderLocationPicker.js`
- Modify: `tests/ui/renderShell.test.js`
- Modify: `tests/ui/renderSearchForm.test.js`
- Modify: `tests/ui/renderResults.test.js`
- Modify: `tests/ui/renderLocationPicker.test.js`

- [ ] **Step 1: Write the failing renderer tests**

```js
// tests/ui/renderShell.test.js
import { createTranslator, SUPPORTED_LANGUAGES } from '../../src/lib/i18n.js';
import { renderShell } from '../../src/ui/renderShell.js';

it('renders the language selector and translated feedback action', () => {
  const html = renderShell('<section>Body</section>', {
    language: 'fr',
    languages: SUPPORTED_LANGUAGES,
    t: createTranslator('fr'),
  });

  expect(html).toContain('value="fr" selected');
  expect(html).toContain('Donner un conseil');
  expect(html).toContain('Official Riviera Trasporti site');
});
```

```js
// tests/ui/renderSearchForm.test.js
import { createTranslator } from '../../src/lib/i18n.js';
import { renderSearchForm } from '../../src/ui/renderSearchForm.js';

it('renders translated hero and field copy in German', () => {
  const html = renderSearchForm({
    t: createTranslator('de'),
  });

  expect(html).toContain('Routen finden');
  expect(html).toContain('Von');
  expect(html).toContain('Abfahrten anzeigen');
});
```

```js
// tests/ui/renderResults.test.js
import { createTranslator } from '../../src/lib/i18n.js';
import { renderResultsView } from '../../src/ui/renderResults.js';

it('renders translated results copy without changing line data', () => {
  const html = renderResultsView({
    t: createTranslator('es'),
    routeLabel: 'Porto Maurizio -> Sanremo',
    summary: {
      averageDurationMinutes: 39,
      firstDeparture: '06:20',
      lastDeparture: '19:45',
      lines: ['12'],
    },
    nextDepartures: [],
    allDepartures: [],
  });

  expect(html).toContain('Próximas salidas');
  expect(html).toContain('Línea 12');
});
```

```js
// tests/ui/renderLocationPicker.test.js
import { createTranslator } from '../../src/lib/i18n.js';
import { renderLocationPicker } from '../../src/ui/renderLocationPicker.js';

it('translates nearby-stop guidance while leaving stop labels unchanged', () => {
  const html = renderLocationPicker({
    fieldName: 'from',
    state: 'ready',
    t: createTranslator('en'),
    nearbyStops: [
      {
        stopId: 'imperia-porto-maurizio',
        canonical: 'imperia porto maurizio',
        localityLabel: 'Porto Maurizio',
        distanceMeters: 180,
      },
    ],
  });

  expect(html).toContain('Choose an area first, then confirm the exact timetable stop if the nearby match is ambiguous.');
  expect(html).toContain('Porto Maurizio');
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/ui/renderShell.test.js tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js tests/ui/renderLocationPicker.test.js`
Expected: FAIL because renderers do not accept `t` or language metadata yet.

- [ ] **Step 3: Write the minimal renderer implementation**

```js
// src/lib/brand.js
export const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/PLACEHOLDER/viewform';
```

```js
// src/ui/renderShell.js
import {
  BRAND_LOCKUP_ALT,
  BRAND_LOCKUP_SRC,
  BRAND_SITE_URL,
  FEEDBACK_FORM_URL,
} from '../lib/brand.js';

function renderLanguageOptions(languages, selectedLanguage) {
  return languages
    .map(
      (language) => `
        <option value="${language.code}" ${language.code === selectedLanguage ? 'selected' : ''}>${language.label}</option>
      `,
    )
    .join('');
}

export function renderShell(content, { language, languages, t }) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <img class="brand-lockup-image" src="${BRAND_LOCKUP_SRC}" alt="${BRAND_LOCKUP_ALT}" />
          <p class="brand-subtitle">${t('shell.subtitle')}</p>
        </div>
        <div class="topbar-actions">
          <a class="topbar-link" href="${FEEDBACK_FORM_URL}" target="_blank" rel="noreferrer">${t('shell.feedback')}</a>
          <a class="topbar-link" href="${BRAND_SITE_URL}" target="_blank" rel="noreferrer">${t('shell.officialSite')}</a>
          <label class="language-selector">
            <span>${t('shell.language')}</span>
            <select name="language">${renderLanguageOptions(languages, language)}</select>
          </label>
        </div>
      </header>
      ${content}
    </div>
  `;
}
```

```js
// src/ui/renderEmptyState.js
export function renderEmptyState(t, message = t('empty.message')) {
  return `
    <section class="empty-state">
      <p class="eyebrow">${t('empty.eyebrow')}</p>
      <h2>${message}</h2>
      <p>${t('empty.guidance')}</p>
    </section>
  `;
}
```

```js
// src/ui/renderResults.js
function renderDepartureCard(departure, t) {
  return `
    <article class="departure-card">
      <div class="departure-main">
        <strong>${departure.departureTime}</strong>
        <p>${t('results.arrives')} ${departure.arrivalTime} · ${t('results.line')} ${departure.lineId}</p>
      </div>
      <div class="departure-meta">
        <span>${departure.durationMinutes} min</span>
        <a href="${PDF_URL}#page=${departure.sourcePage}" target="_blank" rel="noreferrer">${t('results.openPdf')}</a>
      </div>
    </article>
  `;
}
```

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- tests/ui/renderShell.test.js tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js tests/ui/renderLocationPicker.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/ui/renderShell.test.js tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js tests/ui/renderLocationPicker.test.js src/lib/brand.js src/ui/renderShell.js src/ui/renderSearchForm.js src/ui/renderResults.js src/ui/renderEmptyState.js src/ui/renderLocationPicker.js
git commit -m "feat: localize route picker renderers"
```

### Task 3: Wire language state through the app and style the new header controls

**Files:**
- Modify: `src/main.js`
- Modify: `styles.css`

- [ ] **Step 1: Write the failing integration-oriented UI tests**

```js
// tests/ui/renderShell.test.js
it('marks the active language in the selector', () => {
  const html = renderShell('<section>Body</section>', {
    language: 'es',
    languages: SUPPORTED_LANGUAGES,
    t: createTranslator('es'),
  });

  expect(html).toContain('<select name="language">');
  expect(html).toContain('value="es" selected');
});
```

```js
// tests/ui/renderSearchForm.test.js
it('can render translated informational picker text without changing route values', () => {
  const html = renderSearchForm({
    t: createTranslator('fr'),
    fromInput: 'Porto Maurizio',
    toInput: 'sanremo autostazione',
    destinationMode: 'informational',
    destinationMessage: createTranslator('fr')('search.toInformational'),
  });

  expect(html).toContain('Porto Maurizio');
  expect(html).toContain('sanremo autostazione');
  expect(html).toContain('Choisissez d’abord une zone de départ');
});
```

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- tests/ui/renderShell.test.js tests/ui/renderSearchForm.test.js`
Expected: FAIL because `src/main.js` does not yet pass language context into the renderers and the shell styling hooks do not exist.

- [ ] **Step 3: Write the minimal app-state and styling implementation**

```js
// src/main.js
import {
  SUPPORTED_LANGUAGES,
  createTranslator,
  persistLanguage,
  readStoredLanguage,
} from './lib/i18n.js';

const state = {
  language: readStoredLanguage(window.localStorage),
  // existing fields...
};

function renderApp() {
  const t = createTranslator(state.language);

  const parts = [renderSearchForm({
    t,
    // existing props...
  })];

  if (state.locationPicker) {
    parts.push(renderLocationPicker({ ...state.locationPicker, t }));
  }

  if (state.resultState?.type === 'results') {
    parts.push(renderResultsView({
      t,
      routeLabel: `${state.formValues.fromInput} -> ${state.formValues.toInput}`,
      summary: state.resultState.summary,
      nextDepartures: state.resultState.nextDepartures,
      allDepartures: state.resultState.allDepartures,
    }));
  }

  if (state.resultState?.type === 'empty') {
    parts.push(renderEmptyState(t, state.resultState.message));
  }

  app.innerHTML = renderShell(parts.join(''), {
    language: state.language,
    languages: SUPPORTED_LANGUAGES,
    t,
  });
}

document.addEventListener('change', (event) => {
  const target = event.target;

  if (target instanceof HTMLSelectElement && target.name === 'language') {
    state.language = target.value;
    persistLanguage(window.localStorage, state.language);
    renderApp();
  }
});
```

```css
/* styles.css */
.topbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  align-items: center;
}

.language-selector {
  display: grid;
  gap: 4px;
  color: var(--muted);
  font-size: 0.78rem;
}

.language-selector select {
  min-height: 44px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.92);
  padding: 0 12px;
}
```

- [ ] **Step 4: Run the full relevant test suite to verify the feature passes**

Run: `npm test -- tests/lib/i18n.test.js tests/ui/renderShell.test.js tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js tests/ui/renderLocationPicker.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main.js styles.css tests/lib/i18n.test.js tests/ui/renderShell.test.js tests/ui/renderSearchForm.test.js tests/ui/renderResults.test.js tests/ui/renderLocationPicker.test.js
git commit -m "feat: add multilingual route picker shell"
```

## Self-Review

- Spec coverage: the plan includes selector behavior, full renderer translation, persistence, unchanged route data, and the external feedback link.
- Placeholder scan: the only placeholder intentionally left is the temporary Google Form URL value itself because the approved design explicitly calls for a temporary form link.
- Type consistency: the plan uses `language`, `t`, `SUPPORTED_LANGUAGES`, `readStoredLanguage`, and `persistLanguage` consistently across the file map and tasks.
