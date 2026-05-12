# SEO And Taxi Secondary Option Design

Date: 2026-05-12
Project: Riviera Trasporti Schedules
Status: Approved in conversation, pending user review of this written spec

## Relationship To Prior Specs

This document extends the existing direct-route product without changing its core boundary.

It builds on:

- the initial route-finder spec from April 30, 2026
- the direct-route trust and fallback spec from May 5, 2026

The app remains a single-page, static direct-route lookup tool. It does not become a transfer planner, a route-landing-page generator, or a full taxi directory.

## Summary

Improve two adjacent areas:

1. make the single-page application more indexable and easier to understand for search engines and social previews
2. add a verified taxi secondary option to search outcomes so riders have a practical fallback alongside bus results

The feature should keep the current Riviera Trasporti product shape intact:

- one static SPA
- direct rides only
- official PDF as source of truth for bus data
- manually verified taxi references checked into the repo

## Goals

- Improve baseline SEO for the SPA without introducing route-specific landing pages.
- Keep visible page copy aligned with search metadata and structured data.
- Show a taxi secondary option on search outcomes when a current public contact has been verified for the relevant province.
- Reuse the taxi secondary option in both direct-result and no-direct states.
- Keep the taxi data model simple, explicit, and testable.

## Non-Goals

- Transfer planning.
- Server-side rendering or pre-rendered route pages.
- Runtime fetching of taxi contacts from third-party sites.
- A full municipality-by-municipality taxi directory.
- Promising taxi coverage for provinces where no current public contact can be verified.

## Product Decisions Locked In

- The product remains a single-page app.
- SEO improvements should strengthen one canonical page rather than create many route pages.
- Taxi is a secondary option to buses, not a replacement flow and not a ranking signal for search results.
- Taxi content should appear whenever the current search outcome can be mapped to a province with a verified public contact.
- If no verified public contact exists, the taxi block should not render.
- Taxi data is checked in as a curated asset with source URLs and verification dates, not fetched live in the browser.

## Current Problems

### Weak Default Crawlability

The current HTML shell has a title and branding assets, but very little descriptive metadata or crawlable body copy before JavaScript executes.

That weakens:

- generic discoverability for the app itself
- snippet quality in search results
- social sharing previews

### No Secondary Ground-Transport Fallback

The current product can show direct bus results or a no-direct fallback state, but it does not offer a verified secondary transport option inside the same flow.

For users arriving through search, especially tourists and occasional riders, that means the tool can still leave them at a dead end after the route lookup.

### Province Data Is Not Explicit

The shipped stop and locality datasets do not currently expose a province field that the UI can rely on directly.

That means taxi rendering needs a small, deterministic province-resolution layer rather than implicit string guessing spread across UI code.

## User Experience

### Search Results With Direct Buses

When a direct route is found, the app should keep the existing bus-first summary and departures list.

Below the summary, render a compact taxi secondary-option card when the destination side can be mapped to a province with a verified taxi contact.

The card should include:

- a short label framing taxi as a secondary option
- the province label
- the verified public phone number
- a tap-to-call link
- an online booking link when available
- a source link for trust

The card should not compete visually with the bus departures list. It is a fallback convenience, not the primary result.

### No-Direct Fallback

When no direct bus is found, the existing no-direct panel should still explain that the tool does not plan transfers.

If a verified taxi contact exists for the destination province, the same taxi secondary-option card should appear in that panel as a practical next step.

This keeps the no-direct state actionable without pretending the app offers multimodal routing.

### Missing Taxi Coverage

If the destination cannot be mapped to a known province or the province has no currently verified public taxi contact, the app should omit the taxi card entirely.

The UI should not show placeholders such as:

- unavailable taxi number
- contact coming soon
- generic search-the-web instructions

Omission is cleaner and more trustworthy than weak fallback copy.

## SEO Strategy Within The SPA Constraint

### Strengthen Static Head Metadata

`index.html` should gain:

- a stronger title
- a descriptive meta description
- canonical URL
- Open Graph tags
- Twitter card tags
- structured data as JSON-LD

The structured data should be limited to types that honestly describe the product, such as `WebSite` and `WebApplication`.

### Add Crawlable Default Body Copy

The initial `#app` markup in `index.html` should contain short, meaningful crawlable copy before hydration.

That copy should explain:

- what the tool does
- that it is based on the official Riviera Trasporti PDF
- that it supports direct-route lookup only
- representative coverage areas such as Imperia, Sanremo, Ventimiglia, Andora, and nearby Riviera destinations

This copy must read naturally for humans. It should not be a keyword dump.

### Client-Side Search-Aware Metadata

After the user completes a search, the SPA should update `document.title` and the main description metadata to reflect the selected route and day type in a compact, readable way.

This is useful for:

- browser tabs
- bookmarking
- client-rendered shares

But it is secondary to the static default SEO layer, because some crawlers will only see the original HTML.

### Visible Supporting Copy

The shell should include a short informational section that reinforces the tool's purpose and the network it covers using language people actually search for, such as:

- Riviera Trasporti
- bus timetable
- direct routes
- Imperia
- Sanremo
- Ventimiglia
- Andora

The content must remain concise and honest about limitations.

## Data And Architecture

### Taxi Registry Asset

Add a checked-in taxi registry module or JSON asset that contains manually verified entries keyed by province.

Each entry should include:

- `provinceId`
- `provinceLabel`
- `serviceLabel`
- `phone`
- `callHref`
- `bookingUrl` when available
- `sourceUrl`
- `verifiedAt`

Optional descriptive fields are acceptable if they materially improve the UI, but the model should stay small.

### Province Resolution Layer

Add a dedicated province-resolution module that maps a destination stop or locality to a province.

For this scope, the recommended implementation is a checked-in mapping based on known stop and locality patterns from the static dataset.

This is preferred over:

- hardcoding province logic inside render functions
- ad hoc free-text inference on every render
- calling external geocoding services

The resolution module should return either a known province identifier or `null`.

### Separation Of Responsibilities

Keep these concerns separate:

- province resolution
- taxi registry lookup
- taxi card rendering
- SEO metadata management

This makes the feature easier to test and prevents UI code from becoming a place where business rules accumulate.

## Verified Taxi Data Policy

Taxi data must be backed by public sources that can be cited in the repository.

As of 2026-05-12, the initial verified coverage for the current network footprint includes:

- Imperia, based on the Comune di Imperia taxi page
- Savona, based on current public taxi references for Savona and Albenga

Each checked-in taxi entry should retain its source URL and verification date so future maintenance is explicit.

If a future contact changes or disappears, the entry should be updated or removed in source control rather than silently drifting.

## Rendering Rules

### Results View

In direct-result mode:

- keep the current summary layout
- insert the taxi secondary-option card below the bus summary metrics
- keep departures and trip-map interactions unchanged

### No-Direct View

In no-direct mode:

- keep the current explanation and direct-search suggestions
- append the taxi secondary-option card when available
- preserve the official PDF link

### Language

Taxi labels and framing text should use the existing translation system.

At minimum, add strings for:

- taxi secondary option label
- call action
- online booking action
- source / verified framing

The phone number and external URLs remain data, not translated copy.

## Testing

Add or update tests for:

- province resolution across representative destinations in the current network footprint
- taxi registry lookup behavior
- taxi card rendering in direct results
- taxi card rendering in no-direct fallback
- default SEO markup in `index.html`
- client-side metadata updates after route selection

Tests should prove both positive and negative cases:

- taxi card renders when coverage exists
- taxi card does not render when coverage is absent

## Risks And Constraints

### SEO Expectations

This work should improve the discoverability and snippet quality of the app as a whole, but it will not provide the same search-surface coverage as route-specific static pages.

That tradeoff is accepted because the product boundary remains a single SPA.

### Taxi Data Maintenance

Taxi contacts are operational information and may change over time.

That risk is controlled by:

- storing source URLs
- storing verification dates
- limiting the feature to contacts that have actually been checked

### Province Resolution Drift

If the transit dataset expands to additional territories, the province-resolution mapping will need explicit maintenance.

That is acceptable for this scope because it is simple, inspectable, and safer than silent heuristics.

## Implementation Outline

1. add a taxi registry asset with verified entries and source metadata
2. add a province-resolution helper for search destinations
3. add a reusable taxi card renderer
4. wire the taxi card into direct results and no-direct fallback
5. strengthen static HTML metadata and crawlable shell copy
6. add client-side metadata updates after search
7. add test coverage for SEO and taxi rendering paths

## Open Questions Resolved In Conversation

- Taxi should be attached as a secondary option on search outcomes, not only when no direct bus exists.
- Taxi should be shown only when a current public contact can be verified online.
- SEO improvements should stay within the single-page app architecture and should not introduce route-specific landing pages.
