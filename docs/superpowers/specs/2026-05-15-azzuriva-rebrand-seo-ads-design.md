# Azzuriva Rebrand, SEO, And Ads Design

Date: 2026-05-15
Project: Riviera Trasporti Schedules
Status: Approved in conversation, pending user review of this written spec

## Relationship To Prior Specs

This document supersedes the current product naming direction while extending the existing SEO work.

It builds on:

- the Riviera brand identity spec from May 4, 2026
- the SEO and taxi secondary option spec from May 12, 2026
- the connected route tools and trip-detail usability work completed in mid May 2026

The product remains a static, direct-route-first web application at launch. The approved change is a branding and packaging shift that gives the product room to expand into a broader Riviera mobility and local-discovery companion over time.

## Summary

Adopt `Azzuriva` as the primary product brand, strengthen the site so search engines and users understand it as an independent Riviera mobility companion, and prepare safe layout surfaces for future website monetization.

This work should:

1. replace the current product-facing name with `Azzuriva`
2. preserve `Riviera Trasporti` as source and trust language rather than as the brand name
3. improve site-name consistency, crawlable copy, and structured data around the new brand
4. reserve ad-ready layout zones that can later be connected to AdSense or local sponsorships without redesigning the interface

## Goals

- Launch with a more memorable, premium, independent brand.
- Keep the product understandable to current riders who search for Riviera Trasporti information.
- Improve generic and branded SEO without relying on the domain name alone.
- Prepare the UI and document structure for low-friction ad activation later.
- Preserve the app's calm, trustworthy product character.

## Non-Goals

- Launching a full destination guide, accommodation marketplace, or editorial travel magazine.
- Implementing server-side rendering or route landing pages.
- Integrating live ad network code without a real publisher account and deployment target.
- Claiming official operator status.
- Changing the app's core direct-route product boundary in this scope.

## Product Decisions Locked In

- The approved product name is `Azzuriva`.
- The name is accepted only if the exact launch domain `azzuriva.com` can be secured before the public domain migration is finalized.
- The app should read as independent and unofficial.
- `Riviera Trasporti` remains visible in supporting copy as the timetable data source and trust anchor.
- The product voice remains practical, calm, and premium rather than playful.
- The growth direction is `mobility plus local discovery`, not a pure transit utility and not a full trip-booking platform.
- The first monetization target is conservative Google AdSense Auto ads, with room for direct local sponsors later.

## Current Problems

### Brand Ceiling

The existing name, `Riviera Trasporti Ricerca Percorsi`, is descriptive but narrow, operator-tied, and difficult to grow into a broader Riviera companion brand.

It works for immediate comprehension but limits:

- memorability
- social sharing
- premium brand perception
- future expansion into discovery content and sponsorship inventory

### Search Signals Are Still Too Utility-Narrow

The existing static metadata and crawlable body copy do useful work, but they still frame the site mostly as a route lookup tool.

That makes sense for the current feature set, but it underuses adjacent search intent around:

- Riviera travel
- Riviera transport
- practical local mobility
- key towns and localities served by the network

### Monetization Is Not Layout-Ready

The current interface does not reserve intentional areas for future ads or sponsors.

If monetization is added later without structural preparation, the likely result is one of:

- ad code inserted into awkward locations
- content shifts that feel bolted on
- degraded trust in a product that currently feels restrained and useful

## Brand Strategy

### Primary Brand

Use `Azzuriva` as the primary product name across:

- visible UI branding
- metadata
- manifest
- documentation
- tests that assert brand strings

The name should be written as one word in metadata and technical identifiers where appropriate, and as a single visual wordmark in the product lockup.

### Supporting Descriptors

The brand needs descriptive support because the product still solves a practical transport need.

Approved descriptor directions:

- Italian: `Mobilita e luoghi della Riviera ligure`
- English: `Italian Riviera travel companion`

These descriptors are not replacements for the brand. They clarify scope and support SEO.

### Source-Trust Language

Keep `Riviera Trasporti` visible in:

- body copy
- official-source references
- trust framing
- route-result explanations

But do not present `Riviera Trasporti` as the product name, site name, or app identity.

### Domain Constraint

This spec assumes `azzuriva.com` is the intended launch domain.

Important implementation rule:

- until `azzuriva.com` is actually secured and serving the product, canonical URLs, structured data URLs, and share URLs must continue to point to the current live GitHub Pages origin

The product can be rebranded before the domain migration, but it must not emit invalid canonical targets.

## User Experience

### Home Page Positioning

The home page should introduce `Azzuriva` as a broader Riviera companion while remaining honest about the current live functionality.

That means the copy should say, in substance:

- the product helps people move around the Riviera more easily
- current route answers come from the official Riviera Trasporti PDF
- the app is best at direct-route lookup today
- it also supports practical fallback and local-orientation needs

The copy should feel like a credible widening of scope, not a fake feature announcement.

### Brand Experience

The top bar and introductory shell should feel slightly more editorial and premium than the current operator-first framing, but still restrained.

The key shift is from:

- "official timetable helper"

to:

- "independent Riviera mobility companion that uses official timetable data where relevant"

### Ad Experience

Ad preparation should be invisible until monetization is activated.

Reserved ad zones must:

- not interrupt the route form
- not split the first result summary from its departures
- not sit inside the trip map or location-picker interactions
- feel structurally intentional, even when empty

## SEO Strategy

### Site Name Consistency

The site should consistently identify itself as `Azzuriva` across:

- home page title
- visible headings or lockup alt text
- `WebSite` structured data
- Open Graph site naming
- manifest name

This matters more than stuffing keywords into a domain or product name.

### Home Page Structured Data

The home page should continue to use honest structured data types such as:

- `WebSite`
- `WebApplication`

The `WebSite` entry should prefer the new site name and may include an alternate name if useful, but only if it reflects a real, user-facing variant and not a keyword trick.

### Stronger Crawlable Copy

The static body copy in `index.html` should expand from pure timetable framing into a compact introduction that covers:

- the `Azzuriva` brand
- the Riviera Ligurian coverage area
- practical mobility intent
- the official Riviera Trasporti PDF source
- key towns such as Imperia, Sanremo, Ventimiglia, and Andora

The copy must remain natural and concise. It should not read like a generated keyword block.

### Search-Relevant Supporting Sections

The live shell should support a small number of crawlable, concise sections that reinforce relevant intent:

- what the product helps with
- where it is useful
- how official-source trust works

These sections should help search engines understand the page while also helping first-time users orient quickly.

### Route-Level Metadata

Keep the current route-aware title and description updates after search, but retune them to the new brand.

These client-side updates remain useful for:

- browser tabs
- bookmarks
- user shares

They are secondary to the static default metadata because crawlers may not execute the full app.

## Monetization Strategy

### Launch Monetization Recommendation

The best launch monetization path is conservative Google AdSense Auto ads.

Rationale:

- fastest time to first revenue
- one sitewide code rather than a manual ad-ops stack
- mobile and desktop support
- preview, exclusions, and format controls available in the AdSense UI

### Activation Strategy

Prepare the product for ads now, but do not hardcode live publisher credentials in this scope.

The implementation should ship:

- ad-ready zones in the layout
- neutral ad container markup and styles
- optional integration hooks or feature flags

The implementation should not ship:

- fake ad placeholders that pretend to be live inventory
- a guessed publisher ID
- `ads.txt` without real AdSense account data

### Ad Zone Placement

Two ad-ready zones are approved:

1. a high shell slot after the supporting intro copy and before the core interactive flow becomes dense
2. a lower utility slot after results-support content, such as taxi or discovery-support surfaces

Rejected placements:

- inside the search form
- between the user action and the first meaningful result
- inside the trip-detail map panel
- as a pop-up-like custom interruption

### Progressive Monetization Path

The preferred monetization order is:

1. conservative AdSense Auto ads
2. tune formats after traffic and behavior data
3. add direct local sponsorship placements later if the audience quality justifies them

Direct sponsors may eventually outperform AdSense for this niche, but they are not the fastest launch path.

## Data And Architecture

### Brand Configuration

Centralize all product naming in the brand configuration layer so UI, metadata, and assets stay synchronized.

This should cover:

- primary brand name
- descriptor text
- lockup image source and alt text
- site URLs

### Metadata Management

Keep metadata generation centralized rather than scattering brand strings across multiple render paths.

This includes:

- default page title
- default description
- route-aware title
- route-aware description
- structured data name fields

### Ad Slot Architecture

Ad slots should be represented as explicit UI surfaces, not anonymous empty divs dropped into templates.

Each approved slot should have:

- a stable identifier
- a dedicated render path
- styling that preserves layout integrity when empty

This lets the same surfaces support:

- AdSense
- sponsor cards
- internal promos
- no output at all

without rewriting the shell later.

## Rendering Rules

### Top-Level Branding

The shell should show `Azzuriva` as the primary brand.

The subtitle or adjacent copy should do the descriptive and trust work:

- broader Riviera mobility/discovery descriptor
- official-source wording where appropriate

### Empty Ad State

If ads are not active, the reserved ad surfaces should either:

- render nothing

or

- render a neutral internal promo or sponsor-ready shell only if explicitly configured

They must not leave broken visual gaps.

### Sponsored Content Framing

When monetization later becomes active, sponsored surfaces must be visibly distinct from product answers.

Ad or sponsor content must never be styled to look like:

- a route result
- a timetable finding
- an official operator notice

## Error Handling

### Domain Migration Safety

If the brand rebrand lands before the domain migration:

- continue using the current production URL in canonicals and structured data
- avoid mixed-brand canonical references
- do not emit dead share-image URLs

### Asset Transition Safety

If new brand images are not ready at the same moment as text rebranding:

- temporarily preserve working current assets
- update alt text and metadata carefully
- avoid broken image references in social previews or PWA assets

### Ad Integration Safety

If ad configuration is absent or incomplete:

- fail closed
- show no ad integration
- keep layout stable

This is preferable to partially broken monetization code.

## Testing Strategy

### Automated Coverage

Update existing tests that assert:

- title text
- metadata content
- structured data brand names
- shell-rendered brand copy
- service worker cache naming where applicable

Add coverage for:

- `Azzuriva` brand string propagation
- descriptor rendering
- ad-slot empty-state rendering
- ad-slot placement rules in shell output

### Manual Verification

Before rollout, verify:

- the static HTML still contains meaningful crawlable copy before hydration
- route search still updates metadata correctly
- no brand string is left mixed in visible UI except intended Riviera Trasporti source references
- the page still feels calm and uncluttered with ad-ready slots present but inactive

## Rollout Notes

### Sequencing

Recommended order:

1. rebrand text, metadata, and docs
2. update structured data and crawlable shell copy
3. add ad-ready zones and styles
4. activate ads later in a separate follow-up once account and domain details exist

### Stop Condition

If `azzuriva.com` cannot be secured under acceptable terms, stop before public domain migration work and reopen the naming decision.

The text rebrand can still be discussed, but the launch plan in this spec assumes an exact-match `.com` brand/domain outcome.
