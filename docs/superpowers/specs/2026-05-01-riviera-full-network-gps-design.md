# Riviera Trasporti Full-Network Coverage And GPS Picker Design

Date: 2026-05-01
Project: Riviera Trasporti Schedules
Status: Drafted from approved conversation decisions, pending user review of this written spec

## Relationship To Prior Spec

This document extends the April 30, 2026 route-finder design. The earlier spec defined the route-first PoC and direct-trip query model. This document adds two approved scope changes:

- parse every timetable listed in the official PDF index exactly as published
- add a Google Maps-like nearby-stop picker on both `From` and `To`

The direct-route-only product boundary remains in place. This is still not a transfer planner.

## Summary

Expand the current single-line proof of concept into a full-network static web app backed by the complete Riviera Trasporti winter timetable PDF dated April 1, 2026. The build pipeline should parse every indexed timetable page and generate a trustworthy network dataset for direct-trip lookup.

At the same time, extend the frontend with a hybrid location-assisted stop picker. Users can tap a location action on either search field, grant browser geolocation access, see their position on a lightweight map, and choose from the 3-5 nearest known stops matched from a runtime map or geocoding provider.

## Goals

- Cover every timetable listed in the PDF index for the file `2025-2026_Orario_Invernale_Generale_7ª Ver. dal 01-04-2026`.
- Preserve the official PDF as the source of truth while improving lookup speed and clarity.
- Keep the deployed site compatible with static hosting.
- Add a nearby-stop selection flow on both origin and destination fields.
- Make the GPS interaction feel map-aware without turning the app into a full journey-planning map product.

## Non-Goals

- Transfer planning.
- Live delay or vehicle tracking.
- Real-time stop data from an operator API.
- A full freeform map browser for route discovery.
- Perfect automatic parsing with no curated exceptions.

## Product Decisions Locked In

- Every timetable in the PDF index must be represented exactly as published.
- Geolocation actions exist on both `From` and `To`.
- The nearby-stop UX uses a hybrid map picker, not a list-only sheet and not a full map-first flow.
- The final stop choice is made from a ranked list of nearby stops.
- Runtime dependencies are allowed for mapping and/or geocoding behavior in the browser.

## Source Of Truth

Canonical timetable source:

- Riviera Trasporti `2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026`
- Published effective window in the PDF: September 15, 2025 through June 14, 2026
- Update marker shown in the PDF: April 1, 2026

The app must continue to expose PDF page references in results so riders can verify information against the original document.

## Data And Parsing Architecture

### Overall Approach

Replace the current single-page configuration model with a full indexed manifest plus layout-family parsing. The pipeline should still read raw PDF text and positioned text items, but it should no longer assume a single generic page structure across the network.

### Layout Families

Classify indexed timetable pages into a small number of parser families. Initial families should be:

- `linear-intercity`
- `urban-branched`
- `circular-or-loop`
- `school-or-limited-service`

Each family gets its own parsing strategy for row grouping, column alignment, repeated stop blocks, branch handling, and direction labeling. The family set may evolve during implementation, but the build should converge on a finite explicit list rather than ad hoc per-page logic scattered through the parser.

### Indexed Manifest

The manual manifest becomes the registry of every published timetable page. Each entry should include:

- line id as published
- page number
- direction label
- declared service note when present, such as feriale, festivo, solo scolastico
- parser family
- optional parser overrides for known anomalies

This manifest is not meant to store trip data manually. Its job is to make coverage explicit and to attach the minimum curated metadata required for reliable parsing.

### Coverage Rule

`npm run build:data` must treat the PDF index as an explicit contract. Every timetable page listed in the index must end in one of these states:

- parsed successfully with non-empty trip output
- intentionally excluded with a documented reason
- failed with a build-breaking error

Silent omission is not acceptable.

### Generated Assets

The build continues to generate:

- `assets/data/lines.json`
- `assets/data/stops.json`
- `assets/data/trips.json`

The schema should expand as needed to support the full network. At minimum:

- `lines.json` should include line id, display label, and source-page relationships
- `stops.json` should include stable stop id, canonical label, aliases, and enough search metadata to match runtime map or geocoder results back to known stops
- `trips.json` should include line id, day type, direction label, source page, and ordered timed stops

### Stop Identity

Stop normalization needs to move beyond simple alias matching. The system should support:

- canonical stop names
- user-facing display names
- aliases and punctuation-normalized search variants
- duplicate-name disambiguation where the same label appears in different areas

Stable stop ids are required so frontend map interactions and route lookup can refer to the same stop consistently even when labels vary.

## Frontend Search And GPS UX

### Search Form

Keep the current route-first form as the core experience. Add a location action to both `From` and `To`. Users may still type manually at any time.

### Hybrid Map Picker

When a user taps the location action:

1. Ask for browser geolocation permission.
2. Open a lightweight picker view anchored to the relevant field.
3. Show the user position on a compact map.
4. Query the runtime provider for nearby transit-stop candidates and reduce them to the 3-5 best matches against the known stop dataset.
5. Let the user choose a stop from the list to fill the active field.

The list is authoritative. The map provides context and familiarity, but selection should remain simple and deterministic.

### Google Maps-Like Interpretation

The approved meaning of “make it as a Google Maps experience” is:

- map-assisted nearby discovery
- visible user location context
- nearby candidates ranked and easy to tap

It does not mean:

- freeform browsing of the whole network on a map
- transfer planning on a map
- replacing the route-first form with a map-first product

### Failure States

The GPS flow must handle:

- permission denied
- browser geolocation unavailable
- insecure context restrictions outside local development
- no nearby provider results that can be matched to known stops
- mapping dependency load failure

In every case, the user must be returned cleanly to text search with a short explanation.

## Runtime Mapping And Geolocation

The published site may use runtime browser dependencies for geolocation, map display, and nearby-stop discovery. That work should remain isolated to the GPS picker so the rest of the application remains static-data-driven.

Preferred behavior:

- load map code only when the user opens the picker
- use browser geolocation to query a runtime provider for nearby transit-stop candidates
- match provider stop labels back to the internal stop dataset using canonical names and aliases
- rank the matched 3-5 candidates by returned or computed proximity
- avoid blocking normal route search on map initialization

Runtime nearby results should be cached in browser storage when practical so repeated nearby lookups do not require repeated provider calls. If provider candidates cannot be matched confidently to known stops, those candidates should not be offered as selectable route inputs.

## Query Model

The route query logic remains direct-trip only. Full-network coverage means all published direct timetables are searchable, not that the app now supports route composition across transfers.

Result logic should continue to:

- canonicalize `From` and `To`
- find trips where origin precedes destination
- filter by day type
- sort by departure time
- compute route summary metrics from matched trips

The UI should say clearly when no direct trip exists even if the broader network might allow a transfer.

## Testing And Validation

### Parser Tests

Add fixture-backed parser tests for each layout family. The suite should verify that representative pages produce expected stop sequences and trip counts.

### Coverage Tests

Add a coverage assertion that the manifest accounts for every timetable page listed in the PDF index. The build should surface missing pages and suspicious zero-trip output.

### Frontend Tests

Add tests for:

- geolocation success
- geolocation denial
- nearest-stop ranking
- field fill behavior for both `From` and `To`
- fallback when provider results cannot be matched to known stops
- route search behavior after GPS-filled stop selection

### Manual QA

Validate at least:

- desktop and mobile search flow
- GPS permission prompts and fallback messaging
- representative lines across multiple parser families
- page-reference links back to the PDF

## Rollout Boundary

The first implementation milestone for this spec is complete when:

- every indexed timetable page is represented in the manifest
- the build can produce network-wide JSON assets without silent gaps
- the frontend supports the hybrid GPS picker for both search fields
- nearby-stop selection fills the chosen field and hands control back to direct search
- no transfer planning has been introduced

## Risks

- The PDF mixes timetable layouts enough that family boundaries may need one refinement pass.
- Some stop names may require curated disambiguation before runtime provider matches are reliable.
- Runtime map dependencies add browser-only failure modes that the current static form does not have.
- Full-network extraction may expose data quality issues hidden by the PoC line.

## Acceptance Criteria

This extension is successful if:

- users can search direct trips across every timetable represented in the official PDF index
- the build reports or fails on missing indexed timetable coverage
- both `From` and `To` support a hybrid GPS nearby-stop picker
- the picker shows the user location plus 3-5 nearest stops
- selecting a nearby stop fills the relevant field and preserves the route-first workflow
- result pages still link back to the official PDF source pages
