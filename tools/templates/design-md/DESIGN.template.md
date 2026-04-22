---
version: alpha
name: Example Product
description: Repo-local design system reference for UI implementation and review.
colors:
  primary: "#1F2937"
  secondary: "#6B7280"
  tertiary: "#0F766E"
  neutral: "#F8FAFC"
typography:
  h1:
    fontFamily: "Inter"
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  body-md:
    fontFamily: "Inter"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  label-sm:
    fontFamily: "Inter"
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 12px
spacing:
  sm: 8px
  md: 16px
components:
  page-shell:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    padding: "{spacing.md}"
  hero-title:
    textColor: "{colors.primary}"
    typography: "{typography.h1}"
  meta-text:
    textColor: "{colors.secondary}"
    typography: "{typography.body-md}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
    typography: "{typography.label-sm}"
---

## Overview

Describe the brand personality, target audience, and overall tone. Explain the intended feel when an agent has to make a stylistic decision that is not fully covered by the tokens.

## Colors

- **Primary (`#1F2937`)**: default text, strong surfaces, and high-emphasis structure.
- **Secondary (`#6B7280`)**: supporting text, borders, and quieter UI chrome.
- **Tertiary (`#0F766E`)**: the primary interactive accent for calls to action and highlights.
- **Neutral (`#F8FAFC`)**: the page foundation and default background tone.

## Typography

- `h1` is the headline style for key page titles and hero statements.
- `body-md` is the default reading style for paragraphs and normal UI copy.
- `label-sm` is the compact emphasis style for buttons, tabs, and small labels.

## Layout

Use the spacing scale consistently. Prefer calm vertical rhythm, readable content widths, and explicit grouping instead of dense visual clutter.

## Elevation & Depth

Keep elevation restrained. Reserve stronger separation for overlays, sticky controls, and callout surfaces that need a clear foreground role.

## Shapes

Rounded corners should feel deliberate but not soft or playful by default. Reuse the `rounded` scale instead of inventing one-off values.

## Components

Document the most important component intentions here, especially interaction-heavy elements such as buttons, cards, nav bars, or forms.

## Do's and Don'ts

- Do keep interaction accents concentrated around the tertiary color.
- Do maintain consistent spacing and typography pairings.
- Do not introduce extra accent colors without adding matching tokens and rationale.
- Do not treat this file as a shared cross-repo design system for unrelated projects.
