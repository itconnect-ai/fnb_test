---
name: Precision Retail Operations
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#434655'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#3755c3'
  on-secondary: '#ffffff'
  secondary-container: '#708cfd'
  on-secondary-container: '#00217a'
  tertiary: '#ae0010'
  on-tertiary: '#ffffff'
  tertiary-container: '#d52022'
  on-tertiary-container: '#ffecea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c4ff'
  on-secondary-fixed: '#001453'
  on-secondary-fixed-variant: '#173bab'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Noto Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Noto Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  data-mono:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.5rem
  space-lg: 0.75rem
  space-xl: 1rem
---

## Brand & Style

This design system delivers an operational, mission-critical back-office environment for enterprise retail, inventory, and point-of-sale administration. The interface prioritizes rapid scanning, dense information display, zero cognitive drag, and unambiguous operational states. 

The aesthetic is functional, systematic, and data-first:
- **Tone & Mood:** Authoritative, industrial-grade, disciplined, and strictly utilitarian.
- **Visual Expression:** Flat architectural panes, clean separation lines, high structural contrast, and minimal decorative overhead.
- **Clarity Mandate:** Absolutely no emojis, playful metaphors, or illustrative placeholders. Icons are strictly geometric, monochrome, and functional. Information hierarchy is enforced through typography scale, background contrast, and status accents rather than spatial bloat.

## Colors

The color palette is built around utility, low eye-fatigue for prolonged shift usage, and immediate recognition of critical inventory thresholds.

- **Primary Canvas & Surfaces:**
  - App Background: `#F4F5F7` (recessed workspace tint).
  - Surface Containers / Table Rows: `#FFFFFF` (pure flat white for maximum tabular readability).
  - Hover & Alternate Rows: `#F8FAFC` to `#F1F5F9`.
- **Borders & Dividers:**
  - Structural Borders: `#E2E8F0` (single-pixel crisp boundary).
  - Accent / Focus Border: `#93C5FD`.
- **Brand & Action Signals:**
  - Primary Action / Active Link: `#2563EB` (bright business blue).
  - Primary Dark / Press State: `#1E40AF` (deep business blue).
  - Selected Table Row Fill: `#EFF6FF` with a 2px `#2563EB` indicator edge.
- **Functional Status Indicators:**
  - Critical Shortage / Stock Out: `#DC2626` (urgent red) paired with `#FEF2F2` background badge.
  - Caution / Low Threshold: `#D97706` (warning amber) paired with `#FFFBEB` badge.
  - Normal / Verified In-Stock: `#059669` (operational green) paired with `#ECFDF5` badge.
  - Inactive / Discontinued: `#64748B` paired with `#F1F5F9`.

## Typography

The type hierarchy employs `Noto Sans` (with immediate fallback to `Pretendard`, Apple SD Gothic Neo, and system sans-serif fonts) for unified rendering of CJK ideographs, Hangul, Latin characters, and dense numeric data.

- **Data Density Rules:**
  - Font sizes are systematically compressed between 11px and 14px for operational data grids, enabling high-volume scanning without horizontal wrapping.
  - Tabular numerical figures (`font-variant-numeric: tabular-nums;`) must be enforced across all monetary figures, SKUs, inventory counts, and timestamps.
- **Single-Line Truncation:**
  - Table cells and ledger lines strictly enforce `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`. Multi-line text wrapping is prohibited in grid cells to preserve uniform row height.
  - Column headers render in `label-sm` with upper/semi-bold weight for distinction against data rows.

## Layout & Spacing

This design system uses a high-density, fixed-sidebar layout paired with fluid data panes:

- **Structure:**
  - Global Navigation Sidebar: Fixed 240px (collapsible to 56px icon-only).
  - Main Operational Stage: Fluid width on desktop screens, bounded by a standard outer canvas margin of `1rem` (16px).
  - Action/Filter Bars: Pinned horizontally with a consistent gap of `0.5rem` (8px).
- **Data Table Metrics:**
  - Row Heights: Default ultra-compact row height of 36px (`compact`), with an optional standard row height of 44px (`normal`).
  - Table Cell Padding: 0px 8px horizontal, matching `space-md`.
- **Breakpoints:**
  - Desktop Large (≥1440px): Unrestricted full-width data grids with multi-column side panels.
  - Desktop Standard (1024px – 1439px): Pinned navigation, responsive column suppression for secondary table metadata.
  - Mobile/POS Terminal (≤1023px): Sidebar transforms into drawer; grids switch to horizontally scrollable viewports with locked primary ID columns.

## Elevation & Depth

Elevation is achieved strictly through crisp contrast boundaries and surface fills rather than heavy blurring:

- **Elevation Strategy:** Flat, low-contrast structural boundaries.
- **Borders over Shadows:** Surfaces use a 1px solid border `#E2E8F0` on all cards, panels, and data tables.
- **Shadow Tokens:**
  - Base Panels & Data Rows: Zero shadow (`box-shadow: none;`).
  - Dropdown Menus & Popovers: `0 2px 4px -1px rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)` combined with 1px `#CBD5E1` border.
  - Modals & Critical Alert Dialogs: `0 10px 15px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -4px rgba(15, 23, 42, 0.08)` over an unobtrusive backdrop mask (`rgba(15, 23, 42, 0.35)`).
- **Z-Index Distribution:**
  - Base Data Table: `z-0`
  - Sticky Headers / Freeze Columns: `z-10`
  - Fixed Filter Bar / Top Action Bar: `z-20`
  - Flyout Drawers: `z-30`
  - Modals: `z-40`
  - Toast & Shortage Notifications: `z-50`

## Shapes

The shape system enforces high structural discipline:

- **Corner Radii:**
  - Compact inputs, badges, table cells, and buttons use a baseline radius of 4px (`0.25rem`).
  - Container cards and modal surfaces use a maximum radius of 6px to 8px (`rounded-lg`).
  - Pills and high-curvature radiuses are prohibited, ensuring elements retain a clean, data-terminal silhouette.
- **Dividers & Strokes:**
  - Interior table horizontal rules are uniform 1px solid `#F1F5F9`.
  - Header delimiters use 1px solid `#E2E8F0`.

## Components

### 1. Data Tables & Grids
- **Header:** Background `#F8FAFC`, 1px solid border-bottom `#E2E8F0`. Typography: `label-sm`, color `#64748B`.
- **Rows:** Background `#FFFFFF`, alternating with `#FAFAFA` where specified. Height: 36px. Border-bottom: 1px solid `#F1F5F9`.
- **Hover State:** Background `#F1F5F9` across the entire row.
- **Selected State:** Background `#EFF6FF` with a persistent left-edge border (3px solid `#2563EB`).
- **Data Truncation:** Cells must render single-line data with ellipsis. Numeric and monetary values align right with monospace tabular numerals.

### 2. Buttons
- **Primary:** Background `#2563EB`, text `#FFFFFF`, border none, height 32px (compact) or 36px (standard). Hover: `#1E40AF`. Active: `#1D4ED8`. Focus: 2px ring `#93C5FD`.
- **Secondary / Outline:** Background `#FFFFFF`, border 1px solid `#CBD5E1`, text `#334155`. Hover: `#F8FAFC`, border `#94A3B8`.
- **Urgent / Destructive:** Background `#DC2626`, text `#FFFFFF`. Hover: `#B91C1C`.
- **Icon Actions:** 28px square, transparent background, text `#64748B`, hover text `#1E293B`, hover background `#E2E8F0`.

### 3. Badges & Stock Alert Chips
- **Critical Shortage:** Background `#FEF2F2`, border 1px solid `#FCA5A5`, text `#DC2626`, font size 11px, weight 600, padding `2px 6px`.
- **Adequate Stock:** Background `#ECFDF5`, border 1px solid `#A7F3D0`, text `#059669`.
- **Pending / In-Transit:** Background `#EFF6FF`, border 1px solid `#BFDBFE`, text `#1D4ED8`.

### 4. Input Fields & Search Bars
- **Height:** 32px for table filters, 36px for form views.
- **Border:** 1px solid `#CBD5E1`, radius 4px, background `#FFFFFF`.
- **Focus:** Border color `#2563EB`, outline none, box-shadow `0 0 0 1px #2563EB`.
- **Prefix / Suffix:** Search magnifying icon or currency signs rendered in `#94A3B8`, non-interactive.

### 5. Checkboxes & Radio Buttons
- **Size:** 16px × 16px crisp square (checkbox) or circle (radio).
- **Unchecked:** Border 1px solid `#CBD5E1`, background `#FFFFFF`.
- **Checked:** Background `#2563EB`, border color `#2563EB`, internal checkmark stroke `#FFFFFF` (1.5px).

### 6. Cards & Containers
- **Visual Style:** Background `#FFFFFF`, 1px solid border `#E2E8F0`, zero drop shadow.
- **Card Header:** Height 44px, vertical center layout, 12px padding left/right, border-bottom 1px solid `#F1F5F9`.

### 7. KPI / Metric Counter
- **Container:** Compact card with 12px padding.
- **Label:** `label-sm`, color `#64748B`.
- **Value:** `headline-lg`, tabular numerals, color `#0F172A`.
- **Trend Indicator:** Inline tag (`+12.4%` in `#059669` or `-3.2%` in `#DC2626`) without decorative icons.