# Riviera Trasporti Network-Wide Route Picker And Trip Map Design

Date: 2026-05-05
Project: Riviera Trasporti Schedules
Status: Drafted from approved conversation decisions, pending user review of this written spec

## Relationship To Prior Specs

This document extends the earlier route-finder, full-network GPS, and locality-aware route-picker specs.

- The April 30, 2026 route-finder spec established direct-trip search as the core product.
- The May 1, 2026 full-network GPS spec expanded parsing and nearby-stop support across the Riviera Trasporti network.
- The May 4, 2026 locality-aware route-picker spec introduced locality-first `From` discovery and constrained `To` destinations.

This document refines that route-picker so the network is easier to browse from anywhere, not only around seeded examples such as Porto Maurizio and Sanremo, and adds a trip-specific map after one departure is selected.

## Summary

Keep the existing locality-first search model, but make the `From` interaction a full-network browser instead of a flow that feels centered on a small set of examples.

When the user opens `From`, the app should show all known localities across the network in alphabetical order. After one locality is chosen, the `To` picker should unlock immediately and show only exact stops reachable by a direct trip from that locality. If the user refines `From` to one exact origin stop, the destination list should narrow further to direct destinations reachable from that stop.

Search results should remain list-first. The route map should appear only after the user clicks one specific departure card. That selection should render the stop-by-stop route segment for that exact trip, including the intermediate timetable stops between the matched origin and destination.

## Goals

- Make `From` easy to browse across the full Riviera Trasporti network.
- Reduce the impression that the product is centered on Porto Maurizio and Sanremo.
- Preserve exact-stop direct-trip search as the only route query model.
- Keep `To` constrained to direct exact destinations only.
- Add a route map that is tied to one selected departure, not a generic route sketch.
- Show the selected trip segment stop-by-stop in timetable order.

## Non-Goals

- Transfer planning.
- Freeform map-first route discovery.
- Showing a route map before the user selects one exact departure.
- Treating broad localities as final destination query values.
- Inventing route geometry when source coordinates are unavailable.

## Product Decisions Locked In

- The preferred flow is the previously recommended network-browser model, not a strict wizard and not a map-first explorer.
- `From` should open with the full network visible immediately.
- The initial `From` list should show all localities alphabetically.
- The user may still type to filter that full list.
- `To` unlocks only after a `From` locality is chosen.
- `To` shows exact stops only, never broad locality labels.
- Results should not auto-open a route map.
- The map should appear only after the user clicks one departure card.
- The route map should show the exact selected trip segment with intermediate stops, not just origin and destination pins.

## Information Model

### Localities

The locality layer remains the broad discovery model above exact stops.

Each locality continues to provide:

- a stable locality id
- a display label
- normalized tokens for typed matching
- the list of exact stop ids that belong to that locality

No new locality concept is needed. The change is in how the list is presented and how strongly the UI emphasizes full-network browsing.

### Exact Stops

Exact stops remain the canonical route endpoints for direct-trip lookup, reachability filtering, and results generation.

The `To` picker continues to store one exact `toStopId`. The `From` side may still represent either:

- one chosen locality with an optional exact origin stop refinement
- or one chosen exact origin stop within the chosen locality

### Selected Trip Segment

Results need one additional UI model: the currently selected trip instance for map rendering.

Recommended shape:

- `selectedTripKey` or equivalent stable identifier for the chosen departure card
- the source trip record or enough trip metadata to reconstruct it
- the matched `from` and `to` indexes inside that trip
- the ordered slice of intermediate stops from the chosen origin through the chosen destination

This is a results-side selection model only. It does not change search semantics.

## Search Flow

### From Picker

The `From` field should act as a network browser.

Flow:

1. Open immediately on focus or tap.
2. Show all localities in alphabetical order before the user types anything.
3. Let typed input filter the same full list.
4. After one locality is selected, keep the locality-first flow already established by the current design.
5. Allow optional exact-stop refinement inside the selected locality.

This keeps the product easy to use anywhere in the network while preserving the existing locality-first model.

### To Picker

The `To` field remains validity-driven.

Flow:

1. Stay locked until `fromLocalityId` exists.
2. Once a locality is chosen, open with the union of direct exact destinations reachable from that locality.
3. Let typing filter only within that reachable exact-stop set.
4. If the user later confirms one exact origin stop, narrow the destination list to that stop's direct reachable destinations.
5. If `From` changes, clear incompatible destination state and rebuild the options.

### Search Results

The results list stays primary.

Flow:

1. Show the direct departures list after the user submits a valid direct query.
2. Do not auto-open any map by default.
3. Let the user click one departure card to select one exact trip instance.
4. When one departure is selected, open a map panel for that trip.

This avoids showing ambiguous route shapes when multiple valid departures exist between the same endpoints.

## Route Map Model

The route map must be trip-specific, not route-family-specific.

When the user selects a departure card, the app should identify the exact underlying trip record that produced that result and derive the ordered segment between the matched origin and destination indexes.

The map panel should show:

- the selected line and direction context
- the departure and arrival times for the chosen trip
- the ordered intermediate stops between the chosen origin and destination
- the plotted stop sequence on the map when coordinates are available

The map should represent only the selected segment of the trip, not unrelated upstream or downstream parts of other candidate departures.

## Coordinate And Fallback Behavior

Current shipped stop data does not reliably include coordinates for all timetable stops. The map design therefore needs an explicit graceful fallback.

Expected behavior:

- If the selected trip segment has usable coordinates for the relevant stops, render the stop sequence on the map.
- If only partial coordinates exist, prefer a conservative partial visualization plus clear messaging rather than a fabricated path.
- If no usable map coordinates exist for the selected trip, keep the selected trip details visible and show a clear message that the trip is valid but the map is not yet available for that selection.

The app must never imply geometric certainty that the dataset does not support.

## UI Behavior

### Full-Network Browsing

The `From` UI should visibly feel network-wide.

Required behaviors:

- alphabetical locality list on initial open
- fast typed filtering
- usable scroll behavior on mobile
- helper copy that explains the area-first model without centering the copy on one sample corridor

### Destination Guidance

The `To` UI should make its state obvious:

- before `From` selection: choose an area first
- after locality selection: direct destinations from this area
- after exact origin refinement: direct destinations from this stop

This copy should clarify why the available destinations change as the user narrows the origin.

### Selected Departure Map Panel

The results view should treat departure selection as a second-stage detail action.

Recommended behavior:

- make departure cards visibly selectable
- highlight the active departure when chosen
- reveal a map/detail panel below the summary on narrow screens or beside the list on wider screens
- keep the departure list usable while the map panel is open

## Error Handling

The app should explicitly handle:

- no locality match while typing in `From`
- a chosen locality with no valid direct destinations
- a chosen exact origin stop with no valid direct destinations
- the user changing `From` after choosing `To`
- the user selecting a valid departure whose trip cannot be mapped because coordinates are missing

In each case, the UI should explain the state directly and avoid silent empty panels.

## Testing

Add tests for:

- `From` showing all localities alphabetically on open
- typed filtering across the full locality list
- preserving locality-first destination unlocking
- narrowing `To` after exact origin stop selection
- clearing destination state when origin changes
- rendering departure cards as selectable result items
- deriving the selected trip segment from one clicked departure
- rendering intermediate stop lists for the selected trip
- map fallback messaging when coordinates are missing
- updated copy that no longer overemphasizes Porto Maurizio and Sanremo

## Risks

- the current result model may need extra identifiers so one clicked departure can be mapped back to the exact source trip safely
- incomplete coordinate coverage may limit how often the map can render in the first implementation
- long alphabetical locality lists need careful panel sizing and scrolling to stay usable on mobile

## Acceptance Criteria

This change is successful if:

- opening `From` shows the full network immediately
- the initial search experience no longer feels centered on a small example corridor
- `To` still offers only direct exact destinations
- search results remain list-first
- no map appears until one departure is selected
- selecting one departure reveals the exact trip segment with intermediate stops
- the UI clearly explains when a trip exists but map data is unavailable
