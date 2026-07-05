# GTFS Primary Data Freshness Design

Date: 2026-07-06
Project: Riviera Dei Fiori Route Finder
Status: Approved in conversation, pending implementation plan

## Summary

Move the app's schedule source of truth from the parsed official PDF to the structured Regione Liguria planned-service GTFS feed, while keeping PDF references available for rider verification where they can still be mapped confidently.

This is a trust and product-quality upgrade. The app should feel more current, more defensible, and less dependent on brittle timetable-page parsing without changing the core rider workflow. The first implementation should be adapter-first: transform GTFS into the runtime JSON contracts the app already consumes, then add build guardrails and rider-facing freshness signals.

## Current State

The app currently builds route-search data from the official Riviera Trasporti PDF and ships static JSON assets for a GitHub Pages-compatible PWA. It already supports direct route lookup, route maps, saved routes, shareable route URLs, one-transfer fallback suggestions, generated SEO pages, PWA/offline support, and source links back to the PDF.

The current generated metadata identifies:

- source title: `2026 Orario Estivo Ver. 1.3ª dal 15-06-2026`
- source effective date: `2026-06-15`
- 83 indexed/manifest PDF pages

The shipped runtime dataset includes roughly:

- 2,000 trips
- 315 stops
- 68 lines
- 27 localities
- 2,324 direct stop pairs
- generated route, place, and line SEO pages

The product audit from 2026-07-06 found that trust is already a major strength, but source clarity and freshness can become a bigger differentiator if the app moves to structured regional feed data.

## External Source Context

Regione Liguria publishes regional planned-service data through GTFS and NeTEx resources at:

https://dati.regione.liguria.it/dataset/ds-637

During design discovery on 2026-07-06, the dataset page indicated a recent release/modified date of 2026-07-03 and temporal coverage from 2026-06-14 to 2026-12-12. The implementation must re-check the dataset page or feed metadata during build instead of hard-coding these dates.

## Goals

- Make GTFS the primary schedule source for rider answers.
- Keep the existing search, Browse, Saved, sharing, PWA, and SEO experiences stable.
- Preserve PDF references as verification context where line/page mappings remain available.
- Expose clear data freshness and source status to riders.
- Fail builds on broken or expired feed data before it reaches production.
- Warn maintainers about suspicious data drift that may need review.
- Keep the app static and GitHub Pages friendly.

## Non-Goals

- Redesigning the route picker or result flow.
- Adding real-time arrivals, vehicle positions, or service alerts.
- Migrating fully to NeTEx in the first pass.
- Removing the existing PDF parser immediately.
- Rebuilding route geometry from GTFS shapes in v1.
- Adding accounts, backend storage, or server-side rendering.
- Claiming live service reliability from planned-service data.

## Recommended Approach

Use a GTFS adapter pipeline as the first migration step.

The adapter should download and normalize the Regione Liguria GTFS feed, then write the same runtime JSON shapes the app already uses:

- `assets/data/trips.json`
- `assets/data/stops.json`
- `assets/data/localities.json`
- `assets/data/reachability.json`
- `assets/data/metadata.json`
- `assets/data/stop-coordinates.json` where available
- a new `assets/data/data-quality.json`

This keeps the app runtime contract stable while changing the data source underneath it. Existing UI modules, query logic, transfer suggestions, Browse, Saved, share URLs, and generated pages can continue to consume the familiar contract.

The PDF build should remain available as a reference/backstop until GTFS output has passed parity checks. The app should not depend on PDF parsing for primary route answers once the GTFS pipeline is active.

## Source Architecture

GTFS becomes the primary schedule source for rider answers.

PDF references become secondary verification context:

- show PDF links where existing line/page mappings can still be preserved
- label departures without a PDF mapping as feed-source-only rather than hiding them
- avoid implying that the PDF parser produced the schedule answer

The metadata model should expand beyond the current PDF-centric shape.

Recommended `metadata.json` source fields:

- `source.type`: `gtfs`
- `source.title`
- `source.url`
- `source.publisher`
- `source.releasedAt` when available
- `source.validFrom`
- `source.validUntil`
- `source.builtAt`
- `source.referencePdf.title`
- `source.referencePdf.url`
- `source.referencePdf.effectiveDate`

Recommended quality status fields:

- `quality.status`: `fresh`, `warning`, `stale`, or `failed`
- `quality.warningCount`
- `quality.errorCount`
- `quality.reportUrl`

The app should treat `failed` as a build-time state. Production deploys should normally never publish failed data.

## GTFS Normalization

The v1 parser should handle the standard GTFS files required for planned service:

- `agency.txt`
- `routes.txt`
- `trips.txt`
- `stop_times.txt`
- `stops.txt`
- `calendar.txt` and/or `calendar_dates.txt`

The generated app data should keep existing concepts stable:

- line ids from GTFS routes, normalized for display
- trip day types mapped into the app's existing day-type model
- stop ids stable enough to preserve URL and saved-route compatibility
- stop names normalized through the existing canonicalization rules
- localities assigned primarily through existing manual locality rules
- reachability derived from forward stop sequences

If GTFS stop ids differ from current normalized ids, add a mapping layer instead of breaking existing share URLs and saved routes. Existing manual stop aliases and locality rules should remain the first trust-preserving layer.

## Build Guardrails

The data build should become a two-stage process:

1. Fetch and normalize GTFS into the app runtime contract.
2. Validate the generated data before it can be published.

Hard failures should stop the build:

- missing required GTFS files
- zero routes, stops, trips, or stop times
- no Riviera-relevant services after filtering
- service validity range is missing or already expired
- generated runtime JSON cannot support direct route lookup
- malformed times, stop references, route references, or trip references above a strict threshold
- invalid JSON output for required runtime assets

Warnings should be recorded but not necessarily fail the build:

- feed validity ends soon
- large drop in routes, stops, trips, or direct pairs versus the previous build
- new route ids without local display mapping
- stops without locality assignment
- PDF page verification unavailable for some lines
- coordinate coverage below expected level
- large changes in generated SEO page candidates

The build should write `assets/data/data-quality.json` with:

- validation status
- source freshness summary
- counts for routes, stops, trips, stop times, lines, localities, and direct pairs
- previous-build comparison when available
- warnings and errors with stable codes
- generated timestamp

Tests and UI should consume this report rather than duplicating freshness logic.

## Rider-Facing Freshness UI

Add a compact trust/status surface in the app shell and generated SEO pages.

On the main app, show a small source chip near the route search or results header:

`Structured regional timetable · valid until 12 Dec 2026`

The date should come from feed metadata. On tap or click, the chip should open a concise source details panel showing:

- source name
- feed source URL
- last build time
- validity range
- quality status
- PDF reference note

When status is `warning` or `stale`, show a visible but non-blocking banner before route results. Copy should be practical, for example:

`The timetable feed is near its validity limit. Check the linked official source before travelling.`

On route results, source copy should become explicit:

`Times generated from Regione Liguria GTFS planned-service data. PDF link kept for operator verification when available.`

Departure cards should keep official PDF links when available. If verification is missing, use neutral copy:

`Feed source only`

Generated route, place, and line pages should include the same source validity summary in visible page copy and metadata. They should not claim real-time service status.

## Migration And Compatibility

The migration should preserve the app contract first and change the data source second.

Implementation boundaries:

- do not redesign the route picker or results flow in this phase
- do not remove the PDF parser until GTFS output has passed parity checks
- preserve saved-route and share-URL compatibility as far as possible
- keep existing manual locality and stop alias rules
- keep the current day-type UI unless GTFS validation proves it needs a separate design
- keep generated SEO page URL shapes stable

Suggested rollout:

1. Add a separate GTFS fetch/parse script.
2. Generate parallel GTFS runtime data locally.
3. Compare GTFS output against current PDF output for counts, direct-pair coverage, major corridor coverage, and representative departures.
4. Add `data-quality.json` and tests for guardrails.
5. Add source/freshness UI against the quality report.
6. Switch `build:data` to GTFS primary once parity is acceptable.
7. Keep PDF parsing scripts available as backup/reference.

## Testing

Unit tests should cover:

- GTFS parser fixtures for required files
- calendar and calendar_dates service expansion
- stop-time ordering and time parsing
- malformed references and threshold-based failures
- mapping GTFS routes/trips/stops into the app runtime contract
- locality assignment through existing manual rules
- metadata and data-quality report generation

Integration tests should cover:

- generated data supports direct route lookup
- transfer suggestions still work
- Browse line and stop indexes still render useful data
- Saved and share URL hydration remain compatible
- generated SEO pages include freshness/source metadata
- warning and stale statuses render correctly
- hard failure cases stop the build

Full verification for implementation should include:

- `rtk npm test`
- `rtk npm run test:smoke`
- a local browser check of the source chip/details panel
- a data-quality report review after building from the live feed

## Analytics

Add lightweight diagnostics to the existing data layer:

- `data_source_status_viewed`
- `data_source_warning_shown`
- `data_source_link_clicked`

Payloads should use low-cardinality values:

- `source_type`
- `quality_status`
- `warning_count`
- `valid_until`

Do not send full feed URLs, personal data, geolocation, or high-cardinality stop/trip details through these events.

## Risks

GTFS may not map cleanly to the app's current day types. The implementation should make the mapping explicit and covered by fixtures before switching production data.

GTFS stop ids may differ from current normalized ids. A compatibility map is required if those ids would break saved routes or shared URLs.

The feed may include more agencies or regional services than this product should expose. Filtering must be conservative and validated so the app remains scoped to Riviera dei Fiori / Riviera Trasporti use.

PDF verification links may become incomplete after switching to GTFS primary. The UI must be honest when a departure is feed-only.

Planned-service data may feel "live" to riders if freshness copy is too strong. Every source label should distinguish planned timetable freshness from real-time arrivals or disruption status.

## Open Implementation Decisions

- Exact GTFS download URL and archive format after inspecting the live dataset resource.
- Whether to store previous-build comparison data in git, in a generated artifact, or by comparing against existing checked-in JSON.
- The threshold values for large-count-change warnings.
- The final mapping between GTFS service calendars and the app's `feriale`, `festivo`, and `giornaliero` day types.
- Whether stop coordinates should come from GTFS `stops.txt` immediately or remain on the current coordinate pipeline in v1.

## Acceptance Criteria

- `build:data` can generate runtime data from GTFS as the primary schedule source.
- Existing app flows continue to consume the same runtime JSON contracts.
- The build fails on expired, empty, or structurally invalid feed data.
- `assets/data/data-quality.json` records status, counts, warnings, and timestamps.
- Riders can see source type, validity range, and last build information in the app.
- Generated SEO pages include visible freshness/source information.
- PDF links remain where available and degrade honestly when not available.
- Existing tests pass after the migration.
