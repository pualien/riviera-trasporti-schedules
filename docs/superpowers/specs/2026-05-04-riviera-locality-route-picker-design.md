# Riviera Trasporti Locality-Aware Route Picker Design

Date: 2026-05-04
Project: Riviera Trasporti Schedules
Status: Drafted from approved conversation decisions, pending user review of this written spec

## Relationship To Prior Specs

This document extends the prior route-finder and full-network GPS specs.

- The April 30, 2026 spec established the route-first direct-trip product.
- The May 1, 2026 spec expanded parsing to the full network and introduced GPS-assisted nearby-stop selection.

This document refines the search interaction model so broad place names such as `Porto Maurizio` improve discovery without weakening the direct-trip query rules.

## Summary

Introduce a locality-aware route picker that separates place discovery from final trip selection without over-constraining the form.

Users should be able to begin from a broad Riviera Trasporti locality such as `Porto Maurizio`, `Sanremo`, or `Ventimiglia`, immediately unlock a reduced `To` list, and optionally confirm one exact timetable origin stop to narrow destinations further. The `From` field should open immediately on focus, the `To` field should show exact direct destinations reachable from the selected locality, and the homepage copy should describe the product as a faster Riviera Trasporti timetable search experience than manually reading a long PDF.

## Goals

- Make broad place names useful in search and GPS flows.
- Preserve exact-stop direct-trip lookup as the only query model.
- Open the `From` picker immediately on focus or tap.
- Constrain the `To` picker to direct reachable destination stops from the selected locality, then narrow further when an exact origin stop is confirmed.
- Reposition the homepage and empty states around Riviera Trasporti network search rather than a single example route.
- Clean up the existing glass-card UI so the form hierarchy and picker state are easier to scan.

## Non-Goals

- Transfer planning.
- Freeform map-based route discovery.
- Searching by broad locality only, without choosing an exact stop.
- Showing destinations that require a transfer.
- Replacing the official PDF as the source of truth.

## Product Decisions Locked In

- Broad labels like `Porto Maurizio` represent localities, not final query endpoints.
- GPS and typed search may resolve first to a locality.
- Search submission requires one exact `to` stop, while `from` may be either a selected locality or a selected exact stop inside that locality.
- The `From` field opens its list immediately on focus.
- The `From` field should keep suggesting broad localities even after one locality has been chosen.
- The `To` field becomes available as soon as a `from` locality is chosen.
- The `To` list shows exact stop names only, never broad locality labels.
- Before an exact origin stop is chosen, the `To` list is the union of exact stops reachable from any stop in the selected `from` locality.
- After an exact origin stop is chosen, the `To` list narrows to exact stops reachable from that stop.
- The preferred picker model is locality first, exact stop refinement second.

## Information Model

### Localities

Add an explicit locality layer above the existing stop records.

Each locality should include:

- a stable locality id
- a display label such as `Porto Maurizio`
- normalized search tokens for typed matching
- the list of concrete stop ids that belong to that locality
- optional aliases derived from curated stop aliases or future manual metadata

Localities exist to improve discovery. They do not replace concrete stops in route queries.

### Exact Stops

Existing stop records remain the canonical route query endpoints. The route engine, trip results, source-page references, and duration calculations should continue to operate on exact stop ids.

### Form Value Model

The form state should distinguish between visible labels and exact selected ids.

Recommended shape:

- `fromLocalityId` for the broad selected place
- `fromStopId` for the exact origin stop
- `toStopId` for the exact destination stop
- display labels for the currently shown values

If the user changes `from`, the app must clear any incompatible `fromStopId` and `toStopId` before recomputing available destinations.

### Query Semantics

Route lookup must continue to run on exact stop ids, even when the UI is locality-first.

- If `fromStopId` exists, search from that exact origin stop to the selected exact destination stop.
- If only `fromLocalityId` exists, search from every exact stop in that locality to the selected exact destination stop.
- The app must never treat the locality label itself as a concrete stop id.

## Route Reachability Model

Add a direct reachability index derived from the generated trip dataset, plus a locality-level union derived from that stop-level index.

For each exact origin stop, compute the set of exact destination stops that appear later in at least one direct published trip for any supported day type. This index exists only to drive picker constraints and validation. It must never be treated as a replacement for the real search query.

For each locality, derive a union of destination stop ids reachable from any stop inside that locality. This union exists only to make `To` useful earlier in the flow. It must not replace exact-stop validation at submit time.

Expected uses:

- enable or disable the `To` field
- populate the direct-destination list
- provide fast client-side filtering while typing inside `To`
- show a clear no-direct-destination state when appropriate

The final results page must still be generated by filtering actual timetable trips from `trips.json`.

## Search Flow

### From Picker

The `From` field should open immediately on focus or tap.

Flow:

1. Show broad locality suggestions immediately, even before typing.
2. Let typed input narrow the locality list.
3. Allow GPS-assisted selection to land on a locality or directly on a likely stop inside a locality.
4. After a locality is chosen, keep the input locality-oriented rather than switching it into exact-stop-only mode.
5. Allow the user to optionally refine to one exact stop inside that locality.

The refinement step should stay explicit in the UI so users understand that the destination list can narrow further when an exact origin stop is chosen, but it should not block broad-locality exploration.

### To Picker

The `To` field should stay disabled or read-only until `fromLocalityId` exists.

Flow:

1. Once a `from` locality is chosen, derive the union of reachable exact destination stops for that locality.
2. Open the `To` picker with those exact stops immediately.
3. Let typing filter only within that reachable set.
4. If the user later chooses an exact `from` stop, narrow the `To` list to that stop's reachable exact destinations.
5. If the origin changes, clear the chosen destination and rebuild the destination list.

The `To` picker should not offer broad localities as final values in this iteration. It should show exact valid destination stops only.

## GPS And Locality Resolution

The GPS flow should support the same two-step search model rather than bypassing it.

Expected behavior:

- nearby-stop matching may identify a likely exact stop
- that exact stop should still reveal its parent locality in the UI
- if multiple close stops belong to the same locality, the UI should require explicit exact-stop confirmation
- if GPS produces a broad familiar place name, the app should route the user into the locality-first, stop-second flow

This keeps GPS and typed interaction consistent and avoids hidden automatic choices.

## Copy And Messaging

### Homepage

Replace the current route-specific headline and supporting copy with Riviera Trasporti-wide messaging.

The page should communicate:

- this site is for finding Riviera Trasporti buses across the official published network
- it is faster and clearer than manually reading the long timetable PDF
- the official PDF remains the source of truth

Seed example values may remain in the form, but they must no longer define the product claim.

### Picker Messaging

The picker should explain the locality-first model in plain language:

- choose an area first
- browse exact destinations immediately
- optionally refine the departure stop to narrow destinations further

When no direct destinations exist from the selected locality or exact origin stop, the `To` field should say so directly rather than presenting an unexplained empty list.

### Visual Cleanup

Keep the current glass-card direction, but make it cleaner and more legible.

The UI changes should:

- reduce the visual weight of the hero copy so the route form becomes the obvious primary action
- tighten spacing and hierarchy around the form fields
- make disabled, locality-wide, and exact-stop-refined destination states visibly distinct
- separate helper/status text from the input chrome so picker guidance reads clearly
- preserve the current page structure rather than redesigning the results experience

## Error Handling

The flow must handle these cases explicitly:

- typed text matches no locality
- a locality contains no currently valid stops
- a selected locality has no reachable direct destinations
- a selected exact origin stop has no direct destinations
- GPS resolves to multiple nearby stops and needs confirmation
- the user changes the origin after picking a destination

In each case, the UI should explain what happened and what the user needs to do next.

## Testing

Add tests for:

- deriving localities from stop data and aliases
- building locality-level union destination sets
- keeping `From` suggestions locality-wide after a locality is selected
- enabling `To` after locality selection
- constraining `To` to locality-wide direct exact stops, then narrowing further after exact origin selection
- clearing destination state when origin changes
- no-direct-destination messaging
- homepage copy no longer centered on `Porto Maurizio -> Sanremo`
- cleaned form copy and clearer destination-state rendering
- GPS flows that still require exact-stop confirmation when ambiguity remains

## Rollout Boundary

This design is complete when:

- broad place names help users discover the right area
- every actual search still runs on exact stop ids
- the `From` field opens immediately with locality-first suggestions
- the `To` field unlocks after locality selection and shows only direct exact destination stops
- choosing an exact origin stop narrows the destination list further
- homepage messaging describes the product as a Riviera Trasporti timetable search experience better than reading the PDF manually
- the existing visual style feels cleaner and easier to scan

## Risks

- locality grouping may need curated metadata for ambiguous urban stop clusters
- some popular place names may map to more stops than users expect, making the second-step chooser important
- destination filtering must stay synchronized with the real trip query logic to avoid false promises in the picker

## Acceptance Criteria

This change is successful if:

- a user can begin with a broad place like `Porto Maurizio`
- the `To` field unlocks immediately with exact stops reachable from that locality
- the UI allows, but does not require, refining `from` to an exact stop before exploring destinations
- refining `from` to an exact stop narrows the `To` list correctly
- changing origin invalidates destination selection correctly
- the homepage clearly presents the site as a better Riviera Trasporti timetable lookup experience than reading the long PDF
