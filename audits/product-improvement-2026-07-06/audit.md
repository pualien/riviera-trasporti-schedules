# Riviera Dei Fiori Route Finder Product Audit

Date: 2026-07-06

## Audit Scope

This audit reviewed the primary rider journey in the local product:

- Open the route finder.
- Choose an origin and direct destination.
- Submit a weekday route search.
- Read direct-route results.
- Open a selected departure detail and map.
- Check mobile behavior.
- Check secondary provider, browse, and no-direct fallback states.

The audit used screenshots captured during this run. It did not modify product code.

## User Goal And Accessibility Target

User goal: help an everyday rider quickly determine whether a direct Riviera Trasporti bus works for a specific trip, then verify the answer against official data with low ambiguity.

Accessibility target: keep WCAG AA as the floor, with strong keyboard, mobile, reading order, target size, visible focus, and clear state-change behavior. The automated baseline accessibility smoke test passed, but screenshots and the existing smoke test do not prove full WCAG conformance.

## Step Evidence

1. Home search, desktop default viewport: healthy visual identity, but the actual form starts below the first viewport. Evidence: `01-home-search-viewport.png`, `01-home-search.png`.
2. Origin and destination picker: strong locality-to-stop model, but origin and destination suggestion panels can stack into a long pre-submit flow. Evidence: `02-origin-destination-picker-viewport.png`, `02-origin-destination-picker.png`, `03-picker-scrolled.png`, `04-picker-destination-submit.png`.
3. Ready to submit: clear submit action once reached, but the rider may need multiple scrolls to get there. Evidence: `05-ready-to-submit.png`.
4. Results summary: strong route answer with next departure, fastest arrival, last departure, average duration, save/share, and line. Evidence: `06-results-summary.png`.
5. Departure list: readable next-departure cards with PDF verification close to each trip. Evidence: `07-departure-list.png`.
6. Selected departure detail and map: high trust value, but the map is reached after more scrolling and only some stops are mapped. Evidence: `08-departure-detail-map.png`, `09-map-panel.png`.
7. Mobile home: no horizontal overflow and touch-sized controls, but tabs and setup copy push fields below the fold. Evidence: `10-mobile-home.png`.
8. Mobile result URL: shared/restored result still starts above the answer, so the route summary is not immediate. Evidence: `11-mobile-result-top.png`, `12-mobile-result-summary.png`.
9. Provider tab: useful mobility handoff, but it competes with the bus task and starts as a blank provider form. Evidence: `13-provider-train-mobile.png`.
10. Browse: useful for line-aware riders, but dense for uncertain riders and does not expose the next action strongly from the list. Evidence: `14-mobile-browse.png`.
11. No-direct fallback: strong limitation messaging, conservative transfer attempt, and route-relevant taxi option, but again buried below the retained search setup on mobile. Evidence: `15-mobile-no-direct-top.png`, `16-mobile-no-direct-answer.png`.

## Strengths

- The product purpose is sharp: direct bus lookup from the official PDF, not a general journey planner.
- The broad-area-to-exact-stop picker is the right model for riders who know places better than stop names.
- Results communicate useful confidence markers: direct route, line, next departures, duration, official PDF links, and save/share actions.
- The no-direct state is honest and useful. It says when the tool cannot find a direct ride, tries conservative transfer options, and shows a relevant taxi fallback.
- Mobile reflow avoids horizontal overflow in the checked 390px viewport.
- Existing tests cover a meaningful baseline: named controls, duplicate IDs, keyboard picker behavior, mobile form presence, provider handoffs, share flows, and route SEO context.

## UX Risks

1. The main answer is too far down the page.

   On desktop, the first screen spends a lot of space on brand, tabs, explanation, and progress setup before the complete form is visible. On mobile, the tabs and intro push the fields below the first viewport. On a restored result URL, the rider still starts at the top instead of the result.

   Recommendation: when a route is already selected, collapse the hero/form into a compact "Edit search" bar and jump or anchor to the result summary. On first load, make the first viewport prioritize `From`, `To`, `Day`, and `Show departures`.

2. The picker can become a long, mixed-origin/destination surface.

   After choosing `Sanremo`, exact-origin suggestions remain visible while the destination choice appears lower down. This keeps useful precision available, but it also hides the submit action and makes it harder to tell which choice is still pending.

   Recommendation: after choosing a broad origin zone, collapse exact-origin refinement into a small "Refine stop in Sanremo" disclosure. Keep the destination list visually separate and automatically scroll the next required field into view.

3. Results preserve too much pre-result UI.

   The route answer is strong once reached, but the filled form and picker remnants sit above it. This is especially expensive on mobile and shared URLs.

   Recommendation: treat successful search as a result mode. Show a compact route-edit summary above results, not the full picker, unless the rider taps edit.

4. Route labels need presentation cleanup.

   `Sanremo -> ventimiglia ponte andrea doria` is accurate but visually rough: lowercase destination, large wrap on mobile, and a technical stop-name feel.

   Recommendation: normalize display casing, separate locality and stop, and use a tighter mobile route title pattern such as `Sanremo` to `Ventimiglia, Ponte Andrea Doria`.

5. The map is valuable but can overstate precision.

   The selected-trip map shows a clean line and markers, but the page also says some stops are listed without coordinates. The visual line can be read as the actual route geometry even when it is closer to endpoint/known-stop geometry.

   Recommendation: label the map as "mapped stops, not exact road path" until coordinate coverage and route geometry improve. Add coordinate coverage status near the map title.

6. Secondary mobility tabs compete with the core bus job.

   Train, FlixBus, and BlaBlaCar tabs are prominent next to bus search. They are useful, but the bus product is still the primary promise, and these tabs are mostly outbound handoffs.

   Recommendation: keep bus search primary. Move provider tabs into an "Alternatives" section after bus/no-direct results, or prefill them from the active route so they feel contextual instead of parallel.

7. Browse is powerful but dense.

   Browse exposes 67 line entries and a stop mode, but the mobile list starts as a dense timetable index. Riders who do not know the line number may not understand how it gets them to a route answer.

   Recommendation: add a stronger "Use this line" or "Find trips on this line" action after selecting a line, and support filter chips for common towns or current route context.

8. Taxi content is useful but too visible by default.

   The taxi directory appears on the homepage and after many states. It is useful fallback content, but it adds length before the rider has failed to find a bus.

   Recommendation: show the global taxi directory below a collapsed fallback section, while keeping route-relevant taxi options prominent only in no-direct or late-night scenarios.

## Accessibility Risks

- The baseline accessibility smoke test passed after rerunning with local server permissions: `npm run test:a11y`.
- The audit did not run a full screen-reader pass. Because the DOM contains desktop and mobile header variants, verify that hidden duplicate controls are not exposed to assistive technology.
- Repeated controls such as `Dettagli`, `Condividi corsa`, and `Apri PDF` need context-rich accessible names throughout all compact and expanded states. Source shows richer labels for detail buttons, but the full result and archive states still need assistive-tech verification.
- The map should have a text alternative. The stop list is a useful fallback, but verify the interactive Leaflet surface does not trap keyboard focus and that the route description is announced before or near the map.
- Long mobile flows increase cognitive and motor load. Collapsing completed search steps would improve both usability and accessibility.

## Evidence Limits

- Screenshots and targeted DOM reads were captured from the local app, not from production.
- The browser DOM snapshot API failed on this page, so inspection used targeted page evaluation, screenshots, and local source/tests.
- Geolocation permission, service worker offline behavior, AdSense/consent, real outbound provider submission, and screen-reader announcements were not fully tested.
- The audit used a normal desktop viewport and a 390x844 mobile viewport; tablet and zoomed desktop layouts still need checking.

## Prioritized Recommendations

1. Make result mode compact: on valid search URLs, collapse the full form and take the user directly to the route summary.
2. Shorten the first mobile route-search path: bring `From`, `To`, `Day`, and submit into the first screen or very near it.
3. Collapse origin refinement after a broad origin is chosen, and make the next required action visually obvious.
4. Improve route-title formatting and casing, especially on mobile result summaries.
5. Reframe the map as mapped-stop guidance until route geometry and coordinate coverage are fuller.
6. Move provider tabs and global taxi directory into contextual alternatives, while keeping no-direct fallback strong.
7. Add a clearer action model to Browse so line/station exploration turns into route search.
8. Run a manual assistive-tech pass for hidden mobile/desktop controls, repeated action names, picker state changes, and the Leaflet map.
