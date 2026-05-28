# GitHub Pages Ad Revenue Strategy Design

Date: 2026-05-28
Project: Riviera Trasporti Schedules / Azzuriva
Status: Approved in conversation, pending user review of this written spec

## Summary

Optimize Azzuriva for the best practical ad revenue setup while it remains hosted at the current GitHub Pages project URL:

`https://pualien.github.io/riviera-trasporti-schedules/`

The strategy is AdSense-first because the app already has a valid publisher ID, a loaded AdSense script, a checked-in `ads.txt`, and analytics instrumentation. The implementation should make that setup more review-safe, measurable, and controllable without degrading the route-search experience.

This scope targets the current GitHub Pages project URL only. It does not require a custom domain.

## Current State

The repo already includes:

- `src/lib/ads.js` with publisher ID `ca-pub-4752698416622962`
- `src/lib/installAdSense.js` loaded from `index.html`
- `ads.txt` containing `google.com, pub-4752698416622962, DIRECT, f08c47fec0942fa0`
- inactive shell ad-slot hooks in `src/ui/renderAdSlot.js` and `src/ui/renderShell.js`
- route-search, save, and share analytics events through `src/lib/analytics.js`
- a GTM container import with GA4 and Mixpanel destinations

Live checks on 2026-05-28 showed:

- `https://pualien.github.io/riviera-trasporti-schedules/ads.txt` returns `200`
- `https://pualien.github.io/ads.txt` returns `404`

That root-domain result is the main limitation of monetizing a GitHub Pages project site. Google documentation expects `ads.txt` to be available from the root domain, so the project-path file is useful but may not fully satisfy every crawler or AdSense status check for `pualien.github.io`.

## Goals

- Maximize the chance that AdSense can approve and serve on the current GitHub Pages project URL.
- Keep the app compliant with Google ad placement and consent requirements.
- Preserve Azzuriva's calm utility-first experience.
- Avoid ads inside the core route decision flow.
- Add enough measurement to tune revenue after traffic exists.
- Keep future direct-sponsor inventory possible without another shell rewrite.

## Non-Goals

- Migrating to a custom domain.
- Building server-side ad routing, prebid, header bidding, or an ad server.
- Implementing non-Google ad networks in this scope.
- Creating fake ad placeholders that look like live inventory.
- Making route results, taxi contacts, or official-source links look sponsored.
- Circumventing AdSense review, policy, consent, or `ads.txt` requirements.

## Recommended Strategy

Use AdSense Auto ads as the primary monetization engine, then add controlled manual ad-unit support for the two existing shell slots.

Auto ads remain the fastest path to live revenue because they use one publisher-level script and can be tuned in the AdSense UI. Manual slots add control where the app already has safe inventory zones:

1. `shell-lead`: after the core interactive/search content, before crawl-support copy
2. `shell-utility`: after crawl-support copy, before the taxi directory

This hybrid setup lets AdSense fill baseline inventory while preventing the most harmful placements from being the only available path.

## Rejected Strategies

### Auto Ads Only

Fastest to wire, but too little product control. Auto ads can still be enabled, but the app should also expose known safe placements and policy-aware rendering.

### Direct Sponsors First

Potentially higher revenue for a local Riviera utility, but slower to sell, measure, invoice, and rotate. Direct sponsors should come after traffic evidence shows recurring local intent.

### More Aggressive Ad Density

Interstitial-like interruptions, ad units inside the search form, ads between submit and first meaningful result, and ads inside the selected-trip map are rejected. They create accidental-click risk and weaken user trust.

## AdSense Site Approval And Ownership

The app should strengthen every ownership signal that can be controlled from this repository:

- keep the AdSense script in `index.html`
- add the AdSense meta account tag:
  `<meta name="google-adsense-account" content="ca-pub-4752698416622962">`
- keep `ads.txt` in the repo root so it publishes at the project path
- document the root-domain `ads.txt` limitation for the current GitHub Pages project URL

The README should explain the exact verification reality:

- project URL `ads.txt`: available
- root `pualien.github.io/ads.txt`: unavailable unless the root Pages site is configured outside this repo

This avoids a false sense that the local `ads.txt` file alone can fix all AdSense root-domain warnings.

## Consent And Privacy

Most target traffic is likely European. The launch checklist must treat EEA, UK, and Switzerland consent as revenue-critical, not optional polish.

AdSense Privacy & messaging should be configured before judging revenue performance. If personalized ads are served to EEA, UK, or Swiss users, Google requires a certified CMP integrated with the IAB TCF. If the owner wants the simplest launch posture, AdSense can be configured to serve non-personalized ads for these regions through the AdSense UI.

The code should not implement a homegrown cookie banner. Consent should be handled by AdSense Privacy & messaging or another Google-certified CMP.

## Ad Placement Rules

Approved placements:

- post-search-shell lead unit after the active app content
- lower utility unit around SEO/support/taxi content
- Auto ads formats that do not disrupt the search and result workflow

Blocked placements:

- inside `renderSearchForm`
- inside from/to picker panels
- between search submit and the first direct-route answer
- inside `renderResultsView` departure lists
- inside `renderRouteMapPanel`
- inside save/share modal flows
- pop-up-like custom units
- labels such as "recommended route" or "official notice" for ad content

Ad and sponsor content must be visibly separate from transport answers.

## Architecture

Add a small monetization layer that centralizes all ad configuration.

### `src/lib/monetization.js`

Responsibilities:

- expose the AdSense publisher ID
- expose the AdSense account meta tag payload
- validate optional manual ad slot IDs
- build normalized manual slot config
- describe whether manual slots are active

Manual slot IDs should default to empty strings. Empty slots render nothing so the app has no visual gaps or fake ad surfaces before real AdSense ad-unit IDs exist.

### `src/ui/renderAdSlot.js`

Extend the existing renderer so it can render:

- arbitrary configured sponsor/internal content, as it does today
- AdSense responsive display ad markup when a valid manual slot ID exists
- nothing when no content or valid slot ID exists

The AdSense markup should use stable slot IDs and `data-ad-client="ca-pub-4752698416622962"`. It should not call `adsbygoogle.push()` during serverless string rendering. Browser-side activation can be added only when manual slots are configured.

### `src/lib/ads.js`

Keep Auto ads script loading. Add a small activation helper for manual slots that:

- scans only rendered manual slot elements
- calls `window.adsbygoogle.push({})` once per element
- marks activated elements to avoid duplicate pushes after SPA re-renders
- fails quietly if AdSense is unavailable

### `src/lib/analytics.js`

Add ad lifecycle events for diagnostics, not user profiling:

- `ad_slot_rendered`
- `ad_slot_empty`
- `ad_slot_error`

Payload:

- `slot_id`
- `ad_strategy`
- `has_manual_slot`

These events help compare Auto-ads-only periods against periods where manual slots are enabled.

### `index.html`

Add the AdSense account meta tag near the existing metadata and keep the current AdSense module script.

## Data Flow

1. The page loads and `installAdSense.js` injects the Auto ads script once.
2. App state renders the shell with monetization config.
3. If no manual ad-unit IDs are configured, shell slots render nothing and analytics can record empty slot state.
4. If manual ad-unit IDs are configured later, shell slots render responsive AdSense units.
5. After render, the browser activation helper initializes any newly rendered manual units once.
6. GTM/GA4/Mixpanel receive ad-slot diagnostics if configured to listen for those events.

## Testing

Unit and UI tests should cover:

- AdSense publisher ID validation still accepts `ca-pub-4752698416622962`
- meta verification tag exists in `index.html`
- monetization config returns inactive manual slots when slot IDs are blank
- invalid manual slot IDs are ignored
- manual AdSense slot markup renders only for valid slot IDs
- empty slots do not create visual gaps
- manual slot activation calls `adsbygoogle.push({})` once per rendered slot
- ad lifecycle analytics events use stable payload names

Full verification should include:

- `rtk npm test`
- `rtk npm run test:smoke`
- a local browser check that the search flow still has no ad surface inside the form, result list, or map panel

## Launch Checklist

After code lands, the owner should complete these AdSense-console steps:

1. Add `https://pualien.github.io/riviera-trasporti-schedules/` in AdSense Sites if AdSense accepts the project URL.
2. Request review only after the deployed page contains the script, meta tag, and project-path `ads.txt`.
3. Check AdSense Sites status until it is `Ready`.
4. Check AdSense `ads.txt` status and note whether the root `pualien.github.io/ads.txt` limitation remains a warning.
5. Enable Auto ads preview and exclude any format that interrupts route search or result reading.
6. Configure Privacy & messaging for EEA, UK, and Switzerland traffic before evaluating RPM.
7. After approval and traffic, create two responsive display ad units and add their slot IDs to the repo config in a later commit.

## Source References

- Google AdSense site management: ownership can be verified through ad code, `ads.txt`, or a meta tag, and ads only serve after the site is reviewed and marked ready.
- Google AdSense connect-site documentation: site review usually takes a few days, but can take 2-4 weeks; the AdSense account meta tag format is supported.
- Google AdSense `ads.txt` guide: `ads.txt` should be uploaded to the site root directory.
- Google AdSense crawl guidance: the root domain should return or redirect to the `ads.txt` file, and a `404` means the file does not exist for that root.
- Google consent guidance: serving personalized ads in the EEA, UK, or Switzerland requires a Google-certified CMP integrated with the IAB TCF.
