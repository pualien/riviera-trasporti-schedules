# Taxi Coverage Expansion Design

Date: 2026-05-13
Project: Riviera Trasporti Schedules
Status: Approved in conversation, pending user review of this written spec

## Relationship To Prior Specs

This document is a follow-up to the taxi secondary-option work from May 12, 2026.

It does not change the bus-search product shape, the SPA constraint, or the earlier SEO direction. It narrows in on a data-model problem discovered after rollout: the app currently exposes only province-level taxi entries, while users search for destination names such as Andora, Diano Marina, Sanremo, and Arma di Taggia.

## Summary

Expand taxi coverage from a province-only lookup into a verified destination-coverage registry.

The app should:

1. map searched stops and localities to the specific verified taxi service that covers that destination when such coverage is known
2. keep province fallback available where that remains the best verified level of certainty
3. render a footer directory that explicitly names all covered destinations beneath each verified taxi service so those destination names are present in crawlable HTML

## Goals

- Make route taxi cards appear for named destinations that currently fall through the province resolver or only show as a generic province contact.
- Ensure towns such as Andora, Diano Marina, Sanremo, Arma di Taggia, Ventimiglia, and Bordighera can appear explicitly in the SEO-facing taxi section when verified coverage exists.
- Preserve the rule that only currently verified public contacts may be shown.
- Keep lookup logic deterministic and testable with checked-in data.

## Non-Goals

- Fetching taxi contacts live at runtime.
- Exhaustively covering every municipality in Liguria.
- Adding taxi ranking, routing, or fare estimation.
- Turning the product into a taxi marketplace.

## Current Problems

### Province Matching Is Too Coarse

The current resolver returns `imperia` or `savona` based on a small list of stop-name prefixes and a limited canonical fallback.

That causes two failures:

- some destinations in the current dataset are not mapped at all by explicit rules
- many distinct destinations collapse into a single province-level card even when a verified destination-specific taxi service exists

### Footer SEO Copy Hides Destination Names

The bottom taxi section currently lists service entries only.

That means users and crawlers see generic labels such as `Taxi Imperia` or `Radio Taxi Albenga`, but not the specific destination names those services are meant to support. As a result, searches for destination-plus-taxi combinations are underserved.

## Product Decisions Locked In

- The app still shows only verified public taxi contacts.
- Taxi remains a secondary option to buses.
- Coverage is curated manually in source control.
- A destination-specific service should win over a broader province-level service when both are available.
- When multiple searched endpoints map to different verified services, show both.
- The footer directory should name covered destinations for SEO and utility.

## Data Model

Replace the province-only mental model with two related concepts:

### Taxi Service Entries

Each verified service entry should continue to contain its public-facing contact details and verification metadata, including:

- stable service id
- service label
- province label where useful
- one or more phone numbers
- booking URL when available
- source URL
- verification date

### Coverage Metadata

Each service entry should also declare the destinations it covers in checked-in data.

Recommended shape:

- `coverageLabels`: human-readable destination names for footer rendering and SEO copy
- `coverageStopIds`: exact stop ids covered by that service when known
- `coverageCanonicalPrefixes` or equivalent stop-name match rules only where exact stop ids are impractical

The goal is to match destinations from the route search to a verified service directly, not to infer too much from province alone.

## Lookup Rules

### Route Taxi Resolution

For each route endpoint shown in the taxi-secondary-option flow:

1. resolve the selected stop record when possible
2. attempt an exact coverage match against verified service data
3. if no destination-level service matches, fall back to the existing province-level verified service when available
4. de-duplicate identical service entries before rendering

This keeps the route card accurate without rendering duplicate contacts for both endpoints when one service covers both.

### Footer Directory

The footer should render every verified service entry together with a compact list of covered destination names.

Examples of expected visible coverage names include:

- Andora
- Diano Marina
- Imperia / Porto Maurizio
- Sanremo
- Arma di Taggia
- Ventimiglia
- Bordighera

This section should remain concise, but destination labels must be present in server-delivered HTML.

## Verified Coverage Seed

As of 2026-05-13, the follow-up implementation may seed verified entries using these public sources:

- Imperia: Comune di Imperia
- Diano Marina: Mauro Taxi
- Sanremo and Taggia-area coverage where verified: Radio Taxi Sanremo
- Ventimiglia: Comune di Ventimiglia
- Bordighera: Taxi Bordighera
- Albenga-side coverage useful for Andora and nearby Savona-side destinations: Radio Taxi Albenga

Each seed entry should preserve its exact source URL and verification date in code.

If a listed municipality cannot be backed by a current public source, it should not be added merely for completeness.

## Testing

Add or update tests for:

- destination-level route taxi resolution for Andora, Diano Marina, Sanremo, Arma di Taggia, Ventimiglia, and Bordighera
- province fallback when no destination-specific coverage exists
- de-duplication when both route endpoints map to the same service
- footer rendering that includes covered destination names

## Risks And Trade-Offs

- Curated coverage data requires occasional maintenance, but that is preferable to weak heuristic inference.
- Some services may legitimately cover multiple municipalities. The data model should represent that explicitly instead of cloning nearly identical entries.
- Generic stop names such as `autostazione` or `cimitero` must never be matched without surrounding destination context from explicit coverage data.

## Implementation Shape

Keep the patch small and local:

- evolve the taxi directory module into a service-plus-coverage registry
- add a resolver dedicated to matching route endpoints to verified service entries
- update the taxi card renderer only where copy needs to reflect destination coverage
- expand the footer rendering to show covered destination labels beneath each service

No change is needed to the bus search pipeline, PDF parsing, or the direct-route-only policy.
