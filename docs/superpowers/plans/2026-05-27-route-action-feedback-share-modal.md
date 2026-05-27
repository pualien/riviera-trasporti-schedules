# Route Action Feedback and Share Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add save feedback, a tracked share modal, per-channel UTM share URLs, and GTM events for save/share actions.

**Architecture:** Keep the app static and client-only. Put share URL/channel behavior in a pure helper, keep analytics as `dataLayer` helper functions, render route action UI from `renderResultsView`, and bind browser effects in `src/main.js`.

**Tech Stack:** Vanilla ES modules, Vitest, Playwright, static HTML/CSS, Google Tag Manager import JSON.

---

## File Structure

- Create: `src/lib/shareRoute.js`
  - Pure share channel metadata, UTM URL builder, and social share target URL builder.
- Create: `tests/lib/shareRoute.test.js`
  - Unit tests for channel-specific UTM parameters and social href encoding.
- Modify: `src/lib/analytics.js`
  - Add `pushRouteSaveEvent` and `pushRouteShareEvent`.
- Modify: `tests/lib/analytics.test.js`
  - Cover new save/share `dataLayer` payloads.
- Modify: `src/ui/renderResults.js`
  - Render save feedback and the modal when route action state is present.
- Modify: `tests/ui/renderResults.test.js`
  - Cover feedback and share modal markup.
- Modify: `src/lib/i18n.js`
  - Add translated strings for save feedback and share modal labels in all supported languages.
- Modify: `src/main.js`
  - Store route action UI state, create absolute route URLs, bind save/share/modal events, and push GTM events.
- Modify: `styles.css`
  - Style feedback, modal overlay, modal panel, share link field, and responsive share actions.
- Create or modify: `gtm-container-import.json`
  - Extend the existing GTM import with `route_save` and `route_share` triggers and tags.
- Create or modify: `tests/ui/gtmContainerImport.test.js`
  - Assert GTM coverage for `route_save` and `route_share`.

## Task 1: Share URL Helper

**Files:**
- Create: `tests/lib/shareRoute.test.js`
- Create: `src/lib/shareRoute.js`

- [ ] **Step 1: Write the failing tests**

```js
import { describe, expect, it } from 'vitest';
import {
  SHARE_CHANNELS,
  buildRouteShareUrl,
  buildSocialShareHref,
} from '../../src/lib/shareRoute.js';

describe('shareRoute', () => {
  it('adds stable route share UTM values and channel-specific sources', () => {
    const baseUrl = 'https://azzuriva.example/app?tab=search&from=Imperia&day=feriale';

    expect(buildRouteShareUrl(baseUrl, 'link')).toBe(
      'https://azzuriva.example/app?tab=search&from=Imperia&day=feriale&utm_source=share_link&utm_medium=route_share&utm_campaign=azzuriva_route_share',
    );
    expect(buildRouteShareUrl(baseUrl, 'whatsapp')).toContain('utm_source=share_whatsapp');
    expect(buildRouteShareUrl(baseUrl, 'telegram')).toContain('utm_source=share_telegram');
    expect(buildRouteShareUrl(baseUrl, 'facebook')).toContain('utm_source=share_facebook');
    expect(buildRouteShareUrl(baseUrl, 'x')).toContain('utm_source=share_x');
  });

  it('keeps existing non-share query parameters and replaces old share UTM parameters', () => {
    const sharedUrl = buildRouteShareUrl(
      'https://azzuriva.example/app?tab=search&utm_source=old&utm_medium=old&utm_campaign=old#details',
      'facebook',
    );

    expect(sharedUrl).toBe(
      'https://azzuriva.example/app?tab=search&utm_source=share_facebook&utm_medium=route_share&utm_campaign=azzuriva_route_share#details',
    );
  });

  it('builds social target URLs around the channel share URL', () => {
    const shareUrl = 'https://azzuriva.example/app?tab=search&utm_source=share_whatsapp';
    const text = 'Imperia -> Sanremo';

    expect(buildSocialShareHref({ channel: 'whatsapp', shareUrl, text })).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`,
    );
    expect(buildSocialShareHref({ channel: 'telegram', shareUrl, text })).toBe(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
    );
    expect(buildSocialShareHref({ channel: 'facebook', shareUrl, text })).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    );
    expect(buildSocialShareHref({ channel: 'x', shareUrl, text })).toBe(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
    );
    expect(buildSocialShareHref({ channel: 'link', shareUrl, text })).toBe(shareUrl);
  });

  it('lists the supported share channels in modal order', () => {
    expect(SHARE_CHANNELS.map((channel) => channel.id)).toEqual([
      'link',
      'whatsapp',
      'telegram',
      'facebook',
      'x',
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `rtk npm test -- tests/lib/shareRoute.test.js`

Expected: FAIL because `src/lib/shareRoute.js` does not exist.

- [ ] **Step 3: Implement the minimal helper**

```js
export const SHARE_UTM_MEDIUM = 'route_share';
export const SHARE_UTM_CAMPAIGN = 'azzuriva_route_share';

export const SHARE_CHANNELS = Object.freeze([
  { id: 'link', labelKey: 'results.share.copyLink', utmSource: 'share_link' },
  { id: 'whatsapp', labelKey: 'results.share.whatsapp', utmSource: 'share_whatsapp' },
  { id: 'telegram', labelKey: 'results.share.telegram', utmSource: 'share_telegram' },
  { id: 'facebook', labelKey: 'results.share.facebook', utmSource: 'share_facebook' },
  { id: 'x', labelKey: 'results.share.x', utmSource: 'share_x' },
]);

function channelConfig(channel) {
  return SHARE_CHANNELS.find((entry) => entry.id === channel) ?? SHARE_CHANNELS[0];
}

export function buildRouteShareUrl(baseUrl, channel = 'link') {
  const url = new URL(baseUrl);
  const config = channelConfig(channel);

  url.searchParams.set('utm_source', config.utmSource);
  url.searchParams.set('utm_medium', SHARE_UTM_MEDIUM);
  url.searchParams.set('utm_campaign', SHARE_UTM_CAMPAIGN);

  return url.toString();
}

export function buildSocialShareHref({ channel = 'link', shareUrl, text = '' } = {}) {
  if (channel === 'whatsapp') {
    return `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`.trim())}`;
  }

  if (channel === 'telegram') {
    return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
  }

  if (channel === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  }

  if (channel === 'x') {
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
  }

  return shareUrl;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `rtk npm test -- tests/lib/shareRoute.test.js`

Expected: PASS for 4 tests.

## Task 2: Analytics Events

**Files:**
- Modify: `tests/lib/analytics.test.js`
- Modify: `src/lib/analytics.js`

- [ ] **Step 1: Write failing analytics tests**

Append to `tests/lib/analytics.test.js`:

```js
import {
  pushRouteSaveEvent,
  pushRouteShareEvent,
} from '../../src/lib/analytics.js';

describe('route action analytics', () => {
  it('pushes route_save with route context and save status', () => {
    const windowObject = { dataLayer: [] };

    pushRouteSaveEvent(windowObject, {
      from: 'Imperia',
      to: 'Sanremo',
      dayType: 'feriale',
      resultsCount: 7,
      saveStatus: 'saved',
    });

    expect(windowObject.dataLayer[0]).toEqual({
      event: 'route_save',
      from: 'Imperia',
      to: 'Sanremo',
      day_type: 'feriale',
      results_count: 7,
      save_status: 'saved',
    });
  });

  it('pushes route_share with route context and share method', () => {
    const windowObject = {};

    pushRouteShareEvent(windowObject, {
      from: 'Imperia',
      to: 'Sanremo',
      dayType: 'sabato',
      resultsCount: 3,
      shareMethod: 'whatsapp',
      shareUrl: 'https://azzuriva.example/app?utm_source=share_whatsapp',
    });

    expect(windowObject.dataLayer).toEqual([
      {
        event: 'route_share',
        from: 'Imperia',
        to: 'Sanremo',
        day_type: 'sabato',
        results_count: 3,
        share_method: 'whatsapp',
        share_url: 'https://azzuriva.example/app?utm_source=share_whatsapp',
      },
    ]);
  });
});
```

- [ ] **Step 2: Run analytics tests to verify they fail**

Run: `rtk npm test -- tests/lib/analytics.test.js`

Expected: FAIL because `pushRouteSaveEvent` and `pushRouteShareEvent` are not exported.

- [ ] **Step 3: Implement analytics helpers**

Update `src/lib/analytics.js`:

```js
function ensureDataLayer(windowObject) {
  windowObject.dataLayer = windowObject.dataLayer || [];
  return windowObject.dataLayer;
}

export function pushRouteSearchEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_search',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    no_results: resultsCount === 0,
  });
}

export function pushRouteSaveEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
  saveStatus,
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_save',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    save_status: saveStatus,
  });
}

export function pushRouteShareEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
  shareMethod,
  shareUrl,
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_share',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    share_method: shareMethod,
    share_url: shareUrl,
  });
}
```

- [ ] **Step 4: Run analytics tests to verify they pass**

Run: `rtk npm test -- tests/lib/analytics.test.js`

Expected: PASS for existing and new analytics tests.

## Task 3: Result UI Markup and Copy

**Files:**
- Modify: `src/lib/i18n.js`
- Modify: `tests/ui/renderResults.test.js`
- Modify: `src/ui/renderResults.js`

- [ ] **Step 1: Write failing result UI tests**

Add tests to `tests/ui/renderResults.test.js`:

```js
it('renders save feedback in an aria-live route action status', () => {
  const html = renderResultsView({
    t: createTranslator('en'),
    routeLabel: 'Imperia -> Sanremo',
    summary: {
      serviceEnded: false,
      nextDeparture: null,
      soonestArrival: null,
      lastDepartureTime: '19:45',
      averageDurationMinutes: 39,
      lines: ['12'],
    },
    nextDepartures: [],
    allDepartures: [],
    routeActions: {
      saveFeedback: { status: 'saved' },
      shareModal: null,
    },
  });

  expect(html).toContain('class="route-action-feedback"');
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('Route saved');
});

it('renders share modal with tracked direct link and social options', () => {
  const html = renderResultsView({
    t: createTranslator('en'),
    routeLabel: 'Imperia -> Sanremo',
    summary: {
      serviceEnded: false,
      nextDeparture: null,
      soonestArrival: null,
      lastDepartureTime: '19:45',
      averageDurationMinutes: 39,
      lines: ['12'],
    },
    nextDepartures: [],
    allDepartures: [],
    routeActions: {
      saveFeedback: null,
      shareModal: {
        baseUrl: 'https://azzuriva.example/app?tab=search&from=Imperia&to=Sanremo&day=feriale',
        status: 'copied',
      },
    },
  });

  expect(html).toContain('role="dialog"');
  expect(html).toContain('aria-modal="true"');
  expect(html).toContain('data-share-modal');
  expect(html).toContain('utm_source=share_link');
  expect(html).toContain('data-share-option="whatsapp"');
  expect(html).toContain('utm_source=share_whatsapp');
  expect(html).toContain('data-share-option="telegram"');
  expect(html).toContain('data-share-option="facebook"');
  expect(html).toContain('data-share-option="x"');
  expect(html).toContain('Link copied');
});
```

- [ ] **Step 2: Run result UI tests to verify they fail**

Run: `rtk npm test -- tests/ui/renderResults.test.js`

Expected: FAIL because `routeActions` is not rendered.

- [ ] **Step 3: Add i18n keys**

For every language in `src/lib/i18n.js`, add these keys near `results.saveRoute` and `results.shareRoute`.

English values:

```js
'results.saveFeedback.saved': 'Route saved',
'results.saveFeedback.unavailable': 'This browser could not save the route',
'results.share.title': 'Share route',
'results.share.subtitle': 'Send a direct link to this result.',
'results.share.directLink': 'Direct link',
'results.share.copyLink': 'Copy link',
'results.share.whatsapp': 'WhatsApp',
'results.share.telegram': 'Telegram',
'results.share.facebook': 'Facebook',
'results.share.x': 'X',
'results.share.close': 'Close',
'results.share.copied': 'Link copied',
'results.share.manualCopy': 'Copy the link manually from the field',
```

Italian values:

```js
'results.saveFeedback.saved': 'Percorso salvato',
'results.saveFeedback.unavailable': 'Questo browser non ha salvato il percorso',
'results.share.title': 'Condividi percorso',
'results.share.subtitle': 'Invia un link diretto a questo risultato.',
'results.share.directLink': 'Link diretto',
'results.share.copyLink': 'Copia link',
'results.share.whatsapp': 'WhatsApp',
'results.share.telegram': 'Telegram',
'results.share.facebook': 'Facebook',
'results.share.x': 'X',
'results.share.close': 'Chiudi',
'results.share.copied': 'Link copiato',
'results.share.manualCopy': 'Copia manualmente il link dal campo',
```

French values:

```js
'results.saveFeedback.saved': 'Itineraire enregistre',
'results.saveFeedback.unavailable': 'Ce navigateur n a pas enregistre l itineraire',
'results.share.title': 'Partager l itineraire',
'results.share.subtitle': 'Envoyer un lien direct vers ce resultat.',
'results.share.directLink': 'Lien direct',
'results.share.copyLink': 'Copier le lien',
'results.share.whatsapp': 'WhatsApp',
'results.share.telegram': 'Telegram',
'results.share.facebook': 'Facebook',
'results.share.x': 'X',
'results.share.close': 'Fermer',
'results.share.copied': 'Lien copie',
'results.share.manualCopy': 'Copiez manuellement le lien depuis le champ',
```

German values:

```js
'results.saveFeedback.saved': 'Route gespeichert',
'results.saveFeedback.unavailable': 'Dieser Browser konnte die Route nicht speichern',
'results.share.title': 'Route teilen',
'results.share.subtitle': 'Sende einen direkten Link zu diesem Ergebnis.',
'results.share.directLink': 'Direkter Link',
'results.share.copyLink': 'Link kopieren',
'results.share.whatsapp': 'WhatsApp',
'results.share.telegram': 'Telegram',
'results.share.facebook': 'Facebook',
'results.share.x': 'X',
'results.share.close': 'Schliessen',
'results.share.copied': 'Link kopiert',
'results.share.manualCopy': 'Kopiere den Link manuell aus dem Feld',
```

Spanish values:

```js
'results.saveFeedback.saved': 'Ruta guardada',
'results.saveFeedback.unavailable': 'Este navegador no pudo guardar la ruta',
'results.share.title': 'Compartir ruta',
'results.share.subtitle': 'Enviar un enlace directo a este resultado.',
'results.share.directLink': 'Enlace directo',
'results.share.copyLink': 'Copiar enlace',
'results.share.whatsapp': 'WhatsApp',
'results.share.telegram': 'Telegram',
'results.share.facebook': 'Facebook',
'results.share.x': 'X',
'results.share.close': 'Cerrar',
'results.share.copied': 'Enlace copiado',
'results.share.manualCopy': 'Copia manualmente el enlace desde el campo',
```

- [ ] **Step 4: Implement render helpers**

Update `src/ui/renderResults.js`:

```js
import {
  SHARE_CHANNELS,
  buildRouteShareUrl,
  buildSocialShareHref,
} from '../lib/shareRoute.js';
```

Add helpers:

```js
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderSaveFeedback(saveFeedback, t) {
  if (!saveFeedback?.status) {
    return '';
  }

  return `
    <p class="route-action-feedback" role="status" aria-live="polite">
      ${escapeHtml(t(`results.saveFeedback.${saveFeedback.status}`))}
    </p>
  `;
}

function renderShareModal(shareModal, routeLabel, t) {
  if (!shareModal?.baseUrl) {
    return '';
  }

  const directShareUrl = buildRouteShareUrl(shareModal.baseUrl, 'link');
  const statusMessage = shareModal.status ? t(`results.share.${shareModal.status}`) : '';
  const shareOptions = SHARE_CHANNELS
    .filter((channel) => channel.id !== 'link')
    .map((channel) => {
      const shareUrl = buildRouteShareUrl(shareModal.baseUrl, channel.id);
      const href = buildSocialShareHref({
        channel: channel.id,
        shareUrl,
        text: routeLabel,
      });

      return `
        <a class="share-option" href="${escapeHtml(href)}" target="_blank" rel="noreferrer"
          data-share-option="${escapeHtml(channel.id)}" data-share-url="${escapeHtml(shareUrl)}">
          ${escapeHtml(t(channel.labelKey))}
        </a>
      `;
    })
    .join('');

  return `
    <div class="share-modal-backdrop" data-share-modal-backdrop>
      <section class="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-modal-title" data-share-modal>
        <div class="share-modal-head">
          <div>
            <p class="eyebrow">${escapeHtml(t('results.shareRoute'))}</p>
            <h3 id="share-modal-title">${escapeHtml(t('results.share.title'))}</h3>
            <p>${escapeHtml(t('results.share.subtitle'))}</p>
          </div>
          <button type="button" class="share-modal-close" data-share-modal-close aria-label="${escapeHtml(t('results.share.close'))}">x</button>
        </div>
        <label class="share-link-field">
          <span>${escapeHtml(t('results.share.directLink'))}</span>
          <input type="text" readonly value="${escapeHtml(directShareUrl)}" data-share-direct-link>
        </label>
        <div class="share-actions">
          <button type="button" class="share-option" data-share-copy-link data-share-url="${escapeHtml(directShareUrl)}">
            ${escapeHtml(t('results.share.copyLink'))}
          </button>
          ${shareOptions}
        </div>
        <p class="share-modal-status" role="status" aria-live="polite">${escapeHtml(statusMessage)}</p>
      </section>
    </div>
  `;
}
```

Update `renderResultsView` signature to accept `routeActions = { saveFeedback: null, shareModal: null }`, render feedback after `.summary-actions`, and append `renderShareModal(routeActions.shareModal, routeLabel, t)` at the end of the result shell.

- [ ] **Step 5: Run result UI tests to verify they pass**

Run: `rtk npm test -- tests/ui/renderResults.test.js`

Expected: PASS for existing and new result UI tests.

## Task 4: Main Wiring

**Files:**
- Modify: `src/main.js`
- Test with existing UI/unit tests and browser smoke.

- [ ] **Step 1: Import helpers**

Update imports in `src/main.js`:

```js
import {
  pushRouteSaveEvent,
  pushRouteSearchEvent,
  pushRouteShareEvent,
} from './lib/analytics.js';
import { buildRouteShareUrl } from './lib/shareRoute.js';
```

- [ ] **Step 2: Add route action state and URL/context helpers**

Add to `state`:

```js
routeActions: {
  saveFeedback: null,
  shareModal: null,
},
```

Update `clearRouteResults()`:

```js
function clearRouteResults() {
  state.resultState = null;
  state.routeActions = {
    saveFeedback: null,
    shareModal: null,
  };
}
```

Add helpers near `writeRouteUrl`:

```js
function currentRouteAbsoluteUrl() {
  const params = serializeRouteUrlState(currentRouteUrlState());
  const query = params.toString();
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
}

function currentRouteActionContext() {
  return {
    from: state.formValues.fromInput,
    to: state.formValues.toInput,
    dayType: state.formValues.dayType,
    resultsCount: state.resultState?.type === 'results' ? state.resultState.allDepartures.length : 0,
  };
}

function focusShareModal() {
  document.querySelector('[data-share-modal-close]')?.focus();
}
```

- [ ] **Step 3: Pass action state into renderResultsView**

Update the `renderResultsView` call:

```js
routeActions: state.routeActions,
```

- [ ] **Step 4: Replace save/share handlers**

Replace the save and share handlers in `bindSavedRoutes()` with:

```js
document.querySelector('[data-save-current-route]')?.addEventListener('click', () => {
  state.savedRoutes = addFavoriteRoute(savedRoutesStorage(), currentSavedRouteSnapshot({
    resultType: state.resultState?.type ?? null,
    resultCount: currentRouteActionContext().resultsCount,
  }));

  const saveStatus = state.savedRoutes.available ? 'saved' : 'unavailable';
  state.routeActions = {
    saveFeedback: { status: saveStatus },
    shareModal: null,
  };
  pushRouteSaveEvent(window, {
    ...currentRouteActionContext(),
    saveStatus,
  });
  renderApp();
  bindInteractions();
});

document.querySelector('[data-share-current-route]')?.addEventListener('click', () => {
  writeRouteUrl({ push: false });
  state.routeActions = {
    ...state.routeActions,
    shareModal: {
      baseUrl: currentRouteAbsoluteUrl(),
      status: null,
    },
  };
  renderApp();
  bindInteractions();
  focusShareModal();
});
```

Add modal bindings in `bindSavedRoutes()`:

```js
document.querySelector('[data-share-copy-link]')?.addEventListener('click', async (event) => {
  const shareUrl = event.currentTarget.dataset.shareUrl ?? buildRouteShareUrl(currentRouteAbsoluteUrl(), 'link');
  let status = 'copied';

  try {
    await navigator.clipboard?.writeText?.(shareUrl);
  } catch {
    status = 'manualCopy';
  }

  if (!navigator.clipboard?.writeText) {
    status = 'manualCopy';
  }

  pushRouteShareEvent(window, {
    ...currentRouteActionContext(),
    shareMethod: 'link',
    shareUrl,
  });

  state.routeActions = {
    ...state.routeActions,
    shareModal: {
      ...state.routeActions.shareModal,
      status,
    },
  };
  renderApp();
  bindInteractions();
  focusShareModal();
});

document.querySelectorAll('[data-share-option]').forEach((link) => {
  link.addEventListener('click', () => {
    pushRouteShareEvent(window, {
      ...currentRouteActionContext(),
      shareMethod: link.dataset.shareOption ?? '',
      shareUrl: link.dataset.shareUrl ?? '',
    });
  });
});

document.querySelector('[data-share-modal-backdrop]')?.addEventListener('click', (event) => {
  if (event.target !== event.currentTarget) {
    return;
  }

  state.routeActions = {
    ...state.routeActions,
    shareModal: null,
  };
  renderApp();
  bindInteractions();
});

document.querySelector('[data-share-modal-close]')?.addEventListener('click', () => {
  state.routeActions = {
    ...state.routeActions,
    shareModal: null,
  };
  renderApp();
  bindInteractions();
  document.querySelector('[data-share-current-route]')?.focus();
});

document.querySelector('[data-share-modal]')?.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  state.routeActions = {
    ...state.routeActions,
    shareModal: null,
  };
  renderApp();
  bindInteractions();
  document.querySelector('[data-share-current-route]')?.focus();
});
```

- [ ] **Step 5: Run relevant tests**

Run: `rtk npm test -- tests/lib/shareRoute.test.js tests/lib/analytics.test.js tests/ui/renderResults.test.js`

Expected: PASS for share helper, analytics, and result UI tests.

## Task 5: Styles

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: Add styles**

Add near result styles:

```css
.route-action-feedback {
  flex-basis: 100%;
  margin: 0;
  color: var(--accent-strong);
  font-size: 0.9rem;
  font-weight: 700;
}

.share-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(29, 26, 23, 0.42);
}

.share-modal {
  width: min(100%, 540px);
  max-height: calc(100vh - 36px);
  overflow: auto;
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  background: var(--panel-strong);
  box-shadow: var(--shadow);
}

.share-modal-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.share-modal-head h3,
.share-modal-head p,
.share-modal-status {
  margin: 0;
}

.share-modal-head p:not(.eyebrow),
.share-modal-status,
.share-link-field span {
  color: var(--muted);
}

.share-modal-close {
  width: 40px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #ffffff;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.share-link-field {
  display: grid;
  gap: 8px;
}

.share-link-field input {
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 251, 247, 0.9);
  color: var(--text);
  font: inherit;
  padding: 0 12px;
}

.share-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.share-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #ffffff;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  padding: 10px 12px;
}

.share-option:hover,
.share-option:focus-visible,
.share-modal-close:hover,
.share-modal-close:focus-visible {
  border-color: rgba(217, 59, 79, 0.26);
  box-shadow: 0 0 0 4px rgba(235, 76, 96, 0.1);
  outline: none;
}
```

- [ ] **Step 2: Run unit/UI tests**

Run: `rtk npm test -- tests/ui/renderResults.test.js`

Expected: PASS.

## Task 6: GTM Import Coverage

**Files:**
- Create or modify: `gtm-container-import.json`
- Create or modify: `tests/ui/gtmContainerImport.test.js`

- [ ] **Step 1: Restore existing GTM import context if absent in worktree**

If `gtm-container-import.json` and `tests/ui/gtmContainerImport.test.js` are missing in this isolated worktree, copy the existing untracked versions from the original checkout:

Run:

```bash
rtk cp /Users/msenardi/Projects/riviera-trasporti-schedules/gtm-container-import.json gtm-container-import.json
rtk cp /Users/msenardi/Projects/riviera-trasporti-schedules/tests/ui/gtmContainerImport.test.js tests/ui/gtmContainerImport.test.js
```

Expected: both files exist in the worktree and `rtk npm test -- tests/ui/gtmContainerImport.test.js` preserves the current route_search coverage.

- [ ] **Step 2: Write failing GTM tests**

Add a test to `tests/ui/gtmContainerImport.test.js`:

```js
  it('sends route_save and route_share dataLayer events to both analytics destinations', () => {
    const tags = importConfig.containerVersion.tag;
    const triggers = importConfig.containerVersion.trigger;
    const routeSaveTrigger = triggers.find((trigger) => trigger.name === 'Custom Event - route_save');
    const routeShareTrigger = triggers.find((trigger) => trigger.name === 'Custom Event - route_share');
    const ga4RouteSaveTag = tags.find((tag) => tag.name === 'GA4 - Event - route_save');
    const ga4RouteShareTag = tags.find((tag) => tag.name === 'GA4 - Event - route_share');
    const mixpanelRouteSaveTag = tags.find((tag) => tag.name === 'Mixpanel - Event - route_save');
    const mixpanelRouteShareTag = tags.find((tag) => tag.name === 'Mixpanel - Event - route_share');

    expect(routeSaveTrigger.customEventFilter[0].parameter[1].value).toBe('route_save');
    expect(routeShareTrigger.customEventFilter[0].parameter[1].value).toBe('route_share');
    expect(ga4RouteSaveTag.firingTriggerId).toEqual([routeSaveTrigger.triggerId]);
    expect(ga4RouteShareTag.firingTriggerId).toEqual([routeShareTrigger.triggerId]);
    expect(findParameter(ga4RouteSaveTag.parameter, 'eventName').value).toBe('route_save');
    expect(findParameter(ga4RouteShareTag.parameter, 'eventName').value).toBe('route_share');
    expect(findParameter(mixpanelRouteSaveTag.parameter, 'html').value).toContain(
      "window.mixpanel.track('route_save'",
    );
    expect(findParameter(mixpanelRouteShareTag.parameter, 'html').value).toContain(
      "window.mixpanel.track('route_share'",
    );
  });
```

- [ ] **Step 3: Run GTM tests to verify they fail**

Run: `rtk npm test -- tests/ui/gtmContainerImport.test.js`

Expected: FAIL because route save/share triggers and tags are missing.

- [ ] **Step 4: Extend GTM import JSON**

Add custom triggers:

```json
{
  "accountId": "0",
  "containerId": "0",
  "triggerId": "11",
  "name": "Custom Event - route_save",
  "type": "CUSTOM_EVENT",
  "customEventFilter": [
    {
      "type": "EQUALS",
      "parameter": [
        { "type": "TEMPLATE", "key": "arg0", "value": "{{_event}}" },
        { "type": "TEMPLATE", "key": "arg1", "value": "route_save" }
      ]
    }
  ],
  "fingerprint": "0"
}
```

and the equivalent trigger with `triggerId` `12`, name `Custom Event - route_share`, and value `route_share`.

Add GA4 event tags named `GA4 - Event - route_save` and `GA4 - Event - route_share`, using the same `gaawe` structure as `route_search`, firing on trigger IDs `11` and `12`. Include event parameter mappings:

- `route_save`: `from`, `to`, `day_type`, `results_count`, `save_status`
- `route_share`: `from`, `to`, `day_type`, `results_count`, `share_method`, `share_url`

Add Mixpanel HTML event tags named `Mixpanel - Event - route_save` and `Mixpanel - Event - route_share`, using the same initialization setup tag as route search and tracking the same event fields.

Add data layer variables for new parameters:

- `DLV - save_status` with `name` `save_status`
- `DLV - share_method` with `name` `share_method`
- `DLV - share_url` with `name` `share_url`

- [ ] **Step 5: Run GTM tests to verify they pass**

Run: `rtk npm test -- tests/ui/gtmContainerImport.test.js`

Expected: PASS.

## Task 7: Browser Verification and Final Test Pass

**Files:**
- No new source files.

- [ ] **Step 1: Run full unit suite**

Run: `rtk npm test`

Expected: PASS for all Vitest tests.

- [ ] **Step 2: Run browser smoke tests**

Run: `rtk npm run test:smoke`

Expected: PASS for Playwright smoke tests.

- [ ] **Step 3: Manually verify share UI in browser**

Start a local server if needed:

```bash
rtk python3 -m http.server 4173
```

Open `http://127.0.0.1:4173/`, perform a route search, click `Save route`, confirm feedback appears, click `Share`, confirm the modal opens, copy link, and confirm the copied URL contains `utm_source=share_link&utm_medium=route_share&utm_campaign=azzuriva_route_share`.

- [ ] **Step 4: Inspect git diff**

Run: `rtk git diff --stat`

Expected: changes are limited to the files listed in this plan.
