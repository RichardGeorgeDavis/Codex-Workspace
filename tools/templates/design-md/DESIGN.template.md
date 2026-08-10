---
version: alpha
name: Example Product
description: Repo-local design system reference for UI implementation and review.
# Uncomment only when a token section is intentionally not applicable:
# omitted:
#   - spacing
#   - section: rounded
#     reason: "No rounded corners are defined by this product"
colors:
  primary: "#1F2937"
  on-primary: "#FFFFFF"
  secondary: "#6B7280"
  on-secondary: "#FFFFFF"
  tertiary: "#0F766E"
  on-tertiary: "#FFFFFF"
  background: "#F8FAFC"
  surface: "#FFFFFF"
  surface-muted: "#F1F5F9"
  on-surface: "#1F2937"
  border: "#CBD5E1"
  focus: "#0F766E"
  success: "#15803D"
  warning: "#B45309"
  error: "#B91C1C"
  disabled: "#E2E8F0"
  on-disabled: "#334155"
typography:
  display:
    fontFamily: "system-ui"
    fontSize: 3.75rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  h1:
    fontFamily: "system-ui"
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: "system-ui"
    fontSize: 2.25rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.015em
  h3:
    fontFamily: "system-ui"
    fontSize: 1.5rem
    fontWeight: 650
    lineHeight: 1.25
  body-lg:
    fontFamily: "system-ui"
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "system-ui"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: "system-ui"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: "system-ui"
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.4
  label-sm:
    fontFamily: "system-ui"
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.02em
  code:
    fontFamily: "ui-monospace"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 6px
  md: 12px
  lg: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  page: 32px
components:
  page-shell:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-surface}"
    padding: "{spacing.page}"
  page-title:
    textColor: "{colors.primary}"
    typography: "{typography.h1}"
  body-copy:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  meta-text:
    textColor: "{colors.secondary}"
    typography: "{typography.body-sm}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
    typography: "{typography.label-md}"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: 44px
  button-primary-disabled:
    backgroundColor: "{colors.disabled}"
    textColor: "{colors.on-disabled}"
    rounded: "{rounded.md}"
    height: 44px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 44px
    typography: "{typography.label-md}"
  button-secondary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    rounded: "{rounded.md}"
    height: 44px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 44px
    typography: "{typography.body-md}"
  form-error:
    textColor: "{colors.error}"
    typography: "{typography.body-sm}"
  muted-panel:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
    width: "100%"
  focus-indicator:
    backgroundColor: "{colors.focus}"
    height: 2px
    width: "100%"
  nav-link:
    textColor: "{colors.secondary}"
    typography: "{typography.label-md}"
  nav-link-active:
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
  status-success:
    backgroundColor: "{colors.success}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
  status-error:
    backgroundColor: "{colors.error}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
---

## Overview

The values and rules below are illustrative defaults, not an approved brand
system. Replace them with project evidence and decisions before treating this
file as authoritative.

Describe the product, audience, brand personality and overall tone. Explain
the intended feel when an agent has to make a stylistic decision that is not
fully covered by the tokens. Record what the interface must never feel like.

## Colors

Describe the role of each colour, not only its value. State which colour is
the main interactive accent, which colours are reserved for status feedback,
and where contrast or colour combinations must be avoided.

- **Primary:** high-emphasis text, strong structure and key brand surfaces.
- **Secondary:** supporting text, borders and quieter interface chrome.
- **Tertiary:** the main interactive accent and primary call to action.
- **Background and surface:** page foundation, cards, panels and overlays.
- **Status colours:** success, warning and error feedback only; do not use them
  decoratively.

## Typography

Document the typeface source, fallback stack, hierarchy, casing, measure and
typographic exceptions. Replace the placeholder `system-ui` values above with
the approved fonts when the project has a defined type system.

- `display`, `h1`, `h2` and `h3` define the heading hierarchy.
- `body-lg`, `body-md` and `body-sm` define reading and supporting copy.
- `label-md` and `label-sm` define controls, metadata and compact UI text.
- `code` defines technical content, identifiers and developer-facing values.

State the maximum readable line length, minimum body size, preferred heading
measure, and whether text may use all caps, italics or condensed styling.

## Layout

Describe the layout model: grid or flow behaviour, maximum content width,
column count, gutters, page margins, section rhythm, alignment rules and
content density. Use the spacing scale consistently and explain when a
component should use negative space instead of a containing card.

## Elevation & Depth

Describe how hierarchy is conveyed through surface colour, borders, shadows,
blur and layering. Define when cards, sticky controls, drawers, dialogs and
tooltips may appear above the page. Avoid shadows or gradients unless they
serve a specific hierarchy or interaction purpose.

## Shapes

Describe the shape language and reuse the `rounded` scale instead of inventing
one-off values. State whether controls, cards, inputs, badges and images share
the same radius family, and where sharp corners are intentional.

## Components

Document the most important component intentions, especially interaction-heavy
elements such as buttons, cards, navigation, forms, tables, alerts, dialogs,
empty states and loading states. For each important component, record its
purpose, hierarchy, content rules, responsive behaviour and state model.

The front matter shows the supported component token properties. Component
variants such as `button-primary-hover` and `button-primary-disabled` should
be separate entries with related names.

The example button and input heights use a 44px touch-target baseline. Adjust
this for the project only when the accessibility rationale is recorded below.

## Do's and Don'ts

- Do keep interaction accents concentrated around the tertiary colour.
- Do maintain consistent spacing and typography pairings.
- Do provide a visible focus treatment for every keyboard-accessible control.
- Do use status colours with text or icon context, not colour alone.
- Do not introduce extra accent colours without adding matching tokens and
  rationale.
- Do not use a component variant whose contrast or touch target fails the
  project's accessibility requirements.
- Do not treat this file as a shared cross-repo design system for unrelated
  projects.

## Responsive Behaviour

Describe the responsive model and the breakpoints or container thresholds
that matter. State how navigation, grids, tables, cards, forms, typography,
images and actions change on narrow screens. Record the smallest supported
viewport and the required test widths.

## Accessibility

Record the project's accessibility baseline, including target WCAG level,
minimum contrast ratios, keyboard navigation, focus visibility, reduced motion,
minimum touch targets, form error handling, semantic structure and non-colour
status communication. Identify any intentional exceptions and their reason.
The `focus` colour is a placeholder; implement it as an outline, border or
other clearly visible focus treatment appropriate to the component.

## Interaction States

Define the visual and behavioural treatment for default, hover, focus-visible,
active or pressed, selected, disabled, loading, success and error states.
State whether state changes use colour, border, elevation, motion, text or a
combination, and ensure each state remains understandable without hover.

## Motion

Describe the motion personality, timing, easing, distance and choreography.
State what may animate, what must remain immediate, how reduced-motion users
are supported, and which perpetual animations are prohibited. Prefer animating
opacity and transforms over layout properties unless there is a strong reason.

## Iconography and Imagery

Document icon source, stroke or fill treatment, optical sizing, alignment,
accessible labelling and rules for decorative versus functional icons. Record
image aspect ratios, cropping, focal-point behaviour, border treatment,
placeholder behaviour, licensing and acceptable fallback assets.

## Content and Voice

Describe the UI writing voice, reading level, terminology, capitalisation,
number and date formats, button-label conventions, error-message structure,
empty-state guidance and rules for avoiding invented claims or filler copy.

## Implementation Notes

Record the framework, CSS or token conventions, component-library boundaries,
font-loading approach, dark-mode or theme behaviour, browser support,
performance constraints, and any existing tokens or variables that must be
reused rather than duplicated.

## Verification Checklist

Before considering the design system complete, verify:

- [ ] The token values and prose agree with each other.
- [ ] All token references resolve and the file passes the DESIGN.md linter.
- [ ] Key components have documented responsive and interaction states.
- [ ] Contrast, keyboard access, focus visibility and touch targets have been
      checked.
- [ ] Required viewports and reduced-motion behaviour have been tested.
- [ ] Placeholder values, example copy and example assets have been replaced
      or explicitly retained as intentional defaults.
- [ ] Any intentionally omitted token section uses the upstream `omitted`
      front-matter field with a reason.
