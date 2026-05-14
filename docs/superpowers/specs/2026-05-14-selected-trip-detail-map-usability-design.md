# Selected Trip Detail And Map Usability Design

Date: 2026-05-14
Project: Riviera Trasporti Schedules
Status: Approved in conversation, pending written spec review

## Summary

Improve the route-search experience by making selected-trip detail the center of the results usability pass. Results should remain list-first, but selecting one departure should reveal a stable detail panel with the exact line, departure and arrival times, intermediate stops, official PDF context, and clear map status.

This pass also fixes both map surfaces:

- the selected-trip map, which currently always falls back because `assets/data/stop-coordinates.json` is expected but not shipped
- the nearby-stop GPS map, which depends on browser location permission, live provider lookup, and Leaflet loading without enough visible state handling

Search guidance changes should stay small and support this results flow. The product should not become a heavy wizard or map-first planner.

## Goals

- Make one selected departure feel obvious and inspectable.
- Keep departures easy to scan while exposing richer trip detail for the chosen bus.
- Preserve the stop sequence and official PDF path even when a map cannot render.
- Fix selected-trip map behavior so available coordinate data can produce a map.
- Make nearby-stop GPS map failures understandable and non-blocking.
- Clarify the `From` to `To` to selected-departure sequence with light helper copy and state improvements.

## Non-Goals

- A full map-first route explorer.
- Transfer planning changes.
- Replacing the direct-route search engine.
- A modal or stepper wizard for route search.
- Inventing route geometry when source coordinates are unavailable.
- Large visual restyling unrelated to selected-trip detail, map reliability, or route-search clarity.

## Priority

The approved priority is:

1. Selected-trip detail panel.
2. Map reliability for both selected-trip and nearby-stop GPS maps.
3. Scoped search guidance that prepares users for selecting one departure.

The map and search changes support the selected-trip inspection moment rather than becoming parallel redesigns.

## Selected-Trip Detail

Departure cards should be visibly selectable. A selected card should communicate active state with the existing coral action vocabulary and a clear label such as `Selected`, while unselected cards use a compact action such as `Details` or `Show details`.

When a departure is selected, render a selected-trip detail panel that includes:

- line id
- direction or route context when available
- departure and arrival times
- duration
- official PDF action for the source page
- selected segment stop sequence in timetable order
- map status and map viewport when available

On desktop, the selected-trip detail panel can sit beside the departures list or in a stable detail column. On mobile, it should stack below the selected result or below the summary in a way that keeps the list usable.

The detail panel is the source of certainty. The user should still understand the exact trip if the map cannot render.

## Selected-Trip Map Reliability

The current selected-trip map cannot render in normal app data because the app loads `./assets/data/stop-coordinates.json`, but the file is not present in `assets/data`.

Expected behavior:

- If the selected trip segment has usable coordinates for all relevant stops, render a route map with a polyline and stop pins.
- If the selected trip segment has partial coordinates, render a conservative partial map only for known points and explain that some stops are missing map coordinates.
- If no usable coordinates exist, do not show a blank map. Keep the selected-trip detail and stop sequence visible with clear unavailable copy.
- If Leaflet or map tiles fail to load, preserve the detail panel and explain that map loading failed.

The implementation must not imply geometric certainty that the dataset does not support.

## Nearby-Stop GPS Map Reliability

The nearby-stop flow remains an assist for filling the route fields. It must never block manual search.

The UI should distinguish these states:

- loading: requesting browser location and nearby stop data
- permission denied: location access was not granted, manual search remains available
- lookup failed: the live map/provider request failed
- no match: provider stops were found but could not be matched to timetable stops
- map script unavailable: nearby stop choices may still be shown if lookup succeeded, but the map itself could not load
- ready: render the map, the user location marker, nearby stop markers, and exact stop buttons

When the flow is not ready, the app should avoid empty map shells. The copy should explain the state directly and keep the route search form usable.

## Search Guidance

Search guidance should be copy and state polish, not a new flow.

The `From` control should continue to support broad area search and exact-stop refinement. Helper copy should clarify that exact stop confirmation improves certainty when multiple stops belong to the same area.

The `To` control should explain that direct destinations appear after the origin is known, and that the list is constrained by published direct trips.

Results copy should prepare the user for the next action: select one departure to inspect the exact trip details.

## Data And Architecture

Keep the app as a static vanilla JavaScript module application.

Expected implementation boundaries:

- Extend `src/lib/routeMap.js` to represent ready, partial, no-coordinate, and map-unavailable states cleanly.
- Keep route-map decisions pure and testable where possible.
- Keep rendering concerns in `src/ui/renderRouteMapPanel.js` and result rendering modules.
- Wire map initialization and error handling in `src/main.js`.
- Prefer generated or shipped coordinate data when available, but keep fallbacks reliable when data is incomplete.
- Avoid provider calls in core route search logic.

If coordinate generation is added, it should produce a static asset under `assets/data/` and the service worker should cache it as an optional asset.

## Error Handling

Handle these cases explicitly:

- selected departure has no coordinate data
- selected departure has partial coordinate data
- selected departure has usable coordinates but Leaflet fails to load
- nearby GPS permission is denied
- nearby provider lookup fails
- nearby provider lookup succeeds but no timetable stops match
- user changes origin or destination after selecting a departure
- stale selected-trip state after results are rebuilt

Changing route inputs should clear incompatible selected-trip state so the detail panel cannot describe an old route.

## Testing

Add or update tests for:

- route-map state with full coordinates
- route-map state with partial coordinates
- route-map state with no coordinates
- selected-trip panel rendering full, partial, and unavailable map states
- departure cards rendering selected and unselected detail actions
- selected-trip state clearing when route inputs change
- nearby-stop picker rendering loading, denied, lookup failed, no match, and ready states
- app bootstrap loading optional stop coordinates safely
- service worker optional caching of coordinate data if a coordinate asset is shipped

Run the focused map/results/search tests and then the full test suite before implementation is considered complete.

## Acceptance Criteria

- Selecting one departure visibly marks it as selected.
- The selected-trip detail panel gives enough information to validate the exact bus without relying on the map.
- The selected-trip map renders when usable coordinates exist.
- Partial or missing coordinates produce honest, useful fallback states rather than a blank or misleading map.
- Nearby-stop GPS errors are visible, specific, and non-blocking.
- Manual route search remains available when GPS or live map services fail.
- Search guidance clarifies origin, destination, and departure selection without introducing a heavy wizard.
