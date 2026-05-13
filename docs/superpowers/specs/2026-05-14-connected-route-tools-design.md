# Connected Route Tools Design

## Summary

Add a staged but connected set of route-finder improvements:

- one-transfer suggestions
- clickable no-direct recovery
- shareable route URLs
- favorites and recent searches
- a line and stop browser
- offline/PWA support

The work should preserve the current route-first product. The default experience remains direct-route lookup from the official Riviera Trasporti PDF. The new capabilities should help riders recover, revisit, share, and browse routes without turning the app into a full transit planner.

## Product Decisions

The selected delivery approach is foundation-first and staged. Shared state, URL, and storage foundations should be introduced before feature-specific UI so the requested features feel like one coherent product rather than separate patches.

Top-level navigation should be:

- Search
- Browse
- Saved

Search remains the first and default view. Browse and Saved are adjacent utility views with their own space.

One-transfer suggestions should appear only when no direct route exists for the selected origin, destination, and day type. They are a recovery path, not a replacement for direct-route results. The transfer search should use conservative rules:

- same selected day type
- exactly one transfer stop
- second leg departs at least 5 minutes after the first leg arrives
- show up to 3 best suggestions
- label results as possible one-change options, not guaranteed route planning

The line and stop browser should seed route search instead of becoming a full timetable browser.

## Goals

- Make no-direct outcomes actionable.
- Preserve trust by keeping direct-route results primary.
- Allow riders to revisit and share useful route states.
- Provide a practical browse path for users who know a line or stop but not a full origin/destination pair.
- Make core timetable lookup usable offline after the app has been loaded once.
- Keep the app static and GitHub Pages-friendly.

## Non-Goals

- Full multi-transfer journey planning.
- Real-time vehicle arrivals or service disruption status.
- Calendar-based date search.
- Editing or validating the official PDF content manually in the UI.
- Full timetable reproduction for every line in the Browse view.
- Offline map tiles or offline live geolocation provider responses.

## Information Architecture

### Search

Search keeps the existing route picker and results flow:

1. choose departure area
2. optionally refine to exact departure stop
3. choose direct destination
4. choose day type
5. submit

The Search view gains URL synchronization. Search inputs, selected ids when available, day type, and active tab should be reflected in query parameters. Loading a URL should restore the most precise state possible.

Direct results remain the primary success state. Existing summary metrics, next departures, all departures, selected trip map, official PDF links, and route taxi options remain available.

### No-Direct Recovery

The no-direct panel should become an active recovery surface. Existing fallback suggestions should become buttons. Clicking a suggestion should update the route form, switch to the Search view, update the URL, and rerun the search when both endpoints are known. If the click only fills one endpoint, the form should remain focused and ready for the next selection.

Suggested recovery actions should stay within the direct-search scope:

- try another origin stop in the selected area
- try a reachable destination from the selected origin area
- open the official PDF
- review possible one-change options if available
- review taxi fallback options if available

The UI should not imply that direct-route fallback suggestions are recommended transfer routes.

### One-Transfer Suggestions

One-transfer suggestions are generated only after direct search returns no matches.

The transfer engine should search the existing static trip dataset for pairs of direct legs:

- first leg: selected origin to candidate transfer stop
- second leg: transfer stop to selected destination
- both legs match the selected day type
- the second departure is at least 5 minutes after the first arrival

Suggestions should be ranked with a simple, explainable rule:

1. earliest complete journey after the browser's current time
2. shortest total elapsed time
3. shortest waiting time
4. stable line/stop ordering as a final tie-breaker

If no complete one-transfer journey remains after the current time, suggestions should fall back to the earliest full-day options for the selected day type and clearly avoid "next" language.

The rendered suggestion should show:

- origin and destination
- transfer stop
- first leg line, departure, arrival, and PDF page
- waiting time
- second leg line, departure, arrival, and PDF page
- total elapsed time
- a clear note that the option is derived from static PDF timetable data

If no conservative one-transfer suggestions exist, the no-direct panel should show one short unavailable message in the transfer area instead of listing speculative alternatives.

### Browse

Browse is a search helper with two modes:

- Lines
- Stops

The Lines mode should list line ids and direction labels derived from existing trips. A line detail section should show the stops served by that line, grouped or deduped enough to remain readable. Each stop entry should offer:

- Search from here
- Search to here

The Stops mode should list known stops with locality-friendly labels where possible. A stop detail section should show lines that serve the stop. It should also offer:

- Search from here
- Search to here

Browse URLs should preserve the active browse mode and selected line or stop id when present.

### Saved

Saved combines favorites and recent searches.

Recent searches are automatic after a submitted search. They should record:

- from label
- from stop id when known
- from locality id when known
- to label
- to stop id when known
- day type
- timestamp
- result type
- result count when available

Favorites are explicit. Users can save the current route from direct results or no-direct recovery. Favorites should use the same route identity fields as recent searches.

Both lists should be stored in `localStorage`. They should be deduped by route identity and capped to keep storage tidy:

- up to 8 favorites
- up to 8 recent searches

Saved entries should restore the Search view through the same URL/state hydration path used for shareable route URLs.

### Shareable URLs

Query parameters should be human-readable where possible and stable where ids are available.

Recommended parameters:

- `tab=search|browse|saved`
- `from=<label>`
- `fromLocality=<locality-id>`
- `fromStop=<stop-id>`
- `to=<label>`
- `toStop=<stop-id>`
- `day=<day-type>`
- `browse=lines|stops`
- `line=<line-id>`
- `stop=<stop-id>`

When a URL contains ids, ids should win over labels. When ids cannot be resolved, the app should fall back to labels and keep the form usable instead of failing hard.

URL updates should use `history.replaceState` for ordinary form/picker state changes and `history.pushState` for explicit navigation events such as switching tabs, selecting a saved route, or choosing a browse item.

### Offline/PWA

Offline support should add:

- a web app manifest
- service worker registration
- a service worker that caches the app shell
- static JSON data caching for trips, stops, metadata, localities, reachability, and coordinates when present

The app should continue to support route lookup, Browse, Saved, and route restoration after the first successful load. Live dependencies can fail offline:

- Leaflet assets from CDN
- OpenStreetMap tiles
- Overpass nearby-stop lookup
- browser geolocation provider responses

Offline failures should be graceful. Users should still be able to type or browse stops manually.

## Architecture

The implementation should stay within the existing vanilla JavaScript structure.

New pure modules:

- `src/lib/routeUrlState.js`: parse and serialize query parameters, hydrate partial form/view state.
- `src/lib/savedRoutes.js`: manage localStorage favorites and recent searches with caps and deduping.
- `src/lib/transferSuggestions.js`: compute conservative one-transfer suggestions from trips.
- `src/lib/browseIndex.js`: derive line and stop browse data from existing trips and stops.

New or updated UI modules:

- tab shell/navigation renderer
- Browse view renderer
- Saved view renderer
- transfer suggestion panel renderer
- updated no-direct fallback renderer with clickable actions
- updated result controls for save/share actions

Runtime wiring should keep `src/main.js` as the application coordinator, but move reusable behavior out into the new modules. If `src/main.js` becomes difficult to read during implementation, extract small binding helpers for tab navigation, route hydration, and saved-route actions.

## Data Flow

Initial boot:

1. load existing bootstrap data
2. derive browse index
3. parse URL state
4. hydrate tab and form state
5. render active view

Search submit:

1. update form state
2. run direct search
3. if matches exist, render direct results
4. if no matches exist, build no-direct recovery suggestions and conservative one-transfer suggestions
5. record recent search
6. update URL

Browse action:

1. user selects a line or stop
2. URL updates with browse state
3. user clicks Search from here or Search to here
4. Search tab opens with the selected field prefilled
5. URL updates through shared route state logic

Saved action:

1. user opens Saved
2. favorites and recents load from localStorage
3. selecting an entry restores Search through URL/state hydration

## Error Handling

If URL state references missing ids, fall back to labels when possible. If neither ids nor labels resolve, ignore that part of the URL and keep the app usable.

If localStorage is unavailable or throws, Saved should show an unavailable message while route search continues to work.

If transfer search cannot produce conservative options, do not show speculative alternatives.

If service worker registration fails, log the error and keep the app running as a normal static site.

If cached data is stale, the existing data freshness metadata remains the trust indicator. This design does not add a remote update checker.

## Accessibility

Top-level navigation should use clear button or link controls with `aria-current="page"` for the active view and deterministic focus order. Full ARIA tab semantics are optional because these views behave like page sections rather than in-page tab panels.

No-direct recovery suggestions, Browse actions, Saved entries, and transfer suggestion controls should be keyboard reachable and have descriptive text labels.

The PWA/offline state should not rely on color alone.

The visual system should continue to follow the calm, route-first design language already documented in `DESIGN.md`.

## Testing

Unit tests should cover:

- URL parsing and serialization
- URL hydration fallback when ids are missing
- saved-route caps and deduping
- recent-search recording
- favorite add/remove behavior
- one-transfer minimum-change filtering
- one-transfer ranking
- no transfer suggestions when direct results exist
- browse index generation from trips and stops
- no-direct suggestion button rendering

Integration-style UI tests should cover:

- selecting a no-direct recovery suggestion updates route state
- selecting a Browse stop seeds Search
- selecting a Saved route restores Search
- tab state renders correctly from URL parameters

Browser verification should cover:

- direct search still works
- no-direct route shows clickable recovery and possible transfers
- route URL reload restores state
- Browse line/stop actions seed Search
- Saved favorite/recent entries restore Search
- the app loads after service worker caching with network disabled where practical

## Rollout Plan

Implement in staged groups:

1. shared URL/tab foundation
2. saved routes and recent searches
3. clickable no-direct recovery
4. conservative one-transfer suggestions
5. Browse tab for lines and stops
6. PWA manifest and service worker

Each group should land with focused tests before the next group builds on it.

## Risks

Transfer suggestions can create trust issues if the app appears to guarantee a connection. The copy and ranking must remain conservative and clear.

The static PDF-derived trip data may not encode every real-world transfer nuance. This feature should stay framed as timetable-derived guidance.

URL state can become brittle if labels are treated as stable ids. Prefer ids when available and labels as fallback display state.

Service workers can make development confusing if cached assets are not versioned carefully. Cache names should be versioned and old caches removed during activation.

Adding tabs and saved state increases `src/main.js` coordination complexity. Extract pure modules and small binding helpers as soon as repeated logic appears.

## Acceptance Criteria

- Search remains the default view and direct results remain primary.
- No-direct fallback suggestions are clickable and update route state.
- One-transfer suggestions appear only after direct search fails.
- Transfer suggestions require at least 5 minutes between legs and show at most 3 options.
- Shareable URLs restore useful Search and Browse states.
- Recent searches are recorded automatically after submits.
- Favorites can be explicitly saved and restored.
- Browse supports Lines and Stops and can seed Search from a selected stop.
- The app registers a manifest and service worker.
- Core route lookup, Browse, and Saved work after the app shell and JSON data have been cached.
- Existing tests continue to pass, with new coverage for URL state, saved routes, transfer suggestions, browse index, and updated no-direct UI.
