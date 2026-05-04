# Riviera Route Picker Restyle Design

Date: 2026-05-04
Project: Riviera Trasporti Schedules
Status: Drafted from approved conversation decisions, pending user review of this written spec

## Relationship To Prior Specs

This document refines the existing route picker work without changing the underlying direct-trip model.

- The April 30, 2026 route-finder spec established exact-stop direct-trip search.
- The May 1, 2026 full-network GPS spec added nearby-stop discovery.
- The May 4, 2026 locality-aware picker spec added area-first selection and exact-stop refinement.

This document narrows the homepage and picker presentation around a more compact, blank-initial-state form and a stronger interaction model for the `To` field.

## Summary

Restyle the existing route picker so the homepage feels like a compact search product instead of a glassy demo card with seeded example values.

The `From` field should start blank, open broad area suggestions immediately on focus, and switch to the exact stop name once the user refines the departure. The `To` field should be focusable before a departure is chosen, but it should open an informational panel rather than a destination list until a valid departure area exists. Visual direction should combine Airbnb's compact search confidence with Moovit's clearer transit-specific guidance, while remaining a Riviera Trasporti-specific interface rather than a clone of either product.

## Goals

- Remove prewritten route examples from the homepage form.
- Make `From` feel fast and discoverable with immediate broad-area suggestions.
- Keep `To` interactive before origin selection without pretending it is usable too early.
- Make exact-stop refinement obvious and ensure the visible `From` value becomes the exact stop name.
- Replace the current frosted default-system look with a cleaner, warmer, more intentional visual system.
- Keep the route picker as the primary action on the homepage.

## Non-Goals

- Transfer planning.
- Semantic token extraction or a reusable design-system package.
- A full homepage content rewrite beyond what is needed to support the picker.
- A map-led or dashboard-style redesign.
- Cloning Airbnb or Moovit component-for-component.

## Design References

This design uses Airbnb and Moovit as stylistic reference points only.

- Airbnb contributes compact rounded search surfaces, disciplined spacing, and a field-first homepage hierarchy.
- Moovit contributes stronger transit-specific guidance, clearer step messaging, and more explicit product-state communication.

The extraction tool requested for these sites was not usable in this environment because its Playwright runtime expected a different headless Chromium revision than the one available locally. The design direction in this spec is therefore based on direct inspection of the public sites rather than generated token files.

## Product Decisions Locked In

- The homepage form loads with an empty `From` field and an empty `To` field.
- Focusing `From` immediately opens broad area suggestions.
- Broad area suggestions remain the first step, not exact stop suggestions.
- After the user refines to an exact departure stop, the visible `From` field switches to the exact stop name.
- The broader area label disappears once the exact stop is chosen.
- `To` is focusable before a departure is selected.
- Before a departure area is selected, focusing `To` opens an informational panel instead of a destination list.
- After a departure area is selected, the `To` panel becomes a real exact-destination list.
- After an exact departure stop is selected, the `To` list narrows to that stop's direct destinations.
- Changing the departure clears any selected destination.

## Interaction Model

### Homepage Entry State

The homepage should open with the form already feeling active, but not filled in.

- `From` input is blank.
- `From` placeholder should suggest the kind of input expected, such as a broad place name.
- `To` input is blank.
- The hero copy is present but quieter than in the current version.
- The search card, not the headline, is the primary visual focus.

This should remove the current demo-like feeling created by seeded values such as `Porto Maurizio -> Sanremo`.

### From Field

The `From` field drives the search flow.

Behavior:

1. On focus or tap, open broad area suggestions immediately, even before the user types.
2. Keep the first suggestion set locality-based, not exact-stop-based.
3. After a broad area is chosen, allow the user to refine to an exact stop within that area.
4. Once an exact stop is chosen, replace the visible `From` value with that exact stop name.
5. If the user changes the origin again, clear any destination selection and rebuild downstream state.

The visual presentation should make the field feel like a search control rather than a plain browser input with a datalist attached.

### To Field

The `To` field uses a soft gate.

Behavior:

1. Before any departure area is selected, the field remains focusable.
2. Focusing it opens a compact informational panel explaining that direct destinations appear after choosing a departure area.
3. After a broad area is chosen, the same panel shell becomes a destination suggestion list populated by the locality-wide reachable destination union.
4. After an exact departure stop is chosen, the destination list narrows to the stop-specific direct destination set.
5. If no direct destinations exist for the current origin state, the panel must say so directly instead of appearing empty.

This preserves the compact premium feel of an always-alive search surface while still telling the truth about query prerequisites.

## Visual Direction

### Layout

Keep the current one-card homepage architecture, but reduce the separation between marketing copy and search interaction.

- The top-level form direction should match the approved "Search Capsule" concept.
- The form should sit inside a crisp, rounded, prominent card.
- Inputs should feel like the product's center of gravity, not supporting controls below a large hero.
- The layout should stay compact on desktop and stack cleanly on mobile.

### Color

Move away from the current cool glass palette.

Preferred direction:

- warm off-white or light neutral page background
- crisp white search card
- dark charcoal text for stronger contrast
- restrained coral or red primary action color
- transit-orange or signal color only for state emphasis where useful

Avoid a generic blue glass aesthetic. The form should feel calmer, denser, and more deliberate.

### Typography

Typography should support a field-first product surface.

- Use a more editorial sans-serif direction than the current default-system feel.
- Increase contrast between headline, field labels, and helper text.
- Shorten the hero line and reduce its visual dominance.
- Keep helper text concise and operational rather than promotional.

### Component Feel

- Rounded inputs should feel intentional and tactile, not overly glossy.
- Focus, hover, and state changes should be legible.
- Helper and status text should be visually separated from the input chrome.
- The `To` informational panel and the real destination list should feel like two states of one component, not separate UI inventions.

## Content And Messaging

Homepage copy should support the form, not compete with it.

The page should communicate:

- this is a Riviera Trasporti timetable search surface
- it is faster and clearer than manually reading the long PDF
- the official PDF remains the source of truth

The current route-example framing should be removed from the product claim.

Picker copy should be short and task-oriented:

- `From` should hint that users can begin with an area
- `To` should explain why results are unavailable before origin selection
- no-results states should explicitly explain whether the issue is missing origin selection or lack of direct destinations

## State Model Implications

This restyle does not replace the locality-aware state model from the earlier spec. It clarifies how that model should surface in the UI.

Required rendered `To` states:

1. `informational`: no departure area chosen yet, focus opens guidance only
2. `locality-destinations`: area chosen, show exact destinations from the locality-wide union
3. `exact-stop-destinations`: exact origin stop chosen, show narrowed exact destinations
4. `empty`: no direct destinations for the selected origin state

The `From` rendering must also distinguish:

- blank initial state
- broad area selected but exact stop not yet chosen
- exact stop selected

## Error Handling

The restyled UI must explicitly handle:

- no matching broad area for typed `From` text
- `To` focus before an origin exists
- no direct destinations from a chosen area
- no direct destinations from a chosen exact stop
- changing `From` after `To` has already been selected

Each state should explain what happened and what the user needs to do next.

## Testing

Add or update tests for:

- blank initial form values on first render
- immediate broad-area suggestions when `From` gains focus
- soft-gated `To` behavior before origin selection
- informational `To` panel messaging before origin selection
- destination-list activation after broad area selection
- destination narrowing after exact stop selection
- exact stop replacing the visible broad area label in `From`
- destination clearing after any origin change
- homepage copy no longer relying on seeded example routes
- updated rendering for the compact search-card layout

## Rollout Boundary

This design is complete when:

- the form no longer ships with prewritten origin and destination values
- `From` opens broad suggestions immediately from a blank state
- `To` is focusable early, but initially shows guidance rather than fake results
- exact-stop refinement replaces the visible `From` value with the exact stop name
- destination options unlock from a broad area and narrow further from an exact stop
- the page feels more compact, cleaner, and less generically glassy

## Risks

- a compact card can become too terse if helper text is reduced without enough care
- soft-gated `To` messaging may feel subtle if visual differentiation is too weak
- replacing the broad area with the exact stop name could reduce orientation unless the exact stop labels remain clear
- visual borrowing from the references can drift into imitation if spacing and color choices are not kept project-specific

## Acceptance Criteria

This change is successful if:

- a first-time user lands on an empty search form rather than a seeded demo route
- focusing `From` immediately suggests valid broad areas
- focusing `To` before choosing `From` produces a clear informational panel
- selecting an area unlocks exact reachable destinations in `To`
- refining the departure to an exact stop updates the visible `From` value to that exact stop name
- changing the origin clears stale destination state
- the visual treatment feels cleaner, warmer, and more intentional than the current implementation
