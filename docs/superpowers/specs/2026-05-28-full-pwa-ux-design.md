# Full PWA UX Design

## Summary

Upgrade Azzuriva from a basic app-shell PWA into a visible, installable, offline-aware Progressive Web App.

The current root app already has a manifest, a service worker, and app-shell caching, but the experience is mostly invisible. Generated SEO pages do not participate in the PWA metadata/registration path, the service-worker cache does not fully match the versioned assets loaded by HTML, and users do not get clear install, offline, or update feedback.

The selected approach is an integrated PWA shell. PWA controls should live inside the existing utility-focused app UI instead of becoming a marketing surface.

## Goals

- Make the app installable with complete manifest metadata and useful shortcuts.
- Give users visible install, offline, and update controls in the main app shell.
- Keep direct route search, Browse, Saved, and shareable route restoration usable after a successful first load.
- Wire generated route, line, and place pages into the same PWA identity through manifest, theme, icon, and service-worker registration metadata.
- Provide graceful offline fallback behavior for navigations and unavailable live dependencies.
- Keep the implementation static-site and GitHub Pages friendly.

## Non-Goals

- Offline map tiles.
- Offline Overpass, browser geolocation provider responses, or live transport data.
- Native push notifications.
- Background sync.
- A marketing landing page or onboarding flow.
- Changing the app's core route-search behavior.

## User Experience

### App Shell PWA Control

Add a compact PWA control area to the existing shell, near the header or top navigation where utility actions already fit. It should not dominate the route-search workflow.

The control should support these states:

- Install available: show an install action.
- Installed or prompt unavailable: hide the install action.
- Offline: show a clear offline status.
- Back online: remove the offline status.
- Update available: show an update action that activates the waiting service worker and reloads the page.
- Service worker unsupported: hide PWA-specific controls and leave the app working normally.

The copy should be short and practical. The app should avoid technical labels such as "service worker" in user-facing text.

### Install Flow

Listen for `beforeinstallprompt` and hold the event until the user chooses the install action. If the browser does not expose the prompt, no install button should be shown.

After the user accepts, dismiss the install action. If the user dismisses the prompt, keep the app usable and avoid repeatedly forcing the prompt.

The app should also listen for `appinstalled` and update internal PWA state so the install action disappears.

### Offline Flow

When the browser goes offline, show a subtle status in the shell. The status should explain that saved timetable data remains available while live map/location features may not be.

Offline route lookup should continue to work from cached app-shell and JSON assets after the app has loaded once. Browse, Saved, and share links should use the same cached app state.

Live-only features can fail gracefully:

- nearby-stop live provider lookup can show the existing unavailable flow
- geolocation denial/unavailability remains handled by the nearby-stop picker
- map tiles can fail without breaking the route result

### Update Flow

When a new service worker reaches the waiting state, show an update action. Activating the update should message the waiting worker to skip waiting, then reload once the new worker controls the page.

This keeps long-lived installed app sessions from remaining stale after deployments.

### SEO Pages

Generated static pages under `routes/`, `places/`, and `lines/` should include:

- manifest link
- theme color
- app icons/apple touch icon
- small service-worker registration script

These pages should not gain the full app shell, but they should identify as part of the installable app and contribute to runtime caching when visited.

## Manifest

Keep the existing Azzuriva identity and add richer PWA metadata where supported:

- `id`
- `start_url`
- `scope`
- `display: standalone`
- `background_color`
- `theme_color`
- icons with maskable support
- shortcuts for Search, Browse, and Saved
- screenshots generated from the app for desktop and mobile install surfaces

Shortcuts should target stable in-app URLs:

- Search: `./?tab=search`
- Browse: `./?tab=browse`
- Saved: `./?tab=saved`

## Service Worker

The service worker should be updated around three behaviors.

### Precache

Precache the root app shell and required JSON/module assets needed for offline route lookup. The cache list should match the actual URLs requested by HTML, including versioned query strings where they are part of the shipped HTML.

Required assets should still fail installation if missing. Optional generated/local data should remain best-effort.

### Runtime Cache

Runtime-cache same-origin GET responses that are safe to cache, especially generated route, place, and line HTML pages visited by the user.

Avoid caching opaque cross-origin dependencies. External scripts, map tiles, and provider requests should not be treated as core offline dependencies.

### Navigation Fallback

For same-origin navigation requests that fail offline:

- Return the cached requested page if available.
- Otherwise return a cached offline fallback page.
- For app routes that should hydrate into the SPA, fallback to cached `index.html`.

The fallback should be small, branded, and useful. It should link back to the root app and explain that a previous online load is needed for full route lookup.

## Architecture

### New PWA Controller

Add `src/lib/pwaController.js` as a pure-ish browser integration module. It should own:

- support detection
- service-worker registration
- update detection
- waiting-worker activation
- `beforeinstallprompt` capture
- install prompt invocation
- `appinstalled` handling
- online/offline status tracking

The controller should expose a small interface that `src/main.js` can bind to the existing app state/render cycle. Avoid scattering service-worker lifecycle code through the main route-search logic.

### App State

Add a small PWA state object to `src/main.js`, for example:

- `installAvailable`
- `isInstalled`
- `isOnline`
- `updateAvailable`
- `pwaSupported`

The state should update through controller callbacks and trigger normal app re-rendering.

### UI Renderer

Add or extend a renderer for the PWA control. Keep it separate from route-search logic so tests can verify each state independently.

The renderer should output stable data attributes for event binding and tests.

### SEO Generator

Update `scripts/lib/renderSeoPageHtml.mjs` to render shared PWA head tags and a small registration script. The generator should derive paths through existing `publicPath(site, ...)` helpers so GitHub Pages subpath deployment remains correct.

## Data Flow

Initial root app boot:

1. load timetable bootstrap data
2. create PWA controller
3. register the service worker if supported
4. render shell with current PWA state
5. update PWA state when install, offline, online, or update events fire

Install:

1. browser fires `beforeinstallprompt`
2. controller stores the event and reports install availability
3. user clicks install
4. controller calls `prompt()`
5. accepted or dismissed result updates state

Update:

1. registration detects a waiting worker or a newly installed worker
2. controller reports update availability
3. user clicks update
4. controller posts a skip-waiting message
5. page reloads after `controllerchange`

Offline navigation:

1. browser requests same-origin page while offline
2. service worker checks cache
3. service worker returns cached page, app shell, or offline fallback

## Error Handling

- Service-worker registration failure should log a concise error and keep the app running.
- Install prompt failures should dismiss the install state for the current session and keep normal app behavior.
- Update activation failures should leave the update action available or log the failure without forcing reload loops.
- Cache quota misses during runtime caching should remain best-effort.
- Missing required precache assets should fail service-worker installation so broken deploys do not become the active offline shell.

## Testing

Unit and integration coverage should include:

- `pwaController` captures install prompts and reports accepted/dismissed outcomes.
- `pwaController` reports online/offline transitions.
- `pwaController` detects waiting service-worker updates and posts the activation message.
- PWA control renderer hides and shows install, offline, and update states correctly.
- Service worker caches versioned app-shell URLs used by `index.html`.
- Service worker handles `SKIP_WAITING` update messages.
- Service worker returns an offline fallback for failed navigations.
- SEO page HTML includes manifest, theme, icon, and service-worker registration metadata.

Browser verification should include:

- local page can be installed when browser criteria are met
- offline reload after first successful load keeps route search usable
- generated SEO page visited once remains available offline
- update prompt appears after a service-worker cache version bump

## Rollout

Implement in small, testable steps:

1. service-worker and manifest correctness
2. PWA controller behavior
3. shell UI rendering and binding
4. SEO page PWA metadata/registration
5. browser verification

No data migration is required. Existing users with old caches should be moved forward by the existing cache-prefix cleanup plus a new cache version.

## Implementation Decisions

- The exact placement of the PWA control should follow the existing shell structure during implementation, with preference for a compact utility row over a prominent promotional block.
- Manifest screenshots should be generated from the running app during implementation and committed as static assets, one desktop-sized screenshot and one mobile-sized screenshot. They should show the working app surface, not a marketing page.
