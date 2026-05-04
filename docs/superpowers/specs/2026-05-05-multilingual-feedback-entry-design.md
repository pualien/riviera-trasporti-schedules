## Riviera Multilingual UI And Feedback Entry Design

Date: 2026-05-05
Project: Riviera Trasporti Schedules
Status: Drafted from approved conversation decisions, pending user review of this written spec

## Summary

Add a persistent language selector for the Riviera route lookup interface and add a visible feedback entry point that opens an external review form.

The first release should support five interface languages: Italian, English, French, German, and Spanish. All product-owned interface copy should translate with the selected language, while route data such as stop names, locality labels, line identifiers, and timetable values should remain unchanged.

The feedback action should open a temporary placeholder Google Form in a new tab so early users can review the tool and share advice without requiring any backend work.

## Relationship To Existing Product Direction

This change extends the current bilingual product surface into a true multilingual interface without changing the route-search model, direct-trip logic, or the underlying timetable data.

- The May 4 route-picker restyle spec established a compact, field-first search surface.
- The May 4 brand identity spec established the Italian-first product framing.

This design keeps both decisions intact. The language selector adds optional localization, but Italian remains the default and the route data itself stays source-accurate.

## Goals

- Add a visible, low-friction language selector to the app shell.
- Support five languages: Italian, English, French, German, and Spanish.
- Translate all product-owned interface copy in the first release.
- Persist the chosen language for returning users.
- Add a visible review-and-advice entry point that opens an external form.
- Keep the app fully static with no new backend dependency.

## Non-Goals

- Translating stop names, locality names, line identifiers, or timetable data.
- Adding server-side localization, geo-detection, or browser-language auto-switching.
- Building an in-app feedback submission flow.
- Creating separate localized route datasets.
- Rewriting the product information architecture beyond what is needed for language switching and feedback entry.

## Product Decisions Locked In

- Supported languages are `Italiano`, `English`, `Français`, `Deutsch`, and `Español`.
- The default language is Italian.
- The selected language persists across sessions.
- “Full interface copy” means all UI text authored by the app should translate.
- Route data remains unchanged even when UI language changes.
- The review entry point opens an external Google Form in a new tab.
- The first implementation uses a temporary placeholder Google Form URL.

## User Experience

### Language Selector

The selector should live in the top bar because it is a global product preference rather than a search-form field.

Behavior:

1. The top bar shows a compact selector listing the five supported languages.
2. Italian is selected on first load unless the user has a saved preference.
3. Changing the language re-renders the current screen immediately.
4. The selected language should persist in `localStorage`.
5. The selector remains available on desktop and mobile without dominating the header.

Presentation requirements:

- The control should feel like a calm utility action, not a primary CTA.
- The selected option must be visually obvious.
- The control should remain usable inside the existing branded header layout.

### Translation Boundary

The first release should translate all app-owned UI copy, including:

- top bar links and labels
- hero eyebrow, headline, and supporting text
- form labels, placeholders, helper text, and button labels
- route-progress step labels and details
- picker-panel messages, tags, and action text
- empty-state headings and guidance
- results headings, summary labels, and PDF link labels
- any other instructional or status copy rendered by the frontend

The following should not translate:

- stop and locality labels from the route dataset
- timetable values, times, and line identifiers
- source PDF page anchors

This keeps the interface multilingual while avoiding incorrect or artificial translation of official transport data.

### Feedback Entry Point

The feedback action should sit in the top bar as a secondary action near the official-site link and language selector.

Behavior:

1. The control should be visible from the homepage without needing to scroll.
2. The label should translate with the selected language.
3. Clicking it opens the placeholder Google Form in a new tab.
4. The wording should invite both review and suggestions, not just bug reporting.

Recommended copy intent:

- review this tool
- give advice
- share feedback

The final localized phrasing can vary per language as long as it stays short and action-oriented.

## Technical Design

### State And Persistence

Add a single `language` field to the app state and persist it with `localStorage`.

Behavior model:

1. On startup, read the saved language if present and valid.
2. Otherwise fall back to Italian.
3. On selector change, update app state, write the new value to `localStorage`, and re-render.
4. Keep route-search state independent from language state so switching language does not clear the current search.

This prevents unnecessary coupling between localization and route selection.

### Translation Architecture

Use a central client-side translation catalog with stable keys and a small translation helper such as `t(key, params?)`.

Recommended structure:

- one i18n module that defines supported language codes, labels, and translation dictionaries
- a safe translation function used by all renderers
- renderer inputs expanded to accept translated strings or a `t` helper

This approach fits the current string-rendering architecture better than DOM patching because the app already re-renders HTML from state.

### Renderer Integration

The following UI modules should consume translated copy:

- shell renderer
- search-form renderer
- location-picker renderer if it contains authored guidance text
- empty-state renderer
- results renderer
- any other helper surface that currently hardcodes visible copy

The translation work should be centralized enough that future copy changes are made in one place instead of being scattered across components.

### External Feedback URL

Store the temporary Google Form URL as an explicit constant rather than burying it inside markup.

Requirements:

- open with `target="_blank"` and `rel="noreferrer"`
- easy to replace later with a real form URL
- no analytics or backend dependency required for the first release

## Content Strategy

The existing mixed bilingual copy should be replaced with per-language strings rather than showing multiple languages at once.

Content rules:

- one selected language at a time for authored UI copy
- Italian-first defaults
- concise, operational phrasing
- avoid over-explaining route mechanics in translated helper copy

This should make the interface feel intentional in each language instead of partially localized.

## Error Handling

The localization layer should fail safely.

Requirements:

- invalid saved language values fall back to Italian
- missing translation keys should fail predictably during development and degrade safely in production
- switching language must not break the current route-search state
- the feedback link must still render even if translation fallback is needed

## Testing

Add or update tests for:

- Italian default language when no preference is stored
- restored saved language when a valid preference exists
- language selector rendering in the shell
- at least one non-default language proving translated UI copy appears
- translated feedback action label
- external feedback URL wiring
- unchanged route data labels while UI copy changes
- language changes not clearing current search state

Renderer tests should focus on visible output, while app-level tests should cover persistence and state behavior.

## Rollout Boundary

This design is complete when:

- the app shell includes a persistent five-language selector
- the visible interface copy translates across the supported languages
- route data remains unchanged
- a visible translated feedback action opens the placeholder Google Form in a new tab
- the app remains static and does not require backend infrastructure

## Risks

- translation keys can drift if visible copy remains hardcoded in multiple renderers
- header density can increase too much if the language selector and feedback link compete with the brand lockup
- partial localization will feel broken if any major surfaces are missed
- future copy edits become error-prone if the translation catalog is not kept centralized

## Acceptance Criteria

This change is successful if:

- a first-time visitor sees the app in Italian with a language selector in the header
- the visitor can switch to English, French, German, or Spanish and immediately see translated interface copy
- switching languages does not alter selected stops or results
- route data labels remain untouched
- the header exposes a translated review/advice action
- the review/advice action opens the placeholder Google Form in a new tab
