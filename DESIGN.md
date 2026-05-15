---
name: Azzuriva
description: Route-first timetable lookup for direct Riviera buses.
colors:
  primary: "#eb4c60"
  primary-deep: "#d93b4f"
  signal: "#ff8a3d"
  cream-top: "#f7f1ea"
  cream-bottom: "#efe4d6"
  panel: "#fffbf7"
  panel-strong: "#ffffff"
  text: "#1d1a17"
  muted: "#6b6258"
  quiet-line: "#3e2718"
typography:
  display:
    fontFamily: "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", sans-serif"
    fontSize: "clamp(2.1rem, 5vw, 3.8rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.06em"
  headline:
    fontFamily: "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", sans-serif"
    fontSize: "clamp(1.8rem, 3vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.05em"
  title:
    fontFamily: "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", sans-serif"
    fontSize: "1.3rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  body:
    fontFamily: "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", sans-serif"
    fontSize: "0.88rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  sm: "20px"
  md: "22px"
  lg: "24px"
  xl: "28px"
  shell: "30px"
  pill: "999px"
spacing:
  xs: "7px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "22px"
  xxl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.panel-strong}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "56px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.panel-strong}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "56px"
    typography: "{typography.label}"
  input-search:
    backgroundColor: "{colors.panel-strong}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "56px"
    typography: "{typography.body}"
  select-field:
    backgroundColor: "{colors.panel-strong}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "56px"
    typography: "{typography.body}"
  card-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.shell}"
    padding: "24px"
    typography: "{typography.body}"
  option-picker:
    backgroundColor: "{colors.panel-strong}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "14px 18px"
    typography: "{typography.body}"
---

# Design System: Azzuriva

## 1. Overview

**Creative North Star: "Trusted Riviera Companion"**

This interface behaves like a patient guide standing between the rider and a dense official PDF. It does not dramatize transit search. It lowers effort, reduces ambiguity, and keeps the user moving from broad place recognition to exact stop confirmation with minimal friction.

The visual system is soft, warm, and product-first. Cream-tinted surfaces, rounded controls, and restrained coral emphasis make the tool feel calm and trustworthy rather than institutional or flashy. The atmosphere is intentionally lighter than a typical transport utility, but it never slips into decorative whimsy. It should also leave deliberate room for future sponsor surfaces without making the shell feel ad-led.

This system explicitly rejects the dated public-service portal look described in `PRODUCT.md`: cluttered layouts, weak hierarchy, low-contrast controls, cramped fields, legacy gradients, heavy chrome, and anything that feels bureaucratic or visually stale.

**Key Characteristics:**
- Warm neutral surfaces with one clear action color.
- Large, legible form controls that privilege certainty over density.
- Soft layering instead of hard containers or loud panels.
- Calm bilingual copy with strong hierarchy and low cognitive load.
- Accessibility-forward contrast, focus, and interaction states.

## 2. Colors

The palette is restrained: cream and paper neutrals hold the surface, while coral carries action, selection, and route emphasis.

### Primary
- **Riviera Coral** (`#eb4c60`): The primary action tone. Use it for submit actions, active emphasis, and focus-adjacent highlights that need immediate recognition.
- **Timetable Red** (`#d93b4f`): The deeper companion to Riviera Coral. Use it for stronger text-on-light emphasis, action labels, and the lower edge of button gradients.

### Secondary
- **Signal Apricot** (`#ff8a3d`): A supporting warmth note used sparingly in atmospheric highlights and secondary signal moments. It is not a second primary action color.

### Neutral
- **Morning Cream** (`#f7f1ea`): The upper page wash. It gives the interface a warm daylight start instead of sterile white.
- **Sand Fade** (`#efe4d6`): The lower page wash. Use it to complete the page gradient and prevent the canvas from feeling flat.
- **Ticket Paper** (`#fffbf7`): The translucent panel base. It supports glass-like softness without turning into decorative glassmorphism.
- **Clear Panel** (`#ffffff`): The strongest content surface for forms and selection rows.
- **Timetable Ink** (`#1d1a17`): The primary text color. All critical labels and route data should resolve to this family.
- **Quiet Taupe** (`#6b6258`): Secondary copy, helper text, and supportive metadata.
- **Warm Rule** (`#3e2718`): The border anchor behind low-contrast dividing lines and subtle structure.

**The One Warm Pulse Rule.** Coral appears where the user should act or where the system must confirm importance. It is forbidden as idle decoration.

**The No Dead Gray Rule.** Neutrals stay warm. Pure grayscale surfaces are prohibited because they break the calm, trustworthy atmosphere.

## 3. Typography

**Display Font:** Avenir Next, Segoe UI, Helvetica Neue, sans-serif  
**Body Font:** Avenir Next, Segoe UI, Helvetica Neue, sans-serif  
**Label/Mono Font:** No separate mono voice is used in the current system.

**Character:** The typography is clean, contemporary, and familiar. One humanist sans family carries the entire product so the UI feels coherent and serviceable instead of editorial or branded for its own sake.

### Hierarchy
- **Display** (`700`, `clamp(2.1rem, 5vw, 3.8rem)`, `0.98`): Reserved for the hero promise and major route-first framing moments.
- **Headline** (`700`, `clamp(1.8rem, 3vw, 2.6rem)`, `1`): Used for summary titles and high-importance section headings.
- **Title** (`650`, `1.3rem`, `1.2`): Used for section heads such as “Next departures” and “All departures”.
- **Body** (`400`, `1rem`, `1.6`): Used for explanatory copy, route support text, and all general reading. Body prose should stay around 56ch where possible.
- **Label** (`600`, `0.88rem`, `0.08em` where uppercase is used): Used for field labels, metadata tags, and compact UI guidance.

**The One-Family Rule.** No display-font detours, no novelty alternates, no decorative type pairings. Product trust comes from consistency.

**The Fast-Squint Rule.** If a rider cannot distinguish the page promise, the active route, and the next action within two seconds, the hierarchy is wrong.

## 4. Elevation

Depth is softly layered, not flat and not heavily lifted. Large shells use blurred cream panels and one ambient shadow (`0 30px 60px rgba(93, 63, 35, 0.12)`) to separate task zones without introducing hard chrome. Smaller interactive elements lift only slightly on hover or focus, and focus halos use translucent coral rather than dark outlines.

### Shadow Vocabulary
- **Ambient Shell** (`0 30px 60px rgba(93, 63, 35, 0.12)`): Use on top-level shells such as the hero, results sections, and location picker.
- **Hover Lift** (`0 16px 28px rgba(93, 63, 35, 0.12)`): Use on interactive rows that need a gentle readiness cue.
- **Action Lift** (`0 18px 30px rgba(217, 59, 79, 0.24)`): Use on the primary submit action only.
- **Focus Halo** (`0 0 0 4px rgba(235, 76, 96, 0.12)`): Use for keyboard-visible focus on selects and selectable rows.

**The Soft Layer Rule.** Panels should feel cushioned, not glossy. If a surface looks like floating glass or a 2014 raised card, the blur or shadow is wrong.

## 5. Components

### Buttons
- **Shape:** High-comfort rounded rectangles (`20px`) for standard actions, full pills (`999px`) for compact metadata chips.
- **Primary:** Coral gradient fill from Riviera Coral to Timetable Red, white text, `56px` minimum height, medium-heavy label weight. This is the “Show departures” voice.
- **Hover / Focus:** A slight upward shift (`translateY(-1px)`) and stronger shadow. Focus must stay visible through a coral halo or equivalent high-contrast state.
- **Secondary / Utility:** The location button keeps a pale cream-white gradient, coral text, and the same control height so it feels related without competing.

### Chips
- **Style:** Metadata chips use pale paper backgrounds with coral or taupe text and a full pill radius (`999px`).
- **State:** Chips inform before they decorate. They can carry line information or action hints, but they never replace the primary action color vocabulary.

### Cards / Containers
- **Corner Style:** Large shells use `30px` corners; internal cards and rows step down to `24px` or `22px`.
- **Background:** Shells use translucent Ticket Paper over warm gradients; forms and option rows use stronger white surfaces.
- **Shadow Strategy:** Ambient Shell for section containers, Hover Lift only on interactive rows.
- **Border:** White or warm translucent borders are subtle and continuous, never loud separators.
- **Internal Padding:** Core container rhythm is `24px` to `28px`, with tighter `18px` to `20px` spacing inside form groups.

### Inputs / Fields
- **Style:** Inputs and selects are large, soft, and highly legible: `56px` minimum height, `20px` radius, pale white background, warm border, and dark ink text.
- **Focus:** Focus uses a coral halo and border strengthening, never a browser-default blue that clashes with the warm system.
- **Error / Disabled:** Error states should preserve the same size and structure while shifting border and helper copy color only. Disabled states should reduce contrast carefully without dropping below accessibility targets.

### Navigation
- **Style:** The top bar is compact and calm. It uses muted uppercase metadata for identity, a quiet subtitle, and one restrained external-link pill. Navigation should read as orientation, not marketing chrome.
- **Mobile treatment:** On smaller screens, nav and summary layouts collapse vertically without shrinking typography into ambiguity.

### Signature Component
- **Direct Destination Picker:** This is the system’s signature interaction. Destination choices are rendered as soft two-line rows with a strong route label, supporting descriptor, and a compact “Choose” action chip. It should feel faster and clearer than a native dropdown while remaining obviously tappable and keyboard-focusable.

## 6. Do's and Don'ts

### Do:
- **Do** keep primary controls at `56px` minimum height with `20px` rounding so touch and scan effort stay low.
- **Do** use Timetable Ink (`#1d1a17`) for essential route names, departure times, and labels that drive decisions.
- **Do** reserve Riviera Coral (`#eb4c60`) and Timetable Red (`#d93b4f`) for action, active emphasis, and route certainty.
- **Do** preserve soft layer depth with one ambient shell shadow and subtle hover lift, not stacked container effects.
- **Do** treat WCAG AA as the floor and push critical reading surfaces toward AAA contrast where practical.

### Don't:
- **Don't** make this feel like an old website or a dated public-service portal.
- **Don't** use cluttered layouts, weak hierarchy, low-contrast controls, cramped form fields, legacy gradients, or heavy chrome.
- **Don't** introduce glassmorphism as decoration. The blur in this system is structural and quiet, never a visual gimmick.
- **Don't** let coral spread across inactive surfaces. If everything is emphasized, nothing is.
- **Don't** replace clear selection rows with tiny native-looking dropdown treatments when the route choice list benefits from explicit readable options.
