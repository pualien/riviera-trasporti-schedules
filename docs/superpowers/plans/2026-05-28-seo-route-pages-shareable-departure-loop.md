# SEO Route Pages and Shareable Departure Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a measurable diffusion loop with crawlable route/place/line pages and richer route/departure sharing.

**Architecture:** Add low-cardinality analytics and route-state fields first, then upgrade sharing UI and inbound shared-route restoration, then add build-time static SEO page generation from existing JSON assets. The browser app remains a vanilla JavaScript SPA; static SEO pages are generated files that link into the SPA with serialized state.

**Tech Stack:** Vanilla JavaScript modules, Vitest, Playwright smoke tests, static JSON assets, GitHub Pages-compatible HTML output.

---

## File Structure

Create:

- `scripts/lib/seoPageData.mjs`: build-time pure helpers for slugs, route candidates, place summaries, and line summaries.
- `scripts/lib/renderSeoPageHtml.mjs`: build-time HTML renderer for route, place, and line pages.
- `scripts/generate-seo-pages.mjs`: CLI script that reads `assets/data/*.json` and writes static pages plus `sitemap.xml`, `robots.txt`, and `404.html`.
- `tests/scripts/seoPageData.test.js`: unit tests for candidate selection and summaries.
- `tests/scripts/renderSeoPageHtml.test.js`: unit tests for static HTML metadata and content.
- `tests/scripts/generateSeoPages.test.js`: integration-style tests for file output in a temp directory.

Modify:

- `src/lib/analytics.js`: add new analytics helpers.
- `tests/lib/analytics.test.js`: test new event payloads.
- `src/lib/routeUrlState.js`: add optional shared-route state fields.
- `tests/lib/routeUrlState.test.js`: test shared state parse/serialize/hydrate behavior.
- `src/lib/shareRoute.js`: add route/departure message builders and native share payload builders.
- `tests/lib/shareRoute.test.js`: test message and native payload builders.
- `src/ui/renderResults.js`: render departure share actions, native share affordance, and shared-route context.
- `tests/ui/renderResults.test.js`: test rendered share controls and context.
- `src/lib/i18n.js`: add labels and message templates for share scope and shared-route context.
- `src/main.js`: wire analytics, inbound shared-route state, native share fallback, departure sharing, outbound clicks.
- `package.json`: add `build:seo`.
- `tests/scripts/packageScripts.test.js`: assert the new script exists.
- `tests/e2e/app-flow.spec.js`: add a light shared-route/departure-share smoke path if the current fixture route is stable.

Do not modify the PDF parsing pipeline for this feature. The SEO page generator consumes generated JSON assets only.

---

## Task 1: Analytics Event Helpers

**Files:**

- Modify: `src/lib/analytics.js`
- Modify: `tests/lib/analytics.test.js`

- [ ] **Step 1: Add failing tests for new analytics helpers**

Append these imports in `tests/lib/analytics.test.js`:

```js
import {
  pushBrowseInteractionEvent,
  pushLandingContextEvent,
  pushOutboundClickEvent,
  pushRouteNoDirectViewedEvent,
  pushRouteResultViewedEvent,
  pushShareModalOpenedEvent,
  pushSharedRouteOpenedEvent,
  pushSharedRouteRestoredEvent,
} from '../../src/lib/analytics.js';
```

Append this test block:

```js
describe('growth analytics', () => {
  it('pushes landing context without raw URLs', () => {
    const windowObject = {};

    pushLandingContextEvent(windowObject, {
      tab: 'search',
      hasRouteParams: true,
      hasShareUtm: true,
      utmSource: 'share_whatsapp',
      utmMedium: 'route_share',
      utmCampaign: 'azzuriva_route_share',
      referrerType: 'direct',
      language: 'it',
    });

    expect(windowObject.dataLayer[0]).toEqual({
      event: 'landing_context',
      tab: 'search',
      has_route_params: true,
      has_share_utm: true,
      utm_source: 'share_whatsapp',
      utm_medium: 'route_share',
      utm_campaign: 'azzuriva_route_share',
      referrer_type: 'direct',
      language: 'it',
    });
  });

  it('pushes result and no-direct view events', () => {
    const windowObject = { dataLayer: [] };

    pushRouteResultViewedEvent(windowObject, {
      from: 'Imperia',
      to: 'Sanremo',
      dayType: 'feriale',
      resultsCount: 8,
      hasNextDeparture: true,
      hasTaxiFallback: true,
      sourceContext: 'share',
    });

    pushRouteNoDirectViewedEvent(windowObject, {
      from: 'Sanremo',
      to: 'Dolceacqua',
      dayType: 'festivo',
      hasTransferSuggestions: false,
      hasTaxiFallback: true,
      sourceContext: 'organic',
    });

    expect(windowObject.dataLayer).toEqual([
      {
        event: 'route_result_viewed',
        from: 'Imperia',
        to: 'Sanremo',
        day_type: 'feriale',
        results_count: 8,
        has_next_departure: true,
        has_taxi_fallback: true,
        source_context: 'share',
      },
      {
        event: 'route_no_direct_viewed',
        from: 'Sanremo',
        to: 'Dolceacqua',
        day_type: 'festivo',
        has_transfer_suggestions: false,
        has_taxi_fallback: true,
        source_context: 'organic',
      },
    ]);
  });

  it('pushes share, restore, outbound, and browse diagnostics', () => {
    const windowObject = { dataLayer: [] };

    pushShareModalOpenedEvent(windowObject, {
      shareScope: 'departure',
      from: 'Imperia',
      to: 'Sanremo',
      dayType: 'sabato',
    });
    pushSharedRouteOpenedEvent(windowObject, {
      utmSource: 'share_whatsapp',
      shareScope: 'departure',
      hasCompleteRouteState: true,
      dayType: 'sabato',
    });
    pushSharedRouteRestoredEvent(windowObject, {
      restoreStatus: 'results',
      resultsCount: 4,
      selectedDepartureRestored: true,
    });
    pushOutboundClickEvent(windowObject, {
      targetType: 'official_pdf',
      context: 'result',
    });
    pushBrowseInteractionEvent(windowObject, {
      browseAction: 'line_selected',
      mode: 'lines',
      queryPresent: false,
    });

    expect(windowObject.dataLayer.map((entry) => entry.event)).toEqual([
      'share_modal_opened',
      'shared_route_opened',
      'shared_route_restored',
      'outbound_click',
      'browse_interaction',
    ]);
  });
});
```

- [ ] **Step 2: Run the focused failing test**

Run:

```bash
rtk npm test -- tests/lib/analytics.test.js
```

Expected: FAIL with missing exports from `src/lib/analytics.js`.

- [ ] **Step 3: Implement analytics helpers**

Append these functions to `src/lib/analytics.js`:

```js
export function pushLandingContextEvent(windowObject, {
  tab,
  hasRouteParams,
  hasShareUtm,
  utmSource = '',
  utmMedium = '',
  utmCampaign = '',
  referrerType = 'unknown',
  language,
}) {
  ensureDataLayer(windowObject).push({
    event: 'landing_context',
    tab,
    has_route_params: Boolean(hasRouteParams),
    has_share_utm: Boolean(hasShareUtm),
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    referrer_type: referrerType,
    language,
  });
}

export function pushRouteResultViewedEvent(windowObject, {
  from,
  to,
  dayType,
  resultsCount,
  hasNextDeparture,
  hasTaxiFallback,
  sourceContext = 'unknown',
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_result_viewed',
    from,
    to,
    day_type: dayType,
    results_count: resultsCount,
    has_next_departure: Boolean(hasNextDeparture),
    has_taxi_fallback: Boolean(hasTaxiFallback),
    source_context: sourceContext,
  });
}

export function pushRouteNoDirectViewedEvent(windowObject, {
  from,
  to,
  dayType,
  hasTransferSuggestions,
  hasTaxiFallback,
  sourceContext = 'unknown',
}) {
  ensureDataLayer(windowObject).push({
    event: 'route_no_direct_viewed',
    from,
    to,
    day_type: dayType,
    has_transfer_suggestions: Boolean(hasTransferSuggestions),
    has_taxi_fallback: Boolean(hasTaxiFallback),
    source_context: sourceContext,
  });
}

export function pushShareModalOpenedEvent(windowObject, {
  shareScope,
  from,
  to,
  dayType,
}) {
  ensureDataLayer(windowObject).push({
    event: 'share_modal_opened',
    share_scope: shareScope,
    from,
    to,
    day_type: dayType,
  });
}

export function pushSharedRouteOpenedEvent(windowObject, {
  utmSource = '',
  shareScope = 'route',
  hasCompleteRouteState,
  dayType,
}) {
  ensureDataLayer(windowObject).push({
    event: 'shared_route_opened',
    utm_source: utmSource,
    share_scope: shareScope,
    has_complete_route_state: Boolean(hasCompleteRouteState),
    day_type: dayType,
  });
}

export function pushSharedRouteRestoredEvent(windowObject, {
  restoreStatus,
  resultsCount = 0,
  selectedDepartureRestored = false,
}) {
  ensureDataLayer(windowObject).push({
    event: 'shared_route_restored',
    restore_status: restoreStatus,
    results_count: resultsCount,
    selected_departure_restored: Boolean(selectedDepartureRestored),
  });
}

export function pushOutboundClickEvent(windowObject, {
  targetType,
  context,
}) {
  ensureDataLayer(windowObject).push({
    event: 'outbound_click',
    target_type: targetType,
    context,
  });
}

export function pushBrowseInteractionEvent(windowObject, {
  browseAction,
  mode,
  queryPresent,
}) {
  ensureDataLayer(windowObject).push({
    event: 'browse_interaction',
    browse_action: browseAction,
    mode,
    query_present: Boolean(queryPresent),
  });
}
```

- [ ] **Step 4: Run focused analytics tests**

Run:

```bash
rtk npm test -- tests/lib/analytics.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit analytics helpers**

Run:

```bash
rtk git add src/lib/analytics.js tests/lib/analytics.test.js
rtk git commit -m "feat: add growth analytics helpers"
```

---

## Task 2: Shared Route URL State

**Files:**

- Modify: `src/lib/routeUrlState.js`
- Modify: `tests/lib/routeUrlState.test.js`

- [ ] **Step 1: Write failing tests for share scope and trip keys**

Append this block in `tests/lib/routeUrlState.test.js`:

```js
describe('shared route state', () => {
  it('parses optional share scope and selected trip key', () => {
    const parsed = parseRouteUrlState('?tab=search&from=Imperia&to=Sanremo&day=feriale&share=departure&trip=12%3Aferiale%3A23%3A0%3Aimperia%3Asanremo');

    expect(parsed.share).toEqual({
      shareScope: 'departure',
      tripKey: '12:feriale:23:0:imperia:sanremo',
    });
  });

  it('serializes optional share scope and selected trip key', () => {
    const params = serializeRouteUrlState({
      tab: 'search',
      search: {
        ...DEFAULT_ROUTE_URL_STATE.search,
        fromInput: 'Imperia',
        toInput: 'Sanremo',
      },
      browse: DEFAULT_ROUTE_URL_STATE.browse,
      share: {
        shareScope: 'departure',
        tripKey: 'selected-trip',
      },
    });

    expect(params.toString()).toContain('share=departure');
    expect(params.toString()).toContain('trip=selected-trip');
  });

  it('drops invalid share scope without dropping the route', () => {
    const parsed = parseRouteUrlState('?tab=search&from=Imperia&to=Sanremo&share=bad&trip=selected-trip');

    expect(parsed.tab).toBe('search');
    expect(parsed.search.fromInput).toBe('Imperia');
    expect(parsed.search.toInput).toBe('Sanremo');
    expect(parsed.share).toEqual({
      shareScope: null,
      tripKey: 'selected-trip',
    });
  });
});
```

- [ ] **Step 2: Run focused failing tests**

Run:

```bash
rtk npm test -- tests/lib/routeUrlState.test.js
```

Expected: FAIL because `share` state is not parsed or serialized.

- [ ] **Step 3: Implement optional share state**

In `src/lib/routeUrlState.js`, add:

```js
const VALID_SHARE_SCOPES = new Set(['route', 'departure']);
```

Extend `DEFAULT_ROUTE_URL_STATE`:

```js
  share: {
    shareScope: null,
    tripKey: null,
  },
```

Inside `parseRouteUrlState`, after reading `dayType`, add:

```js
  const shareScope = params.get('share');
```

Add this property to the returned object:

```js
    share: {
      shareScope: VALID_SHARE_SCOPES.has(shareScope) ? shareScope : null,
      tripKey: valueOrNull(params.get('trip')),
    },
```

Inside `serializeRouteUrlState`, extend the normalized state:

```js
    share: {
      ...DEFAULT_ROUTE_URL_STATE.share,
      ...routeState.share,
    },
```

Before returning `params`, add:

```js
  if (VALID_SHARE_SCOPES.has(state.share.shareScope)) {
    params.set('share', state.share.shareScope);
  }

  if (state.share.tripKey) {
    params.set('trip', state.share.tripKey);
  }
```

- [ ] **Step 4: Run focused route URL state tests**

Run:

```bash
rtk npm test -- tests/lib/routeUrlState.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit URL state change**

Run:

```bash
rtk git add src/lib/routeUrlState.js tests/lib/routeUrlState.test.js
rtk git commit -m "feat: preserve shared route state in urls"
```

---

## Task 3: Share Message and Native Payload Helpers

**Files:**

- Modify: `src/lib/shareRoute.js`
- Modify: `tests/lib/shareRoute.test.js`

- [ ] **Step 1: Add failing tests for message builders**

Update the import in `tests/lib/shareRoute.test.js`:

```js
import {
  SHARE_CHANNELS,
  buildDepartureShareText,
  buildNativeSharePayload,
  buildRouteShareText,
  buildRouteShareUrl,
  buildSocialShareHref,
} from '../../src/lib/shareRoute.js';
```

Append:

```js
describe('share message builders', () => {
  it('builds compact route-level share text', () => {
    expect(buildRouteShareText({
      routeLabel: 'Imperia -> Sanremo',
      dayTypeLabel: 'Feriale',
      nextDeparture: { departureTime: '14:25', arrivalTime: '15:10', lineId: '12' },
      sourceLabel: 'PDF ufficiale Riviera Trasporti',
    })).toBe('Azzuriva: Imperia -> Sanremo, linea 12, parte 14:25, arriva 15:10. Giorno: Feriale. Orario dal PDF ufficiale Riviera Trasporti.');
  });

  it('builds compact departure-level share text', () => {
    expect(buildDepartureShareText({
      routeLabel: 'Imperia -> Sanremo',
      dayTypeLabel: 'Sabato',
      departure: {
        departureTime: '18:05',
        arrivalTime: '18:45',
        lineId: '12',
      },
      sourceLabel: 'PDF ufficiale Riviera Trasporti',
    })).toBe('Azzuriva: Imperia -> Sanremo, linea 12, parte 18:05, arriva 18:45. Giorno: Sabato. Orario dal PDF ufficiale Riviera Trasporti.');
  });

  it('builds native share payloads with title, text, and url', () => {
    expect(buildNativeSharePayload({
      title: 'Imperia -> Sanremo',
      text: 'Azzuriva route text',
      url: 'https://azzuriva.example/app?tab=search',
    })).toEqual({
      title: 'Imperia -> Sanremo',
      text: 'Azzuriva route text',
      url: 'https://azzuriva.example/app?tab=search',
    });
  });
});
```

- [ ] **Step 2: Run focused failing tests**

Run:

```bash
rtk npm test -- tests/lib/shareRoute.test.js
```

Expected: FAIL with missing exports.

- [ ] **Step 3: Implement share text helpers**

Append to `src/lib/shareRoute.js`:

```js
export function buildRouteShareText({
  routeLabel,
  dayTypeLabel,
  nextDeparture = null,
  sourceLabel = 'PDF ufficiale Riviera Trasporti',
} = {}) {
  if (!nextDeparture) {
    return `Azzuriva: ${routeLabel}. Giorno: ${dayTypeLabel}. Orario dal ${sourceLabel}.`;
  }

  return `Azzuriva: ${routeLabel}, linea ${nextDeparture.lineId}, parte ${nextDeparture.departureTime}, arriva ${nextDeparture.arrivalTime}. Giorno: ${dayTypeLabel}. Orario dal ${sourceLabel}.`;
}

export function buildDepartureShareText({
  routeLabel,
  dayTypeLabel,
  departure,
  sourceLabel = 'PDF ufficiale Riviera Trasporti',
} = {}) {
  return `Azzuriva: ${routeLabel}, linea ${departure.lineId}, parte ${departure.departureTime}, arriva ${departure.arrivalTime}. Giorno: ${dayTypeLabel}. Orario dal ${sourceLabel}.`;
}

export function buildNativeSharePayload({
  title,
  text,
  url,
} = {}) {
  return { title, text, url };
}
```

- [ ] **Step 4: Run focused share helper tests**

Run:

```bash
rtk npm test -- tests/lib/shareRoute.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit share helpers**

Run:

```bash
rtk git add src/lib/shareRoute.js tests/lib/shareRoute.test.js
rtk git commit -m "feat: add route share message builders"
```

---

## Task 4: Results UI for Departure Sharing and Shared Context

**Files:**

- Modify: `src/ui/renderResults.js`
- Modify: `src/lib/i18n.js`
- Modify: `tests/ui/renderResults.test.js`

- [ ] **Step 1: Add failing render tests**

Append to `tests/ui/renderResults.test.js`:

```js
describe('share diffusion UI', () => {
  it('renders departure-level share controls when trip keys exist', () => {
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
      nextDepartures: [
        {
          tripKey: 'selected-trip',
          departureTime: '18:05',
          arrivalTime: '18:45',
          durationMinutes: 40,
          lineId: '12',
          sourcePage: 23,
        },
      ],
      allDepartures: [],
    });

    expect(html).toContain('data-share-departure="selected-trip"');
    expect(html).toContain('Share departure');
  });

  it('renders shared-route recipient context when provided', () => {
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
      sharedRouteContext: {
        visible: true,
        selectedDepartureRestored: true,
      },
    });

    expect(html).toContain('class="shared-route-context"');
    expect(html).toContain('Shared route');
    expect(html).toContain('Save');
    expect(html).toContain('Reverse');
    expect(html).toContain('Share again');
  });
});
```

- [ ] **Step 2: Run focused failing tests**

Run:

```bash
rtk npm test -- tests/ui/renderResults.test.js
```

Expected: FAIL because share controls and context are not rendered.

- [ ] **Step 3: Add i18n labels**

Add these keys to the Italian dictionary in `src/lib/i18n.js`:

```js
    'results.shareDeparture': 'Condividi corsa',
    'results.sharedContext.title': 'Percorso condiviso',
    'results.sharedContext.restored': 'La corsa condivisa e stata ritrovata in questo orario.',
    'results.sharedContext.routeOnly': 'Il percorso condiviso e stato riaperto con l orario corrente.',
    'results.sharedContext.save': 'Salva',
    'results.sharedContext.reverse': 'Inverti',
    'results.sharedContext.shareAgain': 'Condividi ancora',
```

Add these keys to the English dictionary:

```js
    'results.shareDeparture': 'Share departure',
    'results.sharedContext.title': 'Shared route',
    'results.sharedContext.restored': 'The shared departure was found in this timetable.',
    'results.sharedContext.routeOnly': 'The shared route reopened with the current timetable.',
    'results.sharedContext.save': 'Save',
    'results.sharedContext.reverse': 'Reverse',
    'results.sharedContext.shareAgain': 'Share again',
```

Add equivalent direct translations to the existing French, German, and Spanish dictionaries if the file already defines the surrounding `results.share.*` keys for those languages.

- [ ] **Step 4: Render departure share controls**

In `renderDepartureCard` in `src/ui/renderResults.js`, add this button inside `.departure-meta` after the details span and before the PDF link:

```js
        ${departure.tripKey ? `<button type="button" class="departure-share-action" data-share-departure="${escapeHtml(departure.tripKey)}">${escapeHtml(t('results.shareDeparture'))}</button>` : ''}
```

Update the click handling in `src/main.js` in a later task so this button does not trigger card selection.

- [ ] **Step 5: Render shared-route context**

Add a helper in `src/ui/renderResults.js`:

```js
function renderSharedRouteContext(sharedRouteContext, t) {
  if (!sharedRouteContext?.visible) {
    return '';
  }

  const bodyKey = sharedRouteContext.selectedDepartureRestored
    ? 'results.sharedContext.restored'
    : 'results.sharedContext.routeOnly';

  return `
    <section class="shared-route-context">
      <div>
        <p class="eyebrow">${escapeHtml(t('results.sharedContext.title'))}</p>
        <p>${escapeHtml(t(bodyKey))}</p>
      </div>
      <div class="shared-route-actions">
        <button type="button" class="topbar-link" data-save-current-route>${escapeHtml(t('results.sharedContext.save'))}</button>
        <button type="button" class="topbar-link" data-reverse-shared-route>${escapeHtml(t('results.sharedContext.reverse'))}</button>
        <button type="button" class="topbar-link" data-share-current-route>${escapeHtml(t('results.sharedContext.shareAgain'))}</button>
      </div>
    </section>
  `;
}
```

Add `sharedRouteContext = null` to `renderResultsView` parameters and render it directly after the summary card:

```js
      ${renderSharedRouteContext(sharedRouteContext, t)}
```

- [ ] **Step 6: Run focused results render tests**

Run:

```bash
rtk npm test -- tests/ui/renderResults.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit render changes**

Run:

```bash
rtk git add src/ui/renderResults.js src/lib/i18n.js tests/ui/renderResults.test.js
rtk git commit -m "feat: render departure sharing controls"
```

---

## Task 5: Share Wiring, Native Share Fallback, and Inbound Share Analytics

**Files:**

- Modify: `src/main.js`
- Modify: `tests/e2e/app-flow.spec.js` only if a stable route fixture already exists there

- [ ] **Step 1: Import new helpers**

In `src/main.js`, extend analytics imports:

```js
  pushLandingContextEvent,
  pushOutboundClickEvent,
  pushRouteNoDirectViewedEvent,
  pushRouteResultViewedEvent,
  pushShareModalOpenedEvent,
  pushSharedRouteOpenedEvent,
  pushSharedRouteRestoredEvent,
```

Extend share imports:

```js
  buildDepartureShareText,
  buildNativeSharePayload,
  buildRouteShareText,
```

- [ ] **Step 2: Add shared context state**

Add to `state`:

```js
  inboundShare: {
    opened: false,
    restored: false,
    shareScope: null,
    tripKey: null,
    selectedDepartureRestored: false,
  },
```

Add helper:

```js
function currentSourceContext() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('utm_medium') === SHARE_UTM_MEDIUM) {
    return 'share';
  }

  if (document.referrer) {
    return 'organic';
  }

  return 'direct';
}
```

Import `SHARE_UTM_MEDIUM` from `src/lib/shareRoute.js`.

- [ ] **Step 3: Pass shared context to results rendering**

In the `renderResultsView` call, add:

```js
        sharedRouteContext: {
          visible: state.inboundShare.opened,
          selectedDepartureRestored: state.inboundShare.selectedDepartureRestored,
        },
```

- [ ] **Step 4: Preserve shared trip key during hydration**

In `hydrateRouteStateFromUrl`, after `state.browseState = routeUrlState.browse;`, add:

```js
  state.inboundShare = {
    opened: new URLSearchParams(window.location.search).get('utm_medium') === SHARE_UTM_MEDIUM,
    restored: false,
    shareScope: routeUrlState.share.shareScope,
    tripKey: routeUrlState.share.tripKey,
    selectedDepartureRestored: false,
  };
```

- [ ] **Step 5: Restore selected departure after search**

At the end of `submitCurrentSearch`, after `state.resultState` is set, add:

```js
  if (state.resultState?.type === 'results' && state.inboundShare.tripKey) {
    const sharedDeparture = state.resultState.allDepartures.find(
      (departure) => departure.tripKey === state.inboundShare.tripKey,
    );

    if (sharedDeparture) {
      state.resultState = {
        ...state.resultState,
        selectedTripKey: sharedDeparture.tripKey,
      };
      state.inboundShare = {
        ...state.inboundShare,
        selectedDepartureRestored: true,
      };
    }
  }
```

- [ ] **Step 6: Fire landing and shared open analytics on boot**

After `hydrateRouteStateFromUrl();` in `boot`, add:

```js
    const bootParams = new URLSearchParams(window.location.search);
    const parsedRouteState = parseRouteUrlState(window.location.search);

    pushLandingContextEvent(window, {
      tab: state.activeTab,
      hasRouteParams: Boolean(bootParams.get('from') || bootParams.get('to') || bootParams.get('fromStop') || bootParams.get('toStop')),
      hasShareUtm: bootParams.get('utm_medium') === SHARE_UTM_MEDIUM,
      utmSource: bootParams.get('utm_source') ?? '',
      utmMedium: bootParams.get('utm_medium') ?? '',
      utmCampaign: bootParams.get('utm_campaign') ?? '',
      referrerType: document.referrer ? 'referral' : 'direct',
      language: state.language,
    });

    if (bootParams.get('utm_medium') === SHARE_UTM_MEDIUM) {
      pushSharedRouteOpenedEvent(window, {
        utmSource: bootParams.get('utm_source') ?? '',
        shareScope: parsedRouteState.share.shareScope ?? 'route',
        hasCompleteRouteState: shouldRunSearchFromRouteState(parsedRouteState),
        dayType: parsedRouteState.search.dayType,
      });
    }
```

- [ ] **Step 7: Fire result and restore analytics after search**

In `submitCurrentSearch`, after result state is set and before render, add:

```js
  if (state.resultState?.type === 'results') {
    pushRouteResultViewedEvent(window, {
      ...currentRouteActionContext(),
      hasNextDeparture: Boolean(state.resultState.summary.nextDeparture),
      hasTaxiFallback: currentRouteTaxiOptions().length > 0,
      sourceContext: currentSourceContext(),
    });
  }

  if (state.resultState?.type === 'no-direct') {
    pushRouteNoDirectViewedEvent(window, {
      from: state.formValues.fromInput,
      to: state.formValues.toInput,
      dayType: state.formValues.dayType,
      hasTransferSuggestions: Boolean(state.resultState.transferSuggestions?.length),
      hasTaxiFallback: currentRouteTaxiOptions().length > 0,
      sourceContext: currentSourceContext(),
    });
  }

  if (state.inboundShare.opened && !state.inboundShare.restored) {
    pushSharedRouteRestoredEvent(window, {
      restoreStatus: state.resultState?.type === 'results' ? 'results' : (state.resultState?.type === 'no-direct' ? 'no_direct' : 'failed'),
      resultsCount: state.resultState?.type === 'results' ? state.resultState.allDepartures.length : 0,
      selectedDepartureRestored: state.inboundShare.selectedDepartureRestored,
    });
    state.inboundShare = {
      ...state.inboundShare,
      restored: true,
    };
  }
```

- [ ] **Step 8: Add scoped share URL helper**

Add:

```js
function currentRouteAbsoluteUrlWithShare({ shareScope = 'route', tripKey = null } = {}) {
  const params = serializeRouteUrlState({
    ...currentRouteUrlState(),
    share: {
      shareScope,
      tripKey,
    },
  });
  const query = params.toString();

  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
}
```

- [ ] **Step 9: Build share modal state with text**

In `bindSavedRoutes`, replace the single save button listener with a loop so both the summary action and shared-route context action work:

```js
  document.querySelectorAll('[data-save-current-route]').forEach((button) => {
    button.addEventListener('click', () => {
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
  });
```

Replace the single `data-share-current-route` listener with a loop. Inside that loop, build:

```js
    const routeLabel = `${state.formValues.fromInput} -> ${state.formValues.toInput}`;
    const shareText = buildRouteShareText({
      routeLabel,
      dayTypeLabel: createTranslator(state.language)(`search.dayType.${state.formValues.dayType}`),
      nextDeparture: state.resultState?.type === 'results' ? state.resultState.summary.nextDeparture : null,
    });
```

Set modal state:

```js
      shareModal: {
        baseUrl: currentRouteAbsoluteUrlWithShare({ shareScope: 'route' }),
        status: null,
        shareScope: 'route',
        title: routeLabel,
        text: shareText,
      },
```

Call:

```js
    pushShareModalOpenedEvent(window, {
      ...currentRouteActionContext(),
      shareScope: 'route',
    });
```

The surrounding listener should be:

```js
  document.querySelectorAll('[data-share-current-route]').forEach((button) => {
    button.addEventListener('click', () => {
      writeRouteUrl({ push: false });
      const routeLabel = `${state.formValues.fromInput} -> ${state.formValues.toInput}`;
      const shareText = buildRouteShareText({
        routeLabel,
        dayTypeLabel: createTranslator(state.language)(`search.dayType.${state.formValues.dayType}`),
        nextDeparture: state.resultState?.type === 'results' ? state.resultState.summary.nextDeparture : null,
      });

      state.routeActions = {
        ...state.routeActions,
        shareModal: {
          baseUrl: currentRouteAbsoluteUrlWithShare({ shareScope: 'route' }),
          status: null,
          shareScope: 'route',
          title: routeLabel,
          text: shareText,
        },
      };
      pushShareModalOpenedEvent(window, {
        ...currentRouteActionContext(),
        shareScope: 'route',
      });
      renderApp();
      bindInteractions();
      focusShareModal();
    });
  });
```

- [ ] **Step 10: Wire departure share buttons**

In `bindDepartureSelection`, change the link guard to:

```js
      if (event.target.closest('a, button')) {
        return;
      }
```

In `bindSavedRoutes`, add:

```js
  document.querySelectorAll('[data-share-departure]').forEach((button) => {
    button.addEventListener('click', async () => {
      const tripKey = button.dataset.shareDeparture ?? '';
      const departure = state.resultState?.type === 'results'
        ? state.resultState.allDepartures.find((entry) => entry.tripKey === tripKey)
        : null;

      if (!departure) {
        return;
      }

      const routeLabel = `${state.formValues.fromInput} -> ${state.formValues.toInput}`;
      const baseUrl = currentRouteAbsoluteUrlWithShare({ shareScope: 'departure', tripKey });
      const shareUrl = buildRouteShareUrl(baseUrl, 'link');
      const text = buildDepartureShareText({
        routeLabel,
        dayTypeLabel: createTranslator(state.language)(`search.dayType.${state.formValues.dayType}`),
        departure,
      });
      const payload = buildNativeSharePayload({
        title: routeLabel,
        text,
        url: shareUrl,
      });

      if (navigator.share) {
        try {
          await navigator.share(payload);
          pushRouteShareEvent(window, {
            ...currentRouteActionContext(),
            shareMethod: 'native',
            shareUrl,
          });
          return;
        } catch (error) {
          if (error?.name === 'AbortError') {
            return;
          }
        }
      }

      state.routeActions = {
        ...state.routeActions,
        shareModal: {
          baseUrl,
          status: null,
          shareScope: 'departure',
          title: routeLabel,
          text,
        },
      };
      pushShareModalOpenedEvent(window, {
        ...currentRouteActionContext(),
        shareScope: 'departure',
      });
      renderApp();
      bindInteractions();
      focusShareModal();
    });
  });
```

- [ ] **Step 11: Use modal text in social links**

In `renderShareModal` in `src/ui/renderResults.js`, set:

```js
  const shareText = shareModal.text || routeLabel;
```

Pass `text: shareText` to `buildSocialShareHref`.

- [ ] **Step 12: Add reverse shared route action**

In `bindSavedRoutes`, add:

```js
  document.querySelector('[data-reverse-shared-route]')?.addEventListener('click', () => {
    state.formValues = {
      ...state.formValues,
      fromInput: state.formValues.toInput,
      fromLocalityId: null,
      fromStopId: state.formValues.toStopId,
      toInput: state.formValues.fromInput,
      toStopId: state.formValues.fromStopId,
    };
    clearRouteResults();
    writeRouteUrl({ push: true });
    restoreSearchResultsIfReady();
    renderApp();
    bindInteractions();
  });
```

- [ ] **Step 13: Run focused app flow tests**

Run:

```bash
rtk npm test -- tests/lib/shareRoute.test.js tests/lib/routeUrlState.test.js tests/lib/analytics.test.js tests/ui/renderResults.test.js
```

Expected: PASS.

- [ ] **Step 14: Commit app sharing wiring**

Run:

```bash
rtk git add src/main.js src/ui/renderResults.js tests/ui/renderResults.test.js
rtk git commit -m "feat: wire shared route restoration"
```

---

## Task 6: Static SEO Page Data Helpers

**Files:**

- Create: `scripts/lib/seoPageData.mjs`
- Create: `tests/scripts/seoPageData.test.js`

- [ ] **Step 1: Write failing tests for slug and candidate helpers**

Create `tests/scripts/seoPageData.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  buildLinePageSummaries,
  buildPlacePageSummaries,
  buildRoutePageCandidates,
  slugifySegment,
} from '../../scripts/lib/seoPageData.mjs';

const stops = [
  { id: 'imperia', canonical: 'Imperia' },
  { id: 'sanremo', canonical: 'Sanremo Autostazione' },
  { id: 'ventimiglia', canonical: 'Ventimiglia' },
];

const localities = [
  { id: 'imperia', label: 'Imperia', stopIds: ['imperia'] },
  { id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo'] },
  { id: 'ventimiglia', label: 'Ventimiglia', stopIds: ['ventimiglia'] },
];

const trips = [
  {
    lineId: '12',
    direction: 'Imperia - Sanremo',
    dayType: 'feriale',
    sourcePage: 23,
    stops: [
      { stopId: 'imperia', name: 'Imperia', time: '08:00' },
      { stopId: 'sanremo', name: 'Sanremo', time: '08:45' },
    ],
  },
  {
    lineId: '1',
    direction: 'Sanremo - Ventimiglia',
    dayType: 'feriale',
    sourcePage: 3,
    stops: [
      { stopId: 'sanremo', name: 'Sanremo', time: '09:00' },
      { stopId: 'ventimiglia', name: 'Ventimiglia', time: '09:55' },
    ],
  },
];

describe('seoPageData', () => {
  it('creates stable lowercase ASCII slugs', () => {
    expect(slugifySegment('Sanremo Autostazione')).toBe('sanremo-autostazione');
    expect(slugifySegment('Ventimiglia - Via Cavour')).toBe('ventimiglia-via-cavour');
  });

  it('builds direct route page candidates with real trips only', () => {
    const candidates = buildRoutePageCandidates({ trips, stops, localities, limit: 10 });

    expect(candidates.map((candidate) => candidate.slug)).toContain('imperia/sanremo');
    expect(candidates.find((candidate) => candidate.slug === 'imperia/ventimiglia')).toBeUndefined();
    expect(candidates[0]).toMatchObject({
      fromLocalityId: 'imperia',
      toLocalityId: 'sanremo',
      lineIds: ['12'],
      dayTypes: ['feriale'],
    });
  });

  it('builds place summaries with direct destinations', () => {
    const summaries = buildPlacePageSummaries({ trips, stops, localities });

    expect(summaries.find((place) => place.localityId === 'imperia')).toMatchObject({
      slug: 'imperia',
      label: 'Imperia',
      directDestinations: [{ id: 'sanremo', label: 'Sanremo', slug: 'sanremo' }],
    });
  });

  it('builds line page summaries', () => {
    const summaries = buildLinePageSummaries({ trips, stops });

    expect(summaries.find((line) => line.lineId === '12')).toMatchObject({
      slug: '12',
      lineId: '12',
      directions: ['Imperia - Sanremo'],
    });
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
rtk npm test -- tests/scripts/seoPageData.test.js
```

Expected: FAIL because `scripts/lib/seoPageData.mjs` does not exist.

- [ ] **Step 3: Implement helpers**

Create `scripts/lib/seoPageData.mjs`:

```js
function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareLineIds(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true });
}

export function slugifySegment(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function localitiesByStopId(localities = []) {
  const map = new Map();

  for (const locality of localities) {
    for (const stopId of locality.stopIds ?? []) {
      if (!map.has(stopId)) {
        map.set(stopId, locality);
      }
    }
  }

  return map;
}

function uniqueSorted(values, compare = compareText) {
  return [...new Set(values.filter(Boolean))].sort(compare);
}

export function buildRoutePageCandidates({
  trips = [],
  localities = [],
  limit = 50,
} = {}) {
  const localityByStop = localitiesByStopId(localities);
  const candidates = new Map();

  for (const trip of trips) {
    const tripStops = trip.stops ?? [];

    for (let fromIndex = 0; fromIndex < tripStops.length; fromIndex += 1) {
      const fromLocality = localityByStop.get(tripStops[fromIndex].stopId);

      if (!fromLocality) {
        continue;
      }

      for (let toIndex = fromIndex + 1; toIndex < tripStops.length; toIndex += 1) {
        const toLocality = localityByStop.get(tripStops[toIndex].stopId);

        if (!toLocality || toLocality.id === fromLocality.id) {
          continue;
        }

        const fromSlug = slugifySegment(fromLocality.label);
        const toSlug = slugifySegment(toLocality.label);
        const key = `${fromLocality.id}->${toLocality.id}`;

        if (!candidates.has(key)) {
          candidates.set(key, {
            fromLocalityId: fromLocality.id,
            fromLabel: fromLocality.label,
            fromSlug,
            toLocalityId: toLocality.id,
            toLabel: toLocality.label,
            toSlug,
            slug: `${fromSlug}/${toSlug}`,
            lineIds: new Set(),
            dayTypes: new Set(),
            departures: [],
          });
        }

        const candidate = candidates.get(key);
        candidate.lineIds.add(trip.lineId);
        candidate.dayTypes.add(trip.dayType);
        candidate.departures.push({
          lineId: trip.lineId,
          dayType: trip.dayType,
          direction: trip.direction,
          sourcePage: trip.sourcePage,
          departureTime: tripStops[fromIndex].time,
          arrivalTime: tripStops[toIndex].time,
        });
      }
    }
  }

  return [...candidates.values()]
    .map((candidate) => ({
      ...candidate,
      lineIds: uniqueSorted([...candidate.lineIds], compareLineIds),
      dayTypes: uniqueSorted([...candidate.dayTypes]),
      departures: candidate.departures
        .sort((left, right) => compareText(left.departureTime, right.departureTime))
        .slice(0, 12),
    }))
    .sort((left, right) => right.departures.length - left.departures.length || compareText(left.slug, right.slug))
    .slice(0, limit);
}

export function buildPlacePageSummaries({ trips = [], localities = [] } = {}) {
  const localityByStop = localitiesByStopId(localities);
  const summaries = new Map(localities.map((locality) => [locality.id, {
    localityId: locality.id,
    label: locality.label,
    slug: slugifySegment(locality.label),
    stopIds: locality.stopIds ?? [],
    directDestinations: new Map(),
    lineIds: new Set(),
  }]));

  for (const trip of trips) {
    const tripStops = trip.stops ?? [];

    for (let fromIndex = 0; fromIndex < tripStops.length; fromIndex += 1) {
      const fromLocality = localityByStop.get(tripStops[fromIndex].stopId);

      if (!fromLocality || !summaries.has(fromLocality.id)) {
        continue;
      }

      const summary = summaries.get(fromLocality.id);
      summary.lineIds.add(trip.lineId);

      for (let toIndex = fromIndex + 1; toIndex < tripStops.length; toIndex += 1) {
        const toLocality = localityByStop.get(tripStops[toIndex].stopId);

        if (!toLocality || toLocality.id === fromLocality.id) {
          continue;
        }

        summary.directDestinations.set(toLocality.id, {
          id: toLocality.id,
          label: toLocality.label,
          slug: slugifySegment(toLocality.label),
        });
      }
    }
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      directDestinations: [...summary.directDestinations.values()].sort((left, right) => compareText(left.label, right.label)),
      lineIds: uniqueSorted([...summary.lineIds], compareLineIds),
    }))
    .filter((summary) => summary.directDestinations.length || summary.lineIds.length)
    .sort((left, right) => compareText(left.label, right.label));
}

export function buildLinePageSummaries({ trips = [], stops = [] } = {}) {
  const stopsById = new Map(stops.map((stop) => [stop.id, stop]));
  const summaries = new Map();

  for (const trip of trips) {
    if (!summaries.has(trip.lineId)) {
      summaries.set(trip.lineId, {
        lineId: trip.lineId,
        slug: slugifySegment(trip.lineId),
        directions: new Set(),
        stopIds: new Set(),
        stops: [],
        dayTypes: new Set(),
        sourcePages: new Set(),
      });
    }

    const summary = summaries.get(trip.lineId);
    summary.directions.add(trip.direction);
    summary.dayTypes.add(trip.dayType);
    summary.sourcePages.add(trip.sourcePage);

    for (const tripStop of trip.stops ?? []) {
      if (!tripStop.stopId || summary.stopIds.has(tripStop.stopId)) {
        continue;
      }

      summary.stopIds.add(tripStop.stopId);
      summary.stops.push({
        id: tripStop.stopId,
        canonical: stopsById.get(tripStop.stopId)?.canonical ?? tripStop.name,
      });
    }
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      directions: uniqueSorted([...summary.directions]),
      dayTypes: uniqueSorted([...summary.dayTypes]),
      sourcePages: uniqueSorted([...summary.sourcePages], (left, right) => Number(left) - Number(right)),
    }))
    .sort((left, right) => compareLineIds(left.lineId, right.lineId));
}
```

- [ ] **Step 4: Run focused data helper tests**

Run:

```bash
rtk npm test -- tests/scripts/seoPageData.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit SEO data helpers**

Run:

```bash
rtk git add scripts/lib/seoPageData.mjs tests/scripts/seoPageData.test.js
rtk git commit -m "feat: add seo page data helpers"
```

---

## Task 7: Static SEO HTML Renderer

**Files:**

- Create: `scripts/lib/renderSeoPageHtml.mjs`
- Create: `tests/scripts/renderSeoPageHtml.test.js`

- [ ] **Step 1: Write failing renderer tests**

Create `tests/scripts/renderSeoPageHtml.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  renderLinePageHtml,
  renderPlacePageHtml,
  renderRoutePageHtml,
} from '../../scripts/lib/renderSeoPageHtml.mjs';

const site = {
  baseUrl: 'https://pualien.github.io/riviera-trasporti-schedules',
  appPath: '/',
};

const metadata = {
  source: {
    title: 'Official PDF',
    url: 'https://example.com/orario.pdf',
    effectiveDate: '2026-04-01',
  },
  builtAt: '2026-05-28T10:00:00.000Z',
};

describe('renderSeoPageHtml', () => {
  it('renders a route page with canonical, facts, and app CTA', () => {
    const html = renderRoutePageHtml({
      site,
      metadata,
      route: {
        slug: 'imperia/sanremo',
        fromLabel: 'Imperia',
        toLabel: 'Sanremo',
        lineIds: ['12'],
        dayTypes: ['feriale'],
        departures: [
          {
            lineId: '12',
            dayType: 'feriale',
            departureTime: '08:00',
            arrivalTime: '08:45',
            sourcePage: 23,
          },
        ],
      },
    });

    expect(html).toContain('<html lang="it">');
    expect(html).toContain('<link rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/routes/imperia/sanremo/">');
    expect(html).toContain('Bus Imperia - Sanremo');
    expect(html).toContain('Linea 12');
    expect(html).toContain('08:00');
    expect(html).toContain('https://example.com/orario.pdf#page=23');
    expect(html).toContain('?tab=search');
    expect(html).toContain('from=Imperia');
    expect(html).toContain('to=Sanremo');
  });

  it('renders place and line pages with self-canonical URLs', () => {
    const placeHtml = renderPlacePageHtml({
      site,
      metadata,
      place: {
        slug: 'sanremo',
        label: 'Sanremo',
        directDestinations: [{ label: 'Imperia', slug: 'imperia' }],
        lineIds: ['12'],
        stopIds: ['sanremo-autostazione'],
      },
    });
    const lineHtml = renderLinePageHtml({
      site,
      metadata,
      line: {
        slug: '12',
        lineId: '12',
        directions: ['Imperia - Sanremo'],
        dayTypes: ['feriale'],
        sourcePages: [23],
        stops: [{ canonical: 'Sanremo Autostazione' }],
      },
    });

    expect(placeHtml).toContain('/places/sanremo/');
    expect(placeHtml).toContain('Destinazioni dirette');
    expect(lineHtml).toContain('/lines/12/');
    expect(lineHtml).toContain('Riviera Trasporti linea 12');
  });
});
```

- [ ] **Step 2: Run failing renderer tests**

Run:

```bash
rtk npm test -- tests/scripts/renderSeoPageHtml.test.js
```

Expected: FAIL because renderer module does not exist.

- [ ] **Step 3: Implement renderer**

Create `scripts/lib/renderSeoPageHtml.mjs`:

```js
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function absoluteUrl(site, path) {
  return `${site.baseUrl.replace(/\/$/, '')}${path}`;
}

function pageShell({ title, description, canonicalUrl, body }) {
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <link rel="stylesheet" href="/riviera-trasporti-schedules/styles.css" />
  </head>
  <body>
    <main class="app-shell seo-static-page">
      ${body}
    </main>
  </body>
</html>
`;
}

function freshnessCopy(metadata) {
  return `Orario dal PDF ufficiale ${escapeHtml(metadata.source.title)}. Valido dal ${escapeHtml(metadata.source.effectiveDate)}. Dati generati il ${escapeHtml(metadata.builtAt.slice(0, 10))}.`;
}

function appRouteHref({ from, to, dayType = 'feriale' }) {
  const params = new URLSearchParams({
    tab: 'search',
    from,
    to,
    day: dayType,
  });

  return `/riviera-trasporti-schedules/?${params.toString()}`;
}

export function renderRoutePageHtml({ site, metadata, route }) {
  const canonicalPath = `/routes/${route.slug}/`;
  const title = `Bus ${route.fromLabel} - ${route.toLabel} | Azzuriva`;
  const description = `Consulta le corse dirette Riviera Trasporti da ${route.fromLabel} a ${route.toLabel}, con linee, orari rappresentativi e link al PDF ufficiale.`;
  const departures = route.departures.map((departure) => `
        <tr>
          <td>${escapeHtml(departure.dayType)}</td>
          <td>Linea ${escapeHtml(departure.lineId)}</td>
          <td>${escapeHtml(departure.departureTime)}</td>
          <td>${escapeHtml(departure.arrivalTime)}</td>
          <td><a href="${escapeHtml(metadata.source.url)}#page=${escapeHtml(departure.sourcePage)}">PDF pagina ${escapeHtml(departure.sourcePage)}</a></td>
        </tr>`).join('');
  const body = `
      <a class="topbar-link" href="/riviera-trasporti-schedules/">Azzuriva</a>
      <h1>Bus ${escapeHtml(route.fromLabel)} - ${escapeHtml(route.toLabel)}</h1>
      <p>${description}</p>
      <p>${freshnessCopy(metadata)}</p>
      <p>Linee dirette: ${route.lineIds.map((lineId) => `Linea ${escapeHtml(lineId)}`).join(', ')}.</p>
      <table>
        <thead><tr><th>Giorno</th><th>Linea</th><th>Partenza</th><th>Arrivo</th><th>Fonte</th></tr></thead>
        <tbody>${departures}</tbody>
      </table>
      <p><a class="search-form-submit" href="${escapeHtml(appRouteHref({ from: route.fromLabel, to: route.toLabel, dayType: route.dayTypes[0] ?? 'feriale' }))}">Apri in Azzuriva</a></p>
      <p>Azzuriva mostra corse dirette derivate dal PDF ufficiale. Per cambi, ritardi e conferme operative consulta sempre la fonte ufficiale.</p>`;

  return pageShell({
    title,
    description,
    canonicalUrl: absoluteUrl(site, canonicalPath),
    body,
  });
}

export function renderPlacePageHtml({ site, metadata, place }) {
  const canonicalPath = `/places/${place.slug}/`;
  const title = `Bus da ${place.label} | Azzuriva`;
  const description = `Fermate, linee e destinazioni dirette Riviera Trasporti da ${place.label}.`;
  const destinations = place.directDestinations.map((destination) => `
        <li><a href="/riviera-trasporti-schedules/routes/${place.slug}/${destination.slug}/">${escapeHtml(destination.label)}</a></li>`).join('');
  const body = `
      <a class="topbar-link" href="/riviera-trasporti-schedules/">Azzuriva</a>
      <h1>Bus da ${escapeHtml(place.label)}</h1>
      <p>${description}</p>
      <p>${freshnessCopy(metadata)}</p>
      <h2>Destinazioni dirette</h2>
      <ul>${destinations}</ul>
      <p>Linee: ${place.lineIds.map((lineId) => `Linea ${escapeHtml(lineId)}`).join(', ')}.</p>`;

  return pageShell({
    title,
    description,
    canonicalUrl: absoluteUrl(site, canonicalPath),
    body,
  });
}

export function renderLinePageHtml({ site, metadata, line }) {
  const canonicalPath = `/lines/${line.slug}/`;
  const title = `Riviera Trasporti linea ${line.lineId} | Azzuriva`;
  const description = `Fermate e direzioni della linea ${line.lineId} Riviera Trasporti, con link al PDF ufficiale.`;
  const stops = line.stops.map((stop) => `<li>${escapeHtml(stop.canonical)}</li>`).join('');
  const pages = line.sourcePages.map((page) => `<a href="${escapeHtml(metadata.source.url)}#page=${escapeHtml(page)}">pagina ${escapeHtml(page)}</a>`).join(', ');
  const body = `
      <a class="topbar-link" href="/riviera-trasporti-schedules/">Azzuriva</a>
      <h1>Riviera Trasporti linea ${escapeHtml(line.lineId)}</h1>
      <p>${description}</p>
      <p>${freshnessCopy(metadata)}</p>
      <p>Direzioni: ${line.directions.map(escapeHtml).join(' / ')}.</p>
      <p>Fonte PDF: ${pages}.</p>
      <h2>Fermate servite</h2>
      <ul>${stops}</ul>`;

  return pageShell({
    title,
    description,
    canonicalUrl: absoluteUrl(site, canonicalPath),
    body,
  });
}
```

- [ ] **Step 4: Run focused renderer tests**

Run:

```bash
rtk npm test -- tests/scripts/renderSeoPageHtml.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit renderer**

Run:

```bash
rtk git add scripts/lib/renderSeoPageHtml.mjs tests/scripts/renderSeoPageHtml.test.js
rtk git commit -m "feat: render static seo pages"
```

---

## Task 8: SEO Page Generation Script and Package Command

**Files:**

- Create: `scripts/generate-seo-pages.mjs`
- Create: `tests/scripts/generateSeoPages.test.js`
- Modify: `package.json`
- Modify: `tests/scripts/packageScripts.test.js`

- [ ] **Step 1: Add package script test**

In `tests/scripts/packageScripts.test.js`, add an assertion inside the existing package script test:

```js
expect(packageJson.scripts['build:seo']).toBe('node scripts/generate-seo-pages.mjs');
```

- [ ] **Step 2: Write failing generator test**

Create `tests/scripts/generateSeoPages.test.js`:

```js
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { generateSeoPages } from '../../scripts/generate-seo-pages.mjs';

describe('generateSeoPages', () => {
  it('writes route, place, line, sitemap, robots, and 404 files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'azzuriva-seo-'));

    try {
      await mkdir(join(root, 'assets/data'), { recursive: true });
      await writeFile(join(root, 'assets/data/metadata.json'), JSON.stringify({
        source: {
          title: 'Official PDF',
          url: 'https://example.com/orario.pdf',
          effectiveDate: '2026-04-01',
        },
        builtAt: '2026-05-28T10:00:00.000Z',
      }));
      await writeFile(join(root, 'assets/data/stops.json'), JSON.stringify([
        { id: 'imperia', canonical: 'Imperia' },
        { id: 'sanremo', canonical: 'Sanremo' },
      ]));
      await writeFile(join(root, 'assets/data/localities.json'), JSON.stringify([
        { id: 'imperia', label: 'Imperia', stopIds: ['imperia'] },
        { id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo'] },
      ]));
      await writeFile(join(root, 'assets/data/trips.json'), JSON.stringify([
        {
          lineId: '12',
          direction: 'Imperia - Sanremo',
          dayType: 'feriale',
          sourcePage: 23,
          stops: [
            { stopId: 'imperia', name: 'Imperia', time: '08:00' },
            { stopId: 'sanremo', name: 'Sanremo', time: '08:45' },
          ],
        },
      ]));

      const result = await generateSeoPages({ rootDir: root, routeLimit: 5 });

      expect(result.routeCount).toBe(1);
      expect(await readFile(join(root, 'routes/imperia/sanremo/index.html'), 'utf8')).toContain('Bus Imperia - Sanremo');
      expect(await readFile(join(root, 'places/imperia/index.html'), 'utf8')).toContain('Bus da Imperia');
      expect(await readFile(join(root, 'lines/12/index.html'), 'utf8')).toContain('linea 12');
      expect(await readFile(join(root, 'sitemap.xml'), 'utf8')).toContain('/routes/imperia/sanremo/');
      expect(await readFile(join(root, 'robots.txt'), 'utf8')).toContain('Sitemap:');
      expect(await readFile(join(root, '404.html'), 'utf8')).toContain('Azzuriva');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
rtk npm test -- tests/scripts/generateSeoPages.test.js tests/scripts/packageScripts.test.js
```

Expected: FAIL because the generator and package script do not exist.

- [ ] **Step 4: Implement generator**

Create `scripts/generate-seo-pages.mjs`:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildLinePageSummaries,
  buildPlacePageSummaries,
  buildRoutePageCandidates,
} from './lib/seoPageData.mjs';
import {
  renderLinePageHtml,
  renderPlacePageHtml,
  renderRoutePageHtml,
} from './lib/renderSeoPageHtml.mjs';

const DEFAULT_SITE = {
  baseUrl: 'https://pualien.github.io/riviera-trasporti-schedules',
  appPath: '/',
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writePage(rootDir, pathSegments, html) {
  const dir = join(rootDir, ...pathSegments);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html);
}

function sitemapXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`;
}

export async function generateSeoPages({
  rootDir = process.cwd(),
  routeLimit = 50,
  site = DEFAULT_SITE,
} = {}) {
  const dataDir = join(rootDir, 'assets/data');
  const [metadata, trips, stops, localities] = await Promise.all([
    readJson(join(dataDir, 'metadata.json')),
    readJson(join(dataDir, 'trips.json')),
    readJson(join(dataDir, 'stops.json')),
    readJson(join(dataDir, 'localities.json')),
  ]);
  const routes = buildRoutePageCandidates({ trips, stops, localities, limit: routeLimit });
  const places = buildPlacePageSummaries({ trips, stops, localities });
  const lines = buildLinePageSummaries({ trips, stops });
  const urls = [site.baseUrl];

  for (const route of routes) {
    await writePage(rootDir, ['routes', route.fromSlug, route.toSlug], renderRoutePageHtml({ site, metadata, route }));
    urls.push(`${site.baseUrl}/routes/${route.slug}/`);
  }

  for (const place of places) {
    await writePage(rootDir, ['places', place.slug], renderPlacePageHtml({ site, metadata, place }));
    urls.push(`${site.baseUrl}/places/${place.slug}/`);
  }

  for (const line of lines) {
    await writePage(rootDir, ['lines', line.slug], renderLinePageHtml({ site, metadata, line }));
    urls.push(`${site.baseUrl}/lines/${line.slug}/`);
  }

  await writeFile(join(rootDir, 'sitemap.xml'), sitemapXml(urls));
  await writeFile(join(rootDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
  await writeFile(join(rootDir, '404.html'), '<!doctype html><html lang="it"><head><meta charset="UTF-8"><title>Azzuriva</title><meta http-equiv="refresh" content="0; url=/riviera-trasporti-schedules/"></head><body><a href="/riviera-trasporti-schedules/">Azzuriva</a></body></html>\n');

  return {
    routeCount: routes.length,
    placeCount: places.length,
    lineCount: lines.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await generateSeoPages();
  console.log(`Generated ${result.routeCount} route pages, ${result.placeCount} place pages, ${result.lineCount} line pages.`);
}
```

- [ ] **Step 5: Add package script**

In `package.json`, add:

```json
"build:seo": "node scripts/generate-seo-pages.mjs"
```

- [ ] **Step 6: Run focused generator tests**

Run:

```bash
rtk npm test -- tests/scripts/generateSeoPages.test.js tests/scripts/packageScripts.test.js
```

Expected: PASS.

- [ ] **Step 7: Run the generator locally**

Run:

```bash
rtk npm run build:seo
```

Expected: outputs a generated page count and writes `routes/`, `places/`, `lines/`, `sitemap.xml`, `robots.txt`, and `404.html`.

- [ ] **Step 8: Commit generated SEO infrastructure**

Run:

```bash
rtk git add scripts/generate-seo-pages.mjs scripts/lib/seoPageData.mjs scripts/lib/renderSeoPageHtml.mjs tests/scripts/generateSeoPages.test.js tests/scripts/packageScripts.test.js package.json package-lock.json routes places lines sitemap.xml robots.txt 404.html
rtk git commit -m "feat: generate static seo pages"
```

---

## Task 9: Outbound and Browse Interaction Wiring

**Files:**

- Modify: `src/main.js`
- Modify: `tests/lib/analytics.test.js` only if helper payloads need adjustment

- [ ] **Step 1: Add outbound click binding**

In `bindInteractions`, call a new helper:

```js
  bindOutboundAnalytics();
```

Add:

```js
function outboundTargetType(link) {
  const href = link.href ?? '';

  if (href.includes('.pdf')) {
    return 'official_pdf';
  }

  if (href.startsWith('tel:')) {
    return 'taxi_call';
  }

  if (href.includes('trenitalia')) {
    return 'train';
  }

  if (href.includes('flixbus')) {
    return 'flixbus';
  }

  if (href.includes('blablacar')) {
    return 'blablacar';
  }

  if (href.includes('wa.me') || href.includes('t.me') || href.includes('facebook.com/sharer') || href.includes('twitter.com/intent')) {
    return 'social_share';
  }

  return 'external';
}

function currentOutboundContext() {
  if (state.resultState?.type === 'results') {
    return 'result';
  }

  if (state.resultState?.type === 'no-direct') {
    return 'no_direct';
  }

  if (isProviderSearchTab(state.activeTab)) {
    return 'provider_tab';
  }

  return 'shell';
}

function bindOutboundAnalytics() {
  document.querySelectorAll('a[href^="http"], a[href^="tel:"]').forEach((link) => {
    link.addEventListener('click', () => {
      pushOutboundClickEvent(window, {
        targetType: outboundTargetType(link),
        context: currentOutboundContext(),
      });
    });
  });
}
```

- [ ] **Step 2: Wire browse interaction events**

In browse mode button handlers, line selection handlers, stop selection handlers, and browse filter input handlers inside `bindBrowseActions`, push:

```js
pushBrowseInteractionEvent(window, {
  browseAction: 'mode_changed',
  mode: state.browseState.mode,
  queryPresent: Boolean(state.browseState.query),
});
```

Use `browseAction` values:

- `mode_changed`
- `line_selected`
- `stop_selected`
- `filter_changed`
- `search_from_here`
- `search_to_here`

- [ ] **Step 3: Run focused analytics and app tests**

Run:

```bash
rtk npm test -- tests/lib/analytics.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit interaction analytics wiring**

Run:

```bash
rtk git add src/main.js
rtk git commit -m "feat: track outbound and browse interactions"
```

---

## Task 10: End-to-End Verification and Cleanup

**Files:**

- Modify: `tests/e2e/app-flow.spec.js` if adding a stable smoke assertion
- Modify: `README.md` only if documenting `build:seo` is useful for maintainers

- [ ] **Step 1: Run unit tests**

Run:

```bash
rtk npm test
```

Expected: PASS.

- [ ] **Step 2: Run smoke tests**

Run:

```bash
rtk npm run test:smoke
```

Expected: PASS.

- [ ] **Step 3: Check generated pages manually through static server**

Run:

```bash
rtk python3 -m http.server 4173
```

Open:

- `http://localhost:4173/routes/imperia/sanremo/`
- `http://localhost:4173/places/sanremo/`
- `http://localhost:4173/lines/12/`

Expected:

- each page renders nonblank HTML
- each page has a self-canonical URL
- route page "Apri in Azzuriva" opens the SPA with `tab=search`, `from`, `to`, and `day`

Stop the server after verification.

- [ ] **Step 4: Run git diff review**

Run:

```bash
rtk git status --short
rtk git diff --check
```

Expected:

- no whitespace errors
- only intended files changed

- [ ] **Step 5: Commit final docs or smoke updates**

If `README.md` or e2e tests changed, run:

```bash
rtk git add README.md tests/e2e/app-flow.spec.js
rtk git commit -m "docs: document seo page generation"
```

If no files changed, do not create an empty commit.

---

## Final Verification

Run:

```bash
rtk npm test
rtk npm run test:smoke
rtk npm run build:seo
rtk git status --short
```

Expected:

- all tests pass
- SEO pages generate successfully
- working tree is clean except for intentional uncommitted changes requested by the user

---

## Implementation Notes

- Keep static generated pages factual and terse. They must not become doorway pages with repeated city-name swaps and no route facts.
- Do not log geolocation, raw referrer URLs, or full shared URLs as primary analytics dimensions.
- Do not add ads inside the search form, result list, selected-trip map, or share modal while working on this plan.
- Do not refactor the PDF parser during this work.
- Use existing UI vocabulary: `topbar-link`, `search-form-submit`, `departure-card`, and existing shell classes before adding new styles.
