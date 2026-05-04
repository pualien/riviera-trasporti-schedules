# Direct-Route Trust And Fallback Design

Date: 2026-05-05
Project: Riviera Trasporti Schedules
Status: Approved in conversation, pending user review of this written spec

## Relationship To Prior Specs

This document refines the existing direct-route product without changing its core boundary.

It builds on:

- the initial route-finder spec from April 30, 2026
- the full-network and nearby-stop extension from May 1, 2026

The app remains a direct-trip lookup tool. It does not become a transfer planner in this scope.

## Summary

Improve rider trust and usefulness in four areas:

1. replace the current generic no-results state with a clearer fallback experience
2. make time handling reflect the actual service day more accurately
3. make the results summary answer rider decisions before showing supporting statistics
4. expose dataset freshness from the official PDF build instead of relying on hidden or hardcoded source metadata

The goal is to make the current service feel more dependable and more actionable without expanding into transfer planning.

## Goals

- Preserve the direct-route-only product boundary.
- Give riders a better path when the exact direct pair has no match.
- Prevent misleading “next departures” behavior after service has ended for the day.
- Default the selected day type more intelligently based on the current date.
- Promote result information that helps riders decide what to do next.
- Show clear freshness and source-of-truth metadata derived from the current official PDF build.

## Non-Goals

- Transfer planning.
- Multi-leg routing.
- Real-time service alerts or delays.
- Automatic seasonal schedule switching beyond the data already built into the deployed dataset.
- Backfilling historical freshness information from prior builds.

## Product Decisions Locked In

- The service remains direct-trip-only.
- “Fallback when no direct bus exists” means a better no-direct state, not one-transfer routing.
- Alternate suggestions should stay simple and deterministic. They should be derived from known direct-search data already available in the app.
- Result summaries should lead with rider decisions and retain supportive aggregate metrics as secondary information.
- Freshness data must be produced by the static build pipeline and consumed by the frontend at runtime.

## Current Problems

### Generic No-Result Handling

The current product collapses every no-match case into a generic empty state. It does not distinguish between:

- no direct trip for the chosen exact pair
- a likely mismatch caused by over-specific stop choice
- the broader possibility that the journey exists only with a transfer

That leaves riders without a useful next step.

### Time Logic That Can Mislead

The current service defaults to `feriale` and chooses “next departures” by filtering against the current time. If no later departure exists, it falls back to the earliest trips in the result set. That creates a trust problem because the UI can imply that the next bus is still upcoming when service has already finished for the day.

### Summary Metrics That Are Informative But Not Decisive

Average duration, first departure, and last departure are useful supporting facts, but they are not the first questions most riders need answered. Riders primarily need to know:

- what is the next usable ride
- when it arrives
- when the last useful ride leaves today

### Hidden Freshness

The current build produces static timetable data, but the rider cannot easily see:

- which PDF the dataset came from
- when the data was built
- what official update date the dataset reflects

The current results view also hardcodes the PDF URL instead of treating source metadata as generated build output.

## User Experience

### Search Behavior

The existing route-first search remains unchanged:

- choose origin area or exact stop
- choose destination
- choose day type
- show direct departures

The new work changes how the app interprets and presents search outcomes.

### No-Direct Fallback State

When a search produces zero direct trips, the app should render a dedicated no-direct fallback panel instead of the current generic empty message.

The panel should include:

- a clear statement that no direct ride was found for the selected exact route and day type
- a short note that the wider network may still allow the trip with a transfer, which this tool does not plan
- suggested next actions inside the direct-search scope
- a visible link back to the official PDF source

### Fallback Suggestions

Suggestions should stay within the current direct-search model.

Preferred suggestion order:

1. if the rider chose an exact origin stop within a locality, suggest other exact origin stops from the same locality that unlock at least one direct destination
2. if the rider chose an origin locality without an exact stop, suggest a small set of likely direct destinations from that locality so the rider can adjust the destination
3. if no structured suggestion can be produced, keep the explanatory no-direct message plus the PDF link

Suggestions should not claim to be “best route” or “recommended transfer.” They are direct-search recovery suggestions only.

### Result Summary Priority

The summary block should answer rider decisions in this order:

1. next departure, if one still exists today
2. soonest arrival among remaining same-day departures
3. last departure today
4. line set

Average duration should remain visible but demoted to secondary supporting information.

### End-Of-Service Messaging

When matching direct trips exist for the selected day type but all departures for the current service day have already passed, the UI should not label any morning trip as “next.”

Instead, it should show:

- a summary state that says there are no more departures today
- the full timetable list for reference
- the last departure today as a trust-preserving anchor

This applies only when the selected search reflects the current local date. If the user is effectively browsing a non-current service day category, the UI may still show the full timetable without pretending the next ride is upcoming.

### Freshness Marker

The UI should surface a compact trust marker near the shell or results header that communicates:

- the dataset comes from the official Riviera Trasporti PDF
- the official PDF title or version
- the relevant official update date when available
- the build timestamp or generated-on date

The wording should stay compact and practical rather than sounding operational or internal.

## Time Handling

### Default Day Type

The app should derive a smarter default day type from the current local date.

Initial rules:

- Sunday defaults to `festivo`
- Saturday defaults to `sabato`
- Monday through Friday default to `feriale`

The `scolastico` option remains manual. It should not auto-select because school-only applicability cannot be inferred reliably from the current date alone without a dedicated calendar model.

### Current-Day Interpretation

The notion of “next departure” should be tied to the user’s current local time and current local date in the browser.

For the default selected day type, current-day summaries should distinguish between:

- remaining departures still ahead today
- no remaining departures today

If no remaining departures exist, the summary should shift to an ended-service state rather than reusing the earliest departure in the timetable as if it were upcoming.

### Non-Current-Day Browsing

Because the product does not yet include a calendar picker, the selected day type remains a coarse category rather than a specific future date.

Therefore:

- the full timetable remains visible regardless of current time
- “next departure” language should only be used when there is an actual remaining departure for the current local day and chosen category
- otherwise, the summary should use neutral wording such as “no more departures today”

## Data And Build Architecture

### Generated Metadata Asset

Extend the build pipeline to output a new metadata asset alongside the existing route data files.

The generated metadata should include at minimum:

- official PDF title
- official PDF URL
- official effective or update date when known
- build timestamp
- indexed timetable page count
- parsed manifest page count

The frontend should treat this metadata file as the source of truth for freshness and PDF linking.

### Source Metadata Ownership

The PDF source URL and identifying details should no longer live only as hardcoded UI constants. They should originate from the build pipeline so the deployed interface reflects the current dataset automatically.

### Coverage Exposure

The build already enforces indexed timetable coverage. This work should expose a lightweight version of that coverage in the generated metadata so the runtime can communicate that the dataset came from a validated indexed build without surfacing internal parsing jargon.

## Query And Rendering Architecture

### Search Outcome Modeling

The current search path mixes route lookup, summary derivation, and empty-state branching inside the main runtime module.

Introduce a small query helper layer that produces explicit search outcomes such as:

- direct results with remaining same-day departures
- direct results with no remaining same-day departures
- no direct results with fallback suggestions
- no direct results with explanation only

This keeps the rendering layer simpler and makes the new behaviors easier to test.

### Summary Modeling

Route summary construction should move from aggregate-only metrics toward a rider-decision summary model.

The summary object should be able to represent:

- next departure card data
- soonest arrival card data
- last departure today
- lines involved
- average duration as secondary information
- an explicit `serviceEnded` or equivalent state for the selected day type on the current local day

### Fallback Suggestion Inputs

Fallback suggestions should reuse existing route and locality data.

Allowed inputs:

- selected origin locality
- selected origin exact stop
- known reachable direct destinations
- known stop lists inside the same locality

Disallowed inputs:

- inferred transfers
- network pathfinding
- speculative destination recommendations not grounded in current direct-search data

## Copy And Internationalization

New i18n strings are required for:

- no direct route found for this exact pair
- this journey may still require a transfer
- try another stop in the same area
- no more departures today
- updated from official PDF
- built on or refreshed on

All new trust and fallback copy should preserve the current product tone:

- practical
- calm
- trustworthy

## Testing Strategy

### Query Tests

Add or expand tests for:

- smarter default day type selection by local weekday
- next-departure selection when future departures remain
- ended-service summary when all matching departures have already passed
- result summary ordering and derived metrics
- no-direct outcome generation with fallback suggestions

### Build Tests

Add build-pipeline coverage for:

- metadata asset generation
- inclusion of PDF source metadata
- inclusion of build timestamp and indexed coverage counts

### UI Tests

Add rendering tests for:

- the no-direct fallback panel
- the ended-service summary state
- the refreshed result summary priorities
- the freshness marker

### Manual QA

Verify at minimum:

- weekday, Saturday, and Sunday default day-type behavior
- searches late in the day where service has already ended
- searches that produce zero direct rides but allow useful fallback suggestions
- PDF links rendered from generated metadata
- Italian and English copy for the new trust states

## Risks

- Day-type defaults remain approximate because `scolastico` cannot be inferred safely without a school-calendar model.
- Some no-direct fallback suggestions may be useful but still imperfect because they intentionally avoid transfer logic.
- Freshness metadata can drift only if the build pipeline and deployed assets are not regenerated together, so deployment must continue rebuilding data consistently.

## Acceptance Criteria

This work is successful when:

- the app still behaves as a direct-route-only search tool
- searches with no direct exact match show a structured fallback state instead of only a generic empty message
- current-day searches no longer present already-passed morning departures as “next departures”
- the default day type changes by weekday versus Saturday versus Sunday
- result summaries lead with next departure, soonest arrival, and last departure today
- average duration remains available as secondary information
- the frontend reads PDF URL and freshness data from generated metadata instead of a hardcoded result-view constant
- the UI clearly communicates that data comes from the official Riviera Trasporti PDF and shows freshness information derived from the current build
