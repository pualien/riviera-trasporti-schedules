# Route Action Feedback and Share Modal Design

## Goal

Improve the existing result actions so riders get clear feedback after saving a route and can share a tracked direct link through a small modal. The work stays inside the current static, client-only app.

## Current Behavior

Result views already render `Salva percorso` and `Condividi` actions. `Salva percorso` writes the current route to local favorites and re-renders silently. `Condividi` writes the route state to the browser URL and copies the plain current URL without user feedback, share choices, UTM parameters, or GTM events.

The app already has:

- route state serialization in `src/lib/routeUrlState.js`
- saved route storage in `src/lib/savedRoutes.js`
- result action binding in `src/main.js`
- a `window.dataLayer` helper in `src/lib/analytics.js`
- localized UI text through `src/lib/i18n.js`

## Design

### Save Feedback

When a rider clicks `Salva percorso`, the app will continue saving the current route as a favorite. After the save attempt it will show a short inline status message near the result actions.

The message states success when storage is available and the write succeeds. If browser storage is unavailable, the message states that the route could not be saved in this browser. The message uses an `aria-live` region so screen readers announce the result without moving focus.

The feedback is part of app state and survives the immediate re-render caused by saving. It is scoped to the current result action area and is cleared when the rider changes route state or opens a different result state.

### Share Modal

When a rider clicks `Condividi`, the app opens a modal dialog instead of silently copying the URL. The modal contains:

- a read-only direct link field
- `Copy link`
- `WhatsApp`
- `Telegram`
- `Facebook`
- `X`
- close controls through a close button, backdrop click, and Escape

The modal uses the existing page visual language: compact panel, simple buttons, no nested cards, and responsive layout for mobile. Focus moves into the modal when it opens and returns to the share button when it closes.

### Share URLs and UTMs

All share options use the serialized current route URL as the base. Each share URL includes:

- `utm_medium=route_share`
- `utm_campaign=azzuriva_route_share`
- `utm_source=share_link` for copy link
- `utm_source=share_whatsapp` for WhatsApp
- `utm_source=share_telegram` for Telegram
- `utm_source=share_facebook` for Facebook
- `utm_source=share_x` for X

The UTM parameters are used only for the shared outbound URL. They are not written back into the app's route state as durable route parameters.

Social buttons open the appropriate platform share URL in a new tab. Copy link writes the `share_link` URL to the clipboard and then updates the modal status message. If the Clipboard API is unavailable or rejects, the direct link field remains selectable and the status message asks the rider to copy it manually.

### GTM Events

The existing analytics helper will be extended with typed helpers for route actions. Both helpers push to `window.dataLayer`.

`route_save` fires after a save click with:

- `from`
- `to`
- `day_type`
- `results_count`
- `save_status` as `saved` or `unavailable`

`route_share` fires when the rider chooses a share option, not merely when the modal opens, with:

- `from`
- `to`
- `day_type`
- `results_count`
- `share_method` as `link`, `whatsapp`, `telegram`, `facebook`, or `x`
- `share_url`

The checked-in GTM import JSON will be updated so these custom events are represented alongside the existing `route_search` event.

## Components and Data Flow

`src/main.js` owns route action state because it already owns route results, saved routes, URL writing, and action binding. It will add a small `routeActions` UI state object for save feedback and the share modal.

`src/ui/renderResults.js` will render the save feedback region and include the share modal when modal state is present. Shared link creation will live in a small pure helper, `src/lib/shareRoute.js`, and tests will validate UTM behavior without a browser.

Data flow:

1. Result render receives current save feedback and share modal state.
2. Save click writes the favorite, updates feedback, pushes `route_save`, re-renders, and rebinds.
3. Share click serializes current route state, stores the modal state with a base share URL, re-renders, and focuses the dialog.
4. Share option click builds the channel URL, performs copy or opens the share target, pushes `route_share`, and updates modal feedback for copy attempts. Social platform options open a new tab and leave the modal state unchanged in the original page.

## Error Handling

Storage failures do not throw into the UI. The existing saved route availability result determines whether to show success or unavailable feedback.

Clipboard failures show manual-copy guidance in the modal. Social share windows use normal links so popup-blocking risk is minimized.

Invalid or missing result state disables these actions by omission because the buttons only render on successful result views.

## Testing

Unit and UI tests cover:

- save feedback markup renders when provided
- share modal markup renders the direct link and all supported channels
- UTM source values differ by channel while medium and campaign stay stable
- analytics helpers push `route_save` and `route_share` payloads
- GTM import includes custom-event coverage for `route_save` and `route_share`

End-to-end smoke coverage remains focused on the existing route search flow. Browser verification after implementation will exercise opening the modal, copying a link, and closing the dialog.
