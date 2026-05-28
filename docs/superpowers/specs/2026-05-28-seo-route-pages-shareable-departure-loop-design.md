# SEO Route Pages and Shareable Departure Loop Design

Date: 2026-05-28
Project: Riviera Trasporti Schedules / Azzuriva
Status: Approved direction in conversation, pending user review of this written spec

## Summary

Boost Azzuriva diffusion through two connected loops:

1. search acquisition from crawlable, useful static pages for high-intent routes, localities, and lines
2. rider-to-rider sharing from richer WhatsApp/native-share messages and departure-specific links

The app already has strong primitives: route-state URLs, saved routes, share UTMs, multilingual UI, route search, browse, taxi fallback, Open Graph defaults, JSON-LD, and analytics events. This design turns those primitives into a growth system without changing the core product boundary.

The recommended approach is focused, not exhaustive. Generate a curated set of high-value static pages first, measure whether they attract qualified users, and only then expand coverage. Avoid generating thousands of thin pages.

## Current State

The repo already includes:

- a static GitHub Pages-compatible SPA
- default SEO metadata, canonical URL, Open Graph and Twitter tags in `index.html`
- JSON-LD for `WebSite` and `WebApplication`
- crawlable fallback body copy in the initial HTML
- route search state serialization in `src/lib/routeUrlState.js`
- client-side route metadata updates in `src/lib/seo.js`
- route share URLs with channel-specific UTM parameters in `src/lib/shareRoute.js`
- a share modal with link, WhatsApp, Telegram, Facebook, and X
- route search, save, and share analytics helpers in `src/lib/analytics.js`
- GTM import coverage for `route_search`, `route_save`, and `route_share`
- a data build pipeline that produces static trips, stops, localities, reachability, and metadata

The main gap is that high-intent queries are not represented by crawlable URLs. Google and other crawlers mostly see one canonical app page, while real demand is likely corridor and line specific:

- "Sanremo Imperia bus"
- "Riviera Trasporti linea 12 orari"
- "Ventimiglia Bordighera autobus"
- "bus da Andora a Imperia"

The sharing gap is similar. Azzuriva can share a route, but the shared payload is still generic. People usually share concrete decisions: a specific bus, a next departure, the last useful departure, or a route someone should save.

## Goals

- Increase organic discovery for high-intent Riviera bus searches.
- Turn share recipients into active users through useful shared-route landing context.
- Make WhatsApp and native mobile sharing faster and more concrete.
- Preserve trust by keeping official PDF source links and freshness visible.
- Keep generated pages useful to humans, not just indexable.
- Add measurement that connects organic landing, route search, share, and recipient behavior.
- Keep the app static and compatible with GitHub Pages.

## Non-Goals

- Full server-side rendering infrastructure.
- Dynamic rendering or crawler-specific cloaking.
- Generating every possible stop-pair page in the first release.
- Full multimodal trip planning.
- Real-time arrivals, delays, or alerts.
- Account-based referral mechanics.
- A separate CMS.
- A paid ads campaign.

## Product Decisions

- Generate static pages only where the data can produce a useful page with distinct content.
- Start with high-value locality pairs, localities, and lines. Do not start with all 2,493 direct stop pairs.
- Keep the home SPA canonical for the home page. Generated pages receive their own self-canonical URLs.
- Make Italian the primary SEO language for generated pages, because most relevant local searches will be Italian.
- Use generated static pages for crawlability, then hand users into the SPA for interaction.
- Make sharing concrete at the departure level while keeping route-level sharing available.
- Prefer `navigator.share()` on capable mobile browsers, with the existing modal as a fallback.
- Track growth events without storing geolocation, personal identifiers, or high-cardinality full URLs as primary reporting dimensions.

## Recommended Approach

### Phase 1: Search Acquisition Foundation

Add a build step that generates a limited set of crawlable HTML pages:

- route pages for high-value direct locality pairs
- place pages for major localities
- line pages for Riviera Trasporti lines
- `sitemap.xml`
- `robots.txt`
- `404.html`

These pages are static HTML artifacts, not a replacement for the SPA. Each page should include enough useful information to stand alone:

- page-specific title and description
- official source and dataset freshness
- day-type coverage
- direct lines and representative departure information
- official PDF page links when available
- links into the SPA with prefilled route state
- route/share CTAs
- concise FAQ or trust copy where relevant

### Phase 2: Shareable Departure Loop

Upgrade sharing so a rider can share:

- the whole route
- a specific departure card
- the selected trip/map detail

The shared message should be compact and useful in a chat:

- route label
- departure time
- arrival time
- line
- day type
- source-trust note
- Azzuriva link with share UTMs

On mobile, the primary action should try native sharing. If unsupported or cancelled, the app keeps the current modal with WhatsApp first.

### Phase 3: Measurement and Controlled Expansion

Add funnel events before expanding generated pages:

- `landing_context`
- `route_result_viewed`
- `route_no_direct_viewed`
- `share_modal_opened`
- `shared_route_opened`
- `shared_route_restored`
- `outbound_click`
- `browse_interaction`

Use early data to decide which page families to expand. If route pages attract impressions but not searches, improve content or ranking rather than generating more pages.

## Static SEO Pages

### Route Pages

Route page URL shape:

`/routes/<from-locality-slug>/<to-locality-slug>/`

Example:

`/routes/sanremo/imperia/`

Each route page should show:

- `h1`: direct buses from origin to destination
- source and freshness marker from generated metadata
- day-type selector links or grouped sections for feriale, sabato, festivo, scolastico
- the direct lines that serve the corridor
- earliest, latest, and representative departure rows
- average or typical duration if enough data exists
- official PDF links for verification
- "Open in Azzuriva" CTA with serialized route state
- "Share this route" CTA using the same share helper vocabulary
- a short limitation note: direct routes only, official PDF remains source of truth

Selection rules for v1:

- include only locality pairs with at least one direct trip
- prefer major localities and tourist/local-demand corridors
- cap the initial set to a manageable number such as 25-75 pages
- require unique route facts, not only templated prose

The route page should not promise real-time validity. It should say that schedules come from the current generated official-PDF dataset.

### Place Pages

Place page URL shape:

`/places/<locality-slug>/`

Example:

`/places/sanremo/`

Each place page should show:

- served stops for the locality
- direct destinations reachable from that locality
- lines serving the locality
- popular route links
- taxi fallback when verified data exists
- "Use my location" should remain only in the SPA, not static HTML

Place pages capture broader queries such as "bus da Sanremo" and also create internal links to route pages.

### Line Pages

Line page URL shape:

`/lines/<line-id>/`

Example:

`/lines/12/`

Each line page should show:

- line id and direction labels
- served stops, deduped and grouped enough to scan
- representative departures by day type when available
- official PDF page links
- CTAs to search from or to important stops in the SPA

Line pages capture line-number searches and create internal links to places and route pages.

## Canonical, Sitemap, and Language Strategy

Generated pages should use self-canonical URLs. The SPA home page keeps the existing home canonical.

`sitemap.xml` should include:

- home page
- generated route pages
- generated place pages
- generated line pages

`robots.txt` should point to the sitemap and avoid blocking required assets.

Italian should become the primary generated-page language in v1. The SPA can remain multilingual, but search acquisition should match likely demand. There are two acceptable v1 options:

1. generate only Italian static pages and keep the app language switch after hydration
2. generate Italian pages first and add localized alternates later with `hreflang`

Option 1 is recommended for v1 because it is smaller and easier to validate.

## Anti-Spam Guardrails

Generated pages must avoid doorway and scaled-content patterns.

Rules:

- no pages for routes with zero direct service
- no pages whose only purpose is to funnel users to the app
- no near-identical pages with only the city names swapped
- no generated prose that claims more than the static data proves
- no taxi pages as a primary directory strategy in this scope
- no hidden structured data for content users cannot see
- no crawler-specific content that differs from the user-visible page

Each generated page must include user-visible facts derived from the dataset.

## Sharing Experience

### Route-Level Sharing

Keep the existing route-level share action in the summary. Improve its message builder so each channel receives a useful default text.

Route-level message should include:

- origin and destination
- day type
- next departure when available
- line set when available
- Azzuriva link

### Departure-Level Sharing

Add a compact share control on departure cards. It should not compete with the "Open PDF" or detail action.

Departure-level message should include:

- origin and destination
- line
- departure time
- arrival time
- day type
- official-source note
- Azzuriva link with selected departure state

The URL should carry a selected trip/departure key when possible. On load, the SPA should restore the route and highlight the shared departure if it still exists in the current dataset. If the trip key no longer resolves, the app should restore the route and show a small non-blocking note that the exact shared departure is no longer available in this timetable version.

### Native Share

Use the Web Share API when available:

- call `navigator.share()` only from a direct user click
- pass `title`, `text`, and `url`
- fall back to the modal when unsupported or when share fails for a non-user-cancel reason

The fallback modal should prioritize WhatsApp on mobile. The current copy-link and social options remain available.

### WhatsApp-First Payload

WhatsApp is the most important explicit social channel for local groups and travel coordination.

The WhatsApp message should be concise and Italian-first by default, for example:

`Azzuriva: Sanremo -> Imperia, linea 12, parte 14:25, arriva 15:10. Orario dal PDF ufficiale Riviera Trasporti: <link>`

For English UI users, use the translated message.

## Shared-Route Recipient Experience

When the app opens with share UTMs and restorable route state, show a compact shared-route context near the result summary:

- "Percorso condiviso" / "Shared route"
- Save
- Reverse route
- Share again

This context should not block the result. The recipient should land directly on the useful answer whenever route state is complete.

If a shared route produces no direct result after dataset changes, show the existing no-direct recovery state plus a note that the shared route was restored from a link.

## Analytics and Measurement

Add new analytics helpers with stable event names.

### `landing_context`

Fire once on boot.

Payload:

- `tab`
- `has_route_params`
- `has_share_utm`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `referrer_type`
- `language`

### `route_result_viewed`

Fire when successful results render.

Payload:

- `from`
- `to`
- `day_type`
- `results_count`
- `has_next_departure`
- `has_taxi_fallback`
- `source_context` as `organic`, `share`, `direct`, or `unknown` where inferable

### `route_no_direct_viewed`

Fire when no direct route renders.

Payload:

- `from`
- `to`
- `day_type`
- `has_transfer_suggestions`
- `has_taxi_fallback`
- `source_context`

### `share_modal_opened`

Fire when the explicit share modal opens.

Payload:

- `share_scope` as `route` or `departure`
- `from`
- `to`
- `day_type`

### `shared_route_opened`

Fire when a route URL opens with share UTMs.

Payload:

- `utm_source`
- `share_scope`
- `has_complete_route_state`
- `day_type`

### `shared_route_restored`

Fire after the shared route runs or restores.

Payload:

- `restore_status` as `results`, `no_direct`, `partial`, or `failed`
- `results_count`
- `selected_departure_restored`

### `outbound_click`

Fire for external handoffs.

Payload:

- `target_type` as `official_pdf`, `taxi_call`, `taxi_booking`, `train`, `flixbus`, `blablacar`, or `social_share`
- `context` as `result`, `seo_page`, `no_direct`, `provider_tab`, or `shell`

Avoid using full shared URLs as primary analytics dimensions because they create high-cardinality reports. Keep full URL logging only where operationally necessary.

## Architecture

### New Static Generation Scripts

Add:

- `scripts/generate-seo-pages.mjs`
- `scripts/generate-sitemap.mjs`

The scripts should consume existing generated JSON assets and metadata. They should not parse the PDF again.

Output directories:

- `routes/`
- `places/`
- `lines/`
- `sitemap.xml`
- `robots.txt`
- `404.html`

The existing `build:data` script can remain data-only. Add a separate package script such as `build:seo` for focused local verification. Once generated pages are accepted for release, the deployment workflow should run `build:data` before `build:seo` so static pages always reflect the current dataset.

### New SEO Page Helpers

Add pure helper modules under `scripts/lib/` or `src/lib/` depending on reuse needs:

- slug generation
- route-page candidate selection
- locality route summaries
- line summaries
- HTML shell rendering for static pages
- canonical URL building

Prefer build-time helpers for generated page HTML so browser bundle size stays controlled.

### Route URL State Extension

Extend `src/lib/routeUrlState.js` with optional fields:

- `tripKey`
- `shareScope`

Rules:

- unknown trip keys do not invalidate the whole URL
- ids still win over labels when both are present
- shared state should not overwrite durable route state with UTM parameters

### Share Helpers

Extend `src/lib/shareRoute.js` to own:

- route-level message builders
- departure-level message builders
- native share payload builders
- channel priority logic
- share-scope UTM values

The renderer should not assemble social text ad hoc.

### UI Rendering

Update:

- `src/ui/renderResults.js` for departure-level share actions and shared-route context
- `src/ui/renderLogos.js` if a native share icon is needed
- `styles.css` for compact share controls
- `src/lib/i18n.js` for message templates and labels

Keep buttons stable in size so departure cards do not jump when share controls render.

## Data Flow

### Build Time

1. `npm run build:data` creates trips, stops, localities, reachability, coordinates, and metadata.
2. `npm run build:seo` reads generated assets.
3. Candidate selectors choose route, place, and line pages.
4. Static page renderer writes HTML files with page-specific metadata and body content.
5. Sitemap generator writes `sitemap.xml`.
6. Robots generator writes or verifies `robots.txt`.

### Organic Landing

1. User lands on a generated route/place/line page.
2. Static HTML gives useful content immediately.
3. CTA opens the SPA with serialized state.
4. SPA fires `landing_context`.
5. If route state is complete, SPA restores and runs the search.
6. Results fire `route_result_viewed` or `route_no_direct_viewed`.

### Share Creation

1. User clicks share at route or departure scope.
2. App builds a scoped URL and message.
3. If native share is available, app invokes it from the click.
4. Otherwise, the modal opens with WhatsApp, copy, and other channels.
5. App fires `share_modal_opened` and then `route_share` when a channel is chosen.

### Shared Route Open

1. Recipient opens a shared URL.
2. App detects share UTMs and route state.
3. App fires `shared_route_opened`.
4. Route restores and runs if complete.
5. App highlights the selected departure if possible.
6. App fires `shared_route_restored`.

## Error Handling

If generated page creation cannot find enough unique facts for a candidate route, skip the page and report it in the build summary.

If a generated page references a route that later disappears after data refresh, the next build should remove the page from `sitemap.xml`. A checked-in stale file should either be regenerated with a no-longer-direct explanation or deleted before deployment. Prefer deletion for v1.

If native sharing rejects because the user cancels, do not show an error. If it fails for another reason, open the fallback modal.

If a shared trip key no longer resolves, restore the route and show route results without forcing an error state.

If analytics is unavailable, all flows continue.

## Testing

Unit and integration tests should cover:

- route-page candidate selection includes only direct service
- candidate selection caps v1 output
- slug generation is stable and ASCII-safe
- generated route pages include title, description, canonical, source freshness, route facts, and SPA CTA
- generated place pages include direct destinations and internal links
- generated line pages include directions or served stops
- sitemap includes generated pages and excludes skipped pages
- `robots.txt` references the sitemap
- route URL parsing preserves optional `tripKey` and `shareScope`
- invalid `tripKey` does not reset the route state
- share message builders produce route-level and departure-level text
- native share payload builders include title, text, and URL
- render results includes departure share controls
- shared-route context renders only for inbound share state
- analytics helpers emit stable event names and low-cardinality payloads

Browser smoke coverage should verify:

- the current search flow still works
- an SEO page CTA opens the SPA with a runnable route
- sharing a specific departure produces a restorable URL
- unsupported native share falls back to the modal

Verification commands:

- `rtk npm test`
- `rtk npm run test:smoke`

## Rollout Plan

1. Add measurement events first so the baseline is visible.
2. Add share message and departure-share improvements.
3. Add static generation for a small route/place/line set.
4. Add sitemap and robots.
5. Deploy and submit sitemap in Search Console.
6. Wait for early indexing and usage data.
7. Expand generated pages only where pages show impressions, clicks, and route-search conversion.

## Success Metrics

Search acquisition:

- generated pages indexed
- Search Console impressions and clicks by page family
- organic session growth
- organic-to-route-search rate
- organic-to-result-viewed rate

Sharing:

- `route_share / route_result_viewed`
- departure shares by channel
- `shared_route_opened`
- `shared_route_restored`
- recipient route searches
- recipient re-shares

Guardrail metrics:

- route search completion rate
- no-direct bounce or exit proxy
- page load and hydration time
- ad/search interference once ads are active
- high-cardinality analytics warnings

## Source References

- Google Search Central JavaScript SEO: Google can render JavaScript, but static rendering or hydration is still better for users and crawlers, and some bots may not execute JavaScript.
- Google Search Central dynamic rendering guidance: dynamic rendering is not the recommended long-term solution compared with server-side rendering, static rendering, or hydration.
- Google Search Central spam policies: avoid doorway abuse and scaled content that exists mainly to manipulate search rankings.
- Google Search Central sitemaps: submit sitemap files to help Google discover URLs.
- Google Search structured data guidance: structured data should describe visible page content and should be complete and accurate.
- MDN Web Share API: `navigator.share()` requires a secure context and user activation, and support varies by browser.
- Open Graph protocol: rich social previews depend on page-level `og:title`, `og:type`, `og:image`, and `og:url`.
