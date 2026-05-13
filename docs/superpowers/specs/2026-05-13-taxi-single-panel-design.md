# Taxi Single Panel Design

Date: 2026-05-13
Project: Riviera Trasporti Schedules
Status: Approved in conversation, pending user review of this written spec

## Relationship To Prior Specs

This document is a UI-only follow-up to the taxi coverage expansion work from May 13, 2026.

It does not change taxi data, verified sources, search behavior, SEO scope, or route matching. It changes only how taxi contacts are presented in the interface.

## Summary

Replace the current multi-card taxi presentation with a single shared panel.

This applies to:

1. route results when one or more taxi services are relevant to the searched endpoints
2. no-direct fallback results
3. the bottom SEO taxi directory

The content remains the same, but instead of one card per service the UI should render one outer panel containing a compact vertical list of service entries.

## Goals

- Show all relevant taxi contacts inside one visual container.
- Reduce UI fragmentation when multiple taxi services are present.
- Keep all covered destination names visible in the footer for SEO.
- Preserve mobile readability.

## Non-Goals

- Changing taxi matching logic.
- Changing the verified taxi registry.
- Changing copy strategy or metadata.
- Introducing tables or interactive accordions.

## Current Problem

The current renderer creates one full card per taxi service.

That is acceptable for one service, but once multiple services are present it creates visual repetition:

- repeated eyebrow labels
- repeated card chrome
- too much spacing
- weaker perception of the taxi section as one grouped fallback area

## Product Decision Locked In

- Taxi services must appear inside one single outer panel in all contexts.
- Inside that panel, each service becomes a compact list entry rather than a standalone card.
- The panel title stays shared at section level.
- The footer keeps all services in one single box as requested.

## Rendering Model

### Outer Panel

The existing taxi section remains responsible for:

- section title
- optional body text
- one visual container for all taxi content

This outer container should use one border, one background, and one internal stack.

### Inner Entries

Each taxi service should render as a compact row or block inside that panel with:

- service label
- covered destinations
- call links
- booking link when available
- source and verification metadata

Inner entries should be separated by light dividers or spacing, not by full card framing.

## Affected Views

### Route Results

If one or more taxi services are available for the searched endpoints, the results page should show:

- one taxi panel
- one list of relevant service entries inside it

### No-Direct Fallback

The no-direct state should reuse the same single-panel renderer so the fallback layout remains visually consistent with the main results flow.

### Footer SEO Directory

The footer should keep:

- one panel titled with the existing taxi directory heading
- all verified taxi services listed inside it
- all covered destination labels visible in HTML

## Technical Shape

The cleanest implementation is:

- keep `renderTaxiOptionsSection` as the section-level wrapper
- change the inner rendering from a grid of cards to a single panel list
- reduce `renderTaxiOption` from full card markup to service-entry markup, or replace it with a better-named entry renderer
- adjust CSS from multi-card grid styling to single-panel stacked-entry styling

No data or app-state changes are required.

## Testing

Update tests to assert:

- the route taxi section renders one shared panel even with multiple services
- the no-direct fallback uses the same single-panel structure
- the footer renders one shared taxi directory panel
- destination names and links remain present in the output

## Risks

- If the inner entries are too compressed, multiple phone numbers may become harder to scan.
- If separators are too weak, multiple services may blur together.

The implementation should therefore prefer moderate spacing and simple dividers rather than ultra-dense packing.
