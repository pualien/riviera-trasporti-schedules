# Riviera Trasporti Route Finder Design

Date: 2026-04-30
Project: Riviera Trasporti Schedules
Status: Approved in conversation, pending final user review of this written spec

## Summary

Build a static web app for GitHub Pages that makes Riviera Trasporti timetable consultation easier than reading the raw PDF. The first release should answer a practical question such as "What time can I leave Porto Maurizio to go to Sanremo?" and show both the next departures and the full direct timetable for the selected day type, plus average travel time.

The app will not be a full journey planner. It will sit on top of the official timetable PDF, extract structured metadata at build time, and present direct-route results in a route-first interface.

## Goals

- Make direct origin-to-destination timetable lookup easy on desktop and mobile.
- Show next departures first, then the full list for the chosen day type.
- Compute average travel time from real matching trips for the selected route and day type.
- Preserve trust by linking back to the official PDF as the source of truth.
- Keep hosting simple enough for GitHub Pages.

## Audience

The initial release targets a mixed audience:

- Residents who already know their line or common stop names.
- Occasional riders and tourists who need clearer guidance than the original PDF provides.

The UI should therefore support plain-language stop lookup first, with line browsing as a secondary path.

## Non-Goals For Version 1

- Transfer planning.
- Live vehicle positions or delay data.
- Real-time service alerts.
- Full network optimization across multiple lines.
- Perfect coverage for every stop pair before curation improves the dataset.

## Product Scope

Version 1 will support:

- Route-first search with `From`, `To`, and `Day type`.
- A results view that shows:
  - next departures relative to current time
  - the full direct timetable for the selected day type
  - average travel time for the filtered result set
  - likely line and service span information
  - links back to the official PDF
- Secondary browse-by-line access for users who already know the line number.
- Bilingual UI with Italian and English labels.

Version 1 will only return direct rides that can be inferred from a single timetable direction.

## Source Of Truth

The official Riviera Trasporti PDF remains the canonical source:

- PDF: `2025-2026 Orario Invernale Generale 7ª Ver. dal 01-04-2026`
- Effective date used in design decisions: April 1, 2026

The web app should clearly communicate that its results are derived from the official PDF and provide a direct link back to the relevant source pages where possible.

## Architecture

The project will have two layers:

1. A build-time extraction layer that reads the PDF and generates static JSON assets.
2. A vanilla JavaScript frontend that loads those JSON assets in the browser and renders route results.

This preserves compatibility with GitHub Pages while allowing richer interactions than a raw embedded PDF.

## Data Strategy

### Extraction Approach

Use a mostly automatic extraction pipeline, but keep a small curated configuration layer for reliability.

The pipeline should:

- fetch or read the official PDF
- extract text page by page
- identify timetable sections, line identifiers, day-type segments, and stop/time columns
- normalize the extracted content into static JSON files

### Curated Metadata

Use a hand-maintained configuration file to stabilize the parts that are likely to be inconsistent in the PDF text:

- known lines and their relevant pages
- stop aliases
- direction labels
- route-specific parsing hints if needed

This keeps the system practical without forcing full manual data entry.

### Generated Data Files

The build output should be simple static assets such as:

- `lines.json`
- `stops.json`
- `trips.json`

At minimum, each trip record should contain:

- line id
- direction or service label
- day type
- ordered stop list
- departure/arrival times by stop
- source page reference
- computed durations between any valid stop pair on that trip

### Stop Matching

Stop search must support aliases and normalization so users can type variants like:

- `Porto Maurizio`
- `Imperia Porto Maurizio`

Search should prioritize normalized exact matches, then aliases, then fuzzy-like partial matches within safe limits.

## Result Logic

For a route such as `Porto Maurizio -> Sanremo`, the app should:

1. Match the origin stop.
2. Match the destination stop.
3. Find direct trips where both stops appear in the same ordered trip and the origin precedes the destination.
4. Filter by day type.
5. Split results into:
   - next departures from now
   - full timetable list for that day type
6. Compute summary metrics from the matching set:
   - average travel time
   - first departure
   - last departure
   - likely line or lines

Average travel time must be calculated from the actual filtered set of direct trips, not from a route-level constant.

## Frontend UX

### Visual Direction

The visual language should be Apple-influenced rather than editorial-warm:

- large, legible typography
- clean hierarchy
- restrained palette
- soft glass-like layered surfaces
- premium but calm visual density

The user-approved hero copy direction is:

`Find buses from Porto Maurizio to Sanremo.`

This is representative of the route-first experience, not a hardcoded production string.

### Homepage

The homepage should emphasize direct route lookup:

- `From` input with autocomplete
- `To` input with autocomplete
- `Day type` segmented control
- clear primary action for showing departures
- secondary browse-by-line access

### Results Screen

The results page should present information in this order:

1. Route summary card.
2. Next departures from the current time.
3. Metrics such as average duration, first departure, and last departure.
4. Full filtered timetable for the chosen day type.
5. Source attribution and link back to the PDF.

The result view should feel designed, not like a raw table dump.

## Error Handling And Trust

The app should be explicit about dataset limits and lookup failures.

Expected states include:

- no direct route found for this stop pair
- stop name ambiguous, user must choose a match
- route may exist in the PDF but is not yet indexed correctly

Every failure state should offer a fallback path:

- browse likely lines
- open the official PDF
- retry with suggested stop aliases

The app should never pretend to know more than the dataset supports.

## Testing Strategy

Testing should cover both the build pipeline and the client-side route logic.

### Build Validation

- Verify that extraction completes against the current PDF.
- Spot-check representative lines and stop pairs against the source PDF.
- Confirm that source page references are preserved.

### Frontend Validation

- Verify route matching for known direct pairs such as Porto Maurizio to Sanremo.
- Verify day-type filtering.
- Verify next-departure ordering based on current time.
- Verify average travel time calculations.
- Verify stop alias matching.
- Verify empty and ambiguous result states.

### Manual QA

- Test on mobile and desktop.
- Validate readability of the Apple-influenced UI.
- Check that results are understandable for both Italian and English users.

## Deployment

The app should be deployable as a static site on GitHub Pages.

That implies:

- no server-side runtime
- all data consumed as static assets
- build artifacts generated before deployment

## Implementation Notes

- Use vanilla JavaScript for the app runtime.
- Keep the frontend modular even without a framework.
- Prefer a clear separation between data loading, route matching, rendering, and interaction logic.
- Preserve a path for future extension to transfers, but do not implement transfers in version 1.

## Risks

- PDF extraction quality may vary by line layout.
- Some stop names may need manual alias curation.
- Timetable formatting changes in future PDFs may require parser adjustments.

These risks are acceptable because the product is intentionally scoped to a static, direct-route-first first release.

## Acceptance Criteria

The first release is successful if:

- a user can search a direct route such as Porto Maurizio to Sanremo
- the app shows next departures and the full timetable for the selected day type
- the app computes and displays average travel time from matching trips
- the app links results back to the official PDF
- the interface works cleanly on mobile and desktop
- the app can be hosted on GitHub Pages without a backend
