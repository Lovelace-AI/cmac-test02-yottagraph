# CRM UI Look and Feel

This document captures the visual language, layout patterns, and shared component style of the current CRM so another app can match its overall feel without copying the whole codebase.

## Overall Character

- Dense but calm B2B workspace UI.
- App shell first: dark left sidebar, light content canvas, slim utility header.
- Most content lives in softly bordered cards, tables, tabs, filters, and slideouts.
- Visual hierarchy comes from spacing, typography, muted surfaces, and selective brand color, not heavy decoration.
- Primary accent is green. Secondary accent is electric blue. Most neutrals are grayscale.

## Core Stack

- React + Tailwind CSS
- Radix UI primitives
- `class-variance-authority` for variants
- `next-themes` for light/dark mode
- Lucide icons

## Shell Anatomy

```text
+-------------------+--------------------------------------------------+
|                   | Top utility header                               |
| Dark sidebar      | - sidebar toggle                                 |
| - tenant logo     | - search trigger                                 |
| - grouped nav     | - feature request                                |
| - active item     | - theme toggle                                   |
| - collapsible     | - user avatar/menu                               |
|   "More" section  +--------------------------------------------------+
|                   | Page header                                      |
|                   | - title                                           |
|                   | - short description                               |
|                   | - primary / secondary actions                     |
|                   | - optional filter bar                             |
|                   +--------------------------------------------------+
|                   | Main content                                      |
|                   | - cards                                           |
|                   | - tables                                          |
|                   | - charts                                          |
|                   | - tabs                                            |
|                   | - dialogs / drawers / slideouts                   |
+-------------------+--------------------------------------------------+
```

## Theme Tokens

### Typography

- Sans/display font: `Space Grotesk`
- Monospace font: `JetBrains Mono`
- Page titles are bold, tight, and large.
- Section and card titles are compact and semibold.
- Body text is usually small: `text-sm`.
- Metadata is usually `text-xs` with muted color.

### Radius and Surfaces

- Base radius: `0.625rem`
- Cards and filters use rounded corners, usually `rounded-lg` or `rounded-md`
- Borders are visible but soft, commonly `border-border/70` or `border-border/80`
- Cards usually use slightly translucent surfaces like `bg-card/85` or `bg-card/90`

### Light Theme

| Token      | Value               |
| ---------- | ------------------- |
| Background | `hsl(0 0% 98%)`     |
| Foreground | `hsl(0 0% 4%)`      |
| Card       | `hsl(0 0% 100%)`    |
| Primary    | `hsl(104 100% 38%)` |
| Accent     | `hsl(226 100% 50%)` |
| Secondary  | `hsl(0 0% 94%)`     |
| Muted      | `hsl(0 0% 96%)`     |
| Border     | `hsl(0 0% 84%)`     |

### Brand and Status Colors

| Token          | Value               | Usage                          |
| -------------- | ------------------- | ------------------------------ |
| Lovelace green | `hsl(104 100% 46%)` | primary brand, active states   |
| Electric blue  | `hsl(226 100% 50%)` | info/accent actions            |
| Blaze orange   | `hsl(22 100% 50%)`  | occasional highlight           |
| Success        | `hsl(104 100% 38%)` | positive states                |
| Warning        | `hsl(36 100% 50%)`  | in-progress / caution          |
| Danger         | `hsl(0 72% 51%)`    | destructive / negative         |
| Info           | `hsl(226 100% 50%)` | neutral active / informational |
| Neutral        | `hsl(0 0% 60%)`     | inactive / unknown             |

### Sidebar Tokens

- Sidebar background is near-black.
- Sidebar text is light gray.
- Active nav item uses dark accent surface plus green text.
- Hover state uses slightly lighter dark panels.

## Layout Rules

- Sidebar width is about `16rem` on desktop.
- Mobile sidebar becomes a sheet around `18rem` wide.
- Top header height is `3.5rem`.
- Main page padding is `p-5 md:p-6`.
- Page sections usually stack with `space-y-6` to `space-y-8`.
- Filter bars wrap naturally and use tight gaps like `gap-2`.
- The UI prefers full-height application framing over centered marketing layouts.

## Shared Page Patterns

### 1. Page Header

Used for almost every major screen.

- Large title
- Optional one-line description
- Right-aligned primary and secondary actions
- Optional filter bar directly underneath
- Optional segmented controls or tabs underneath filters

Recommended composition:

```tsx
<PageHeader
    title="Accounts"
    description="Track relationships, ownership, and next steps."
    primaryAction={<Button>Add Account</Button>}
    secondaryActions={<Button variant="outline">Export</Button>}
    filters={<FilterBar>{/* search, selects, chips */}</FilterBar>}
/>
```

### 2. Filter Bar

- Rounded container
- Soft border
- Slight card tint
- Tight internal padding
- Meant for inputs, selects, toggles, date pickers, or saved filter controls

Typical class feel:

- `rounded-lg border border-border/70 bg-card/70 p-2`

### 3. Section Card

- Standard building block for dashboards and detail pages
- Card header is compact
- Card title is semibold and tight
- Optional metadata line sits below title
- Content area is spacious but not oversized

Typical class feel:

- `rounded-lg border border-border/80 bg-card/90 shadow-sm`
- Often upgraded to `card-subtle` which maps to `border-border/80 bg-card/85`

## Component Style Guide

### Buttons

Visual behavior:

- Default button is green with white text.
- Outline button is low-contrast and neutral.
- Ghost button is used heavily in header chrome and low-emphasis actions.
- Small buttons are common in tables, filter bars, and utility actions.
- Icons usually sit at `h-4 w-4`.

Variants:

| Variant       | Feel                    |
| ------------- | ----------------------- |
| `default`     | primary green action    |
| `outline`     | neutral bordered action |
| `secondary`   | filled but subdued      |
| `ghost`       | chrome / toolbar action |
| `destructive` | red destructive action  |
| `link`        | text-only action        |

Sizes:

| Size      | Approx feel            |
| --------- | ---------------------- |
| `sm`      | compact utility button |
| `default` | standard form/action   |
| `lg`      | larger CTA             |
| `icon`    | square icon control    |

### Cards

- Rounded, bordered, quiet surfaces
- Title weight is stronger than body text but not oversized
- Descriptions are tiny and muted
- Often used in grids with `gap-4` or `gap-6`

### Badges

- Usually pill-shaped and tiny
- Text is small but semibold
- Used for status, category, counts, and summaries
- Status badges use lightly tinted background plus matching text/border

### Status Badges

The CRM uses semantic color mapping for business states:

- Green for success or done
- Yellow/orange for active work
- Blue for active informational states
- Red for negative outcomes
- Gray for paused or neutral states

Example statuses:

- `Closed Won`, `Qualified`, `Active` -> green
- `Working`, `Planning`, `Negotiation` -> warning
- `Discovery`, `Proposal`, `Submitted` -> info
- `Lost`, `Canceled`, `Closed Lost` -> danger
- `Paused`, `Nurture`, `Unqualified` -> neutral

### Tables

- Wrapped in a rounded bordered container
- Header row has a subtle muted background
- Rows use soft hover states
- Text sizing stays compact
- Great for CRM entities, logs, and admin views

Typical feel:

- `rounded-lg border border-border/70`
- Header: `bg-muted/25`
- Row hover: `hover:bg-muted/35`

### Selects and Inputs

- Minimal, rounded, neutral controls
- Border-driven rather than shadow-driven
- Focus ring uses semantic ring color, not browser default
- Inputs should feel consistent with buttons and cards

### Dialogs

- Centered modal
- Dark translucent overlay
- Clean white or dark-surface panel depending on theme
- Compact title/description stack
- Tight footer actions, usually aligned right

### Sidebar

- Dark anchor for the whole product
- Group labels are uppercase, small, and low-contrast
- Menu rows are compact with icon + label
- Active row gets stronger contrast and brand emphasis
- Mobile behavior uses a sheet, not a completely different nav system

## Common Composition Recipes

### Dashboard Page

- `PageHeader`
- `FilterBar`
- tab or segmented control row
- metric cards in a grid
- one or more tables/cards/charts below

### Index/List Page

- `PageHeader`
- `FilterBar` with search + select filters
- optional saved filters row
- table or card grid
- add / create dialog

### Detail Page

- header with title and actions
- top summary cards or metadata strip
- two-column layout when useful
- left side for primary narrative/content
- right side for related entities, activity, or quick actions

## Reuse Checklist For Another App

- Keep the dark left sidebar + slim top utility bar shell.
- Reuse `Space Grotesk` for both display and body to preserve the CRM voice.
- Use mostly neutral surfaces and reserve green for primary actions or active states.
- Prefer cards, tables, badges, tabs, and slideouts over large full-bleed sections.
- Keep controls compact and dense enough for productivity work.
- Use muted metadata and strong titles rather than heavy dividers everywhere.
- Keep iconography simple and stroke-based.
- Support light and dark theme from the start.

## Suggested Minimum Component Set

If recreating this design in a new app, start with:

- `AppLayout`
- `AppSidebar`
- `PageHeader`
- `FilterBar`
- `SectionCard`
- `Button`
- `Input`
- `Select`
- `Badge`
- `StatusBadge`
- `Card`
- `Table`
- `Dialog`
- `Sheet`
- `Tabs`
- `DropdownMenu`
- `Tooltip`
- `Avatar`

## Source Files In This CRM

These are the best source files to mirror if you want the new app to feel the same:

- `src/index.css`
- `tailwind.config.ts`
- `src/components/AppLayout.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/page-shell.tsx`
- `src/components/StatusBadge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/sidebar.tsx`

## Cursor Prompt Starter

Use this in the new project if you want Cursor to reproduce the same design language:

```md
Build this app with the same visual language as the Lovelace CRM:

- dark left sidebar navigation
- slim top utility header
- light content canvas
- Space Grotesk typography
- compact B2B productivity spacing
- rounded neutral cards with soft borders
- green primary actions
- muted metadata text
- status badges with semantic success/warning/info/danger/neutral colors
- filter bars with tight controls
- tables with subtle header tint and row hover
- dialogs, drawers, and tabs using the same understated shadcn/Radix feel

Favor reusable layout primitives like AppLayout, AppSidebar, PageHeader, FilterBar, and SectionCard.
```
