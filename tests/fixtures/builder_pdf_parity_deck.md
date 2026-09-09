---
title: Builder PDF parity regression
short-title: Builder PDF parity regression
author: Test
aspect-ratio: 16:9
theme: scientific-light
defaults:
  footer: PASQAL · CONFIDENTIAL
---

# PDF parity regression {#pasqal-front .layout-front footer="none"}

::: core
## *Preview and PDF must share geometry*

**Regression fixture**

Vector export test
:::

---

## Agenda {#pasqal-agenda .layout-1}

::: core
1. Verify title and footer geometry
2. Verify two-column content
3. Verify dark decision surface
:::

---

## Evidence and interpretation {#pasqal-focus-parity .layout-1-1 columns="43 57"}

::: left
### Evidence

- Left column stays left
- Text remains selectable
- Spacing follows preview
:::

::: right
### Interpretation

| Signal | Expected |
|---|---|
| Geometry | Stable |
| PDF | Vector |
| Pages | 1 per slide |
:::

---

## Decision / next step {#pasqal-dark-parity .layout-1}

::: core
*Close the rendering gap, not the screenshot gap.*

- Use Reveal print view
- Wait for fonts and images
- Keep raster only as fallback

### Takeaway
Preview and PDF come from the same rendered PASQAL structure.
:::

---

## Thank you {#pasqal-closing .layout-1 footer="none"}

::: core
Questions?
:::
