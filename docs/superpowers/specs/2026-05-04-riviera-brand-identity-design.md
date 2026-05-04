# Riviera Brand Identity Design

Date: 2026-05-04
Project: Riviera Trasporti Schedules
Status: Drafted from approved conversation decisions, pending user review of this written spec

## Summary

Create a descriptive bilingual brand identity for the Riviera Trasporti route lookup product, centered on a transit-first symbol system that works across iOS, Android, favicon, and marketing/header surfaces.

The approved primary name is `Riviera Trasporti Ricerca Percorsi`. English should remain present, but not inside the primary product name. Instead, `Route Lookup` should appear as a secondary descriptor where space and context justify it.

The visual direction should stay close to the approved identity option `A`: official, transit-first, easy to trust, warm rather than institutional, and clear rather than decorative.

## Goals

- Create an engaging but descriptive name system for the product.
- Define one master icon concept that works across mobile and web sizes.
- Produce an app-icon family for iOS and Android without text inside the icon.
- Produce a favicon family derived from the same core symbol.
- Produce a separate wordmark/logo lockup that spells out the full product name for headers and marketing.
- Keep the identity aligned with the existing product personality: practical, calm, trustworthy.

## Non-Goals

- Renaming the underlying company or implying an official Riviera Trasporti corporate rebrand.
- Building a full reusable design-system package.
- Rewriting the product UI outside what is needed to apply the new identity later.
- Forcing bilingual copy into very small icon formats.
- Creating mascot-led, tourism-led, or startup-generic branding.

## Relationship To Existing Product Direction

The identity must fit the current product definition rather than replace it.

- The product exists to make Riviera Trasporti route lookup faster and clearer than scanning the PDF manually.
- The UI personality is already defined as practical, calm, and trustworthy.
- The new identity should reinforce the route-lookup purpose and make the product feel more intentional on mobile and web surfaces.

This work is brand-surface design for the existing route-finder product, not a change in product scope.

## Approved Product Naming Decisions

The following naming decisions are locked in:

- The naming direction should be descriptive, not abstract or invented.
- The naming structure should be Italian-first.
- `Riviera Trasporti` must be written in full, not shortened to `RT`.
- The primary concept emphasis is `Riviera Trasporti route lookup`.
- The approved final product name is `Riviera Trasporti Ricerca Percorsi`.
- English should appear as a secondary descriptor, not as part of the main name.
- The approved English descriptor is `Route Lookup`.

## Identity Strategy

The identity should read as a useful transport tool first and a branded product second.

That means:

- the transport function must be legible immediately
- the route-search concept must be visible in the symbol
- the overall tone must feel reliable and calm
- the mark must still feel like an app product rather than a dated public-service badge

The design should avoid over-branding. The right outcome is memorable because it is clear and well-composed, not because it is novel for its own sake.

## Approved Visual Direction

The approved direction is the earlier option `A`.

Core traits:

- transit-first
- official and trustworthy
- warm rather than cold
- simplified and scalable
- closer to a public transport utility than a generic travel app

This direction was preferred because it balances clarity and warmth while preserving immediate transport recognition.

## Master Symbol

The master symbol should be a rounded-square transit badge built from two elements:

1. a simplified front-facing bus
2. a route arc above or around it

The bus establishes the transport category immediately. The route arc adds the product-specific meaning: this is not just transport information, it is route lookup and pathfinding.

The master symbol must work without text and must survive simplification at favicon scale.

### Symbol Rules

- The bus shape should be simple enough to read at small sizes.
- Window, wheel, and body details should be minimal and structural, not illustrative.
- The route arc should signal motion or routing without becoming a map diagram.
- The composition should remain centered and balanced inside a rounded-square container.
- The symbol should not depend on thin strokes or tiny labels.

## Color Direction

The identity should use a warm transit palette compatible with the current product direction.

Preferred palette behavior:

- coral to apricot gradient or paired accent for the icon field
- off-white or light cream for the bus body
- deep ink or charcoal for structural details where needed
- restrained secondary darks, never harsh black

This should feel warmer and more human than a standard civic blue palette, while still reading as useful and trustworthy.

### Color Rules

- warm tones should lead the icon background
- light tones should preserve strong bus-shape legibility
- contrast must remain strong enough for small-size recognition
- color use should stay disciplined rather than decorative

## Typography And Wordmark

The wordmark/logo lockup should be clean, modern, and service-oriented.

Hierarchy:

- `Riviera Trasporti` is the anchor line
- `Ricerca Percorsi` is the functional descriptor line
- `Route Lookup` is optional secondary English support for contexts that benefit from it

This keeps the long descriptive name legible by giving it internal hierarchy instead of treating it as one flat string.

### Wordmark Rules

- typography should feel modern and practical, not ornamental
- the company name and product descriptor should be visibly distinct in weight or size
- the lockup should work horizontally for headers and marketing surfaces
- the symbol should sit to the left of the wordmark in the primary lockup
- the English descriptor must remain secondary to the Italian-first naming structure

## Asset System

The identity deliverable set includes four related assets, all derived from the same master symbol:

1. `iOS app icon`
2. `Android app icon`
3. `favicon family`
4. `horizontal wordmark/logo lockup`

Each asset should share the same symbol language, but each format may simplify or rebalance spacing for size and platform constraints.

## Platform-Specific Requirements

### iOS App Icon

- Use the master symbol only, with no text.
- Compose for high legibility inside a rounded-square icon field.
- Preserve a clean silhouette when viewed at small launcher sizes.
- Avoid relying on platform masking to rescue edge spacing.

### Android App Icon

- Use the same symbol system as iOS, with Android-safe spacing.
- Ensure the icon remains legible across adaptive icon treatments.
- Keep internal geometry stable even if the outer shape is masked by the launcher.

### Favicon Family

- Use a simplified version of the master symbol.
- Remove or reduce details that disappear at tiny sizes.
- Prioritize immediate recognition over fidelity to the larger app icon.

### Wordmark / Logo Lockup

- Spell out `Riviera Trasporti Ricerca Percorsi`.
- Support marketing and header usage.
- Optionally include `Route Lookup` as a secondary English descriptor where layout allows.
- Keep the lockup usable on light surfaces and within the product's existing interface direction.

## Behavior Across Sizes

The identity system should intentionally simplify as size decreases.

- Large sizes can show the full symbol and structured wordmark.
- App-icon sizes should keep only the symbol.
- Favicon sizes should use the most reduced symbol variant.

This is a required behavior, not a fallback. A single over-detailed drawing scaled down mechanically is out of scope.

## Delivery Approach

The assets should be generated with GPT Image and then refined as needed into a coherent family.

Working method:

1. generate the master symbol direction
2. generate or adapt the symbol for iOS and Android icon usage
3. reduce the symbol for favicon use
4. generate the horizontal wordmark/logo lockup
5. refine the set until the family reads as one system

If the first generation produces inconsistency, refinement should favor family coherence and small-size clarity over novelty.

## Acceptance Criteria

This design is successful if:

- the primary product name is `Riviera Trasporti Ricerca Percorsi`
- the English phrase `Route Lookup` remains secondary
- the master symbol clearly combines transport and route-lookup cues
- the icon family feels consistent across iOS, Android, and favicon uses
- the wordmark/logo lockup spells out the full name clearly and hierarchically
- the style feels warm, official, and transit-first rather than generic or decorative
- small formats remain legible without text

## Risks

- the long descriptive name can become visually heavy if hierarchy is too weak
- the icon can become generic if the route-lookup cue is too subtle
- the icon can become noisy at small sizes if bus details are too literal
- warmth can slip into tourism branding if the palette becomes too scenic or decorative
- trust can slip into dated public-service styling if the form becomes too rigid or bureaucratic

## Rollout Boundary

This design phase is complete when:

- the written identity direction is approved
- the asset set and naming rules are locked
- implementation can move forward into generation and export planning

This spec does not cover downstream code integration, manifest wiring, or favicon HTML updates. Those belong to implementation planning after this design is approved.
