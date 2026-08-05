---
name: "Nexia"
description: "A warm paper scrapbook system for personal profiles and memory lookup."
colors:
  page: "#fff7ed"
  surface: "#ffffff"
  surface-2: "#fbf7f1"
  surface-3: "#f4ede3"
  text-1: "#292524"
  text-2: "#57534e"
  text-3: "#6f6660"
  border: "#78624a2e"
  border-mid: "#78624a52"
  peach: "#fdba74"
  lavender: "#c4b5fd"
  blue: "#93c5fd"
  peach-soft: "#ffedd5"
  lavender-soft: "#ede9fe"
  blue-soft: "#dbeafe"
  peach-line: "#7c2d123d"
  lavender-line: "#5b21b63d"
  blue-line: "#1e40af3d"
  line-float: "#78624a8c"
  lavender-line-float: "#5b21b68c"
  peach-ink: "#7c2d12"
  lavender-ink: "#5b21b6"
  blue-ink: "#3b6fd4"
  blue-ink-deep: "#1e40af"
  green-ink: "#15803d"
  red-ink: "#c81e1e"
  red-bg: "#c81e1e12"
  red-bg-hover: "#c81e1e21"
  red-border: "#c81e1e38"
  lavender-bg: "#c4b5fd38"
  lavender-border: "#5b21b638"
  focus: "#3b6fd4"
  overlay: "#2925248c"
  nexia-mark: "#5b8def"
typography:
  display:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "4.25rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  pageTitle:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  sectionTitle:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  control:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: "normal"
  bodySm:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  meta:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  caption:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
  code:
    fontFamily: "ui-monospace, SF Mono, SFMono-Regular, Menlo, monospace"
    fontSize: "0.85em"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  focus: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "28px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
  gutter-sm: "20px"
  gutter-md: "24px"
  gutter-lg: "32px"
  navbar: "56px"
components:
  button-primary:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.peach-ink}"
    typography: "{typography.bodySm}"
    rounded: "{rounded.md}"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-2}"
    typography: "{typography.bodySm}"
    rounded: "{rounded.md}"
    padding: "0 20px"
  button-destructive:
    backgroundColor: "{colors.red-bg}"
    textColor: "{colors.red-ink}"
    typography: "{typography.bodySm}"
    rounded: "{rounded.md}"
    padding: "0 20px"
  field:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-1}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  sticker-chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  sticker-tag:
    backgroundColor: "{colors.lavender-bg}"
    textColor: "{colors.lavender-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  paper:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-1}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Nexia

## 1. Overview

**Creative North Star: "The Tidy Memory Scrapbook"**

Nexia is a personal memory book, not a productivity dashboard. Screens should
feel like a carefully kept slambook: warm paper, sticker chips, gentle colour,
and small washi-tape details that make profiles feel *kept* rather than stored.

**The material is paper, and paper is opaque.** An earlier version of this system
built every surface from translucent glass (`backdrop-filter: blur(20px)`). It
was replaced wholesale: translucency muddied every card against the warm page,
cost a compositing layer per element, and read as a tech product rather than a
scrapbook. Depth now comes from opaque surfaces, warm hairlines, and spacing —
and from nothing else. See §5: the product is flat and carries no shadows at all.

**There is no `backdrop-filter` anywhere in the app, and none should be added.**

**Key characteristics:**

- Warm cream page, opaque white paper, restrained peach / lavender / blue accents.
- Rounded panels separated by fine warm borders, never by a shadow.
- Small tape and sticker motifs used for hierarchy, never as wallpaper.
- Nunito throughout, with compact all-caps labels and calm body text.
- Ease-out motion that never overshoots.

## 2. Layout

Horizontal alignment is a system, not a per-page decision. Everything routes
through `PageShell` (`src/components/layout/PageShell.tsx`), which emits the
`.shell` class defined in `globals.css`.

- **`wide`** — `72rem`. Browse grids, the landing page, and the navbar.
- **`reading`** — `48rem`. Profile detail, forms, and chat.

Both variants share one responsive gutter token (`--gutter`: 20 / 24 / 32px),
and `.shell` folds the gutter into its `max-width`. That is what keeps the
navbar's brand and sign-out glyphs landing on exactly the same pixel columns as
the profile grid beneath them.

**Named rules:**

**The One Shell Rule.** No page sets its own `max-width` or horizontal padding.
If a surface needs to span the viewport (the form action bar, the navbar), it
goes full-bleed and puts a `PageShell` *inside* itself.

**The Navbar Offset Rule.** Dashboard pages use `.page-body`
(`min-height: calc(100dvh - var(--navbar-h))`), never `min-h-screen`. The latter
overshoots by exactly the navbar height and forces a scrollbar on every page.

**The One Sheet Rule.** A profile is one sheet of paper — a single `.paper`
article that runs from the hero to the last quote — on both the detail page and
the edit form. It is not a stack of section cards. The earlier version gave
every section its own white panel with a grey icon tile and an 11px caps label;
four of those in a column is a settings screen wearing a scrapbook's colours,
and it left section headings and field labels sharing one type size, so the
page had no hierarchy to read. Sections are divided by a heading and a hairline,
never by a new card. The same rule is why the form uses the same sheet: editing
a profile and reading one are the same document in two states.

**The App Screen Lock.** Chat is the only screen that owns the viewport, and it
adds `.app-screen` to `<html>` while mounted, which removes the document
scroller entirely. Sizing the column to `100dvh` is not sufficient on a phone:
the document keeps a scroller of its own, so a flick past either end of the
transcript chains into the page and drags the browser chrome — two scrollers
competing for one gesture. The transcript additionally sets
`overscroll-behavior: contain`. Any future full-height screen uses the same
class; nothing else should.

## 3. Colours

A warm scrapbook neutral system with three soft accent roles.

### Surfaces

- **Warm Page Cream** (`page`): the application background. Always light.
- **Clean Paper** (`surface`): cards, panels, bars, the navbar.
- **Sunk Paper** (`surface-2`): inputs, nested rows, wells, chip fills.
- **Pressed Paper** (`surface-3`): hover fills and active nav states.

### Ink

`text-1` / `text-2` / `text-3` is a **warm** neutral ramp (14.3:1 / 7.2:1 /
5.3:1 on the page). Cool slate greys were replaced because they read as a subtle
mismatch against warm cream, and the old tertiary sat right on the 4.5:1 line.

### Accents

- **Pressed Peach** (`peach`): primary actions, tape, the FAB, chat send.
- **Keepsake Lavender** (`lavender`): avatar tiles, tape, tag chips.
- **Lookup Blue** (`blue`): AI touchpoints and small navigational emphasis.

Each accent also has a **wash** — `peach-soft`, `lavender-soft`, `blue-soft` —
the pale opaque paper behind a tinted well, chip, or badge, plus a matching
`-line` hairline. Washes are opaque rather than alpha so they read identically
on `surface` and on `page`.

### Named rules

**The Ink Rule (non-negotiable).** `peach`, `lavender`, and `blue` are *surface
tints only*. They are never a text or icon colour — all three fail contrast as a
foreground on paper (blue on white measures 1.8:1). Every accent has an `-ink`
variant that clears WCAG AA: `peach-ink`, `lavender-ink`, `blue-ink`,
`green-ink`, `red-ink`. Use those for anything a person has to read.

**The Two Blues Rule.** `blue-ink` is tuned for white paper (4.8:1). On
`blue-soft` it falls to 3.8:1 and fails, so text on the blue wash uses
`blue-ink-deep` (7.0:1) instead. The two are not interchangeable; peach and
lavender need no equivalent because their inks already clear AA on their own
washes (8.0:1 and 7.5:1).

**The Content Colour Rule.** Colour is assigned by *what a thing is*, never by
where it lands in a loop. A tag is lavender on the profile grid, on the detail
sheet, in the form, and in the PDF export. The song someone is bound to is the
one peach well. Ranked songs cycle lavender / peach / blue because rank is the
information — and they carry their number too, so colour is never the only
code. Everything else — genres, places, food, politics — stays a neutral paper
chip, which is what lets the coloured things mean something. An index-modulo
accent applied to whatever happens to render next is the failure mode this rule
exists to prevent.

**The Accent Ration Rule.** If every card uses all three accents, the scrapbook
stops feeling kept and starts feeling noisy.

**The Warm Light Rule.** `page` is the baseline for every surface. Dark mode is
forbidden — PRODUCT.md specifies light theme only.

**The Focus Rule.** One focus treatment, set globally on `:focus-visible`: a 2px
`focus` outline at 2px offset. Components must not remove it.

## 4. Typography

**Family:** Nunito, with `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`,
`system-ui`, `sans-serif` fallback.

**The one exception** is `--font-mono` (`ui-monospace, "SF Mono",
SFMono-Regular, Menlo, monospace`), used *only* for inline code and code fences
inside chat markdown. It is the sole non-Nunito face in the product and must not
spread to labels, data, or anything styled to look "technical".

### The ramp

Five named classes in `globals.css` carry the hierarchy. Nothing outside them.

| Class | Size | Weight | Used for |
|---|---|---|---|
| `.t-display` | `clamp(2.5rem → 4.25rem)` | 800 | Landing hero only |
| `.t-page-title` | `clamp(1.75rem → 2.5rem)` | 800 | Every authenticated page `h1` |
| `.t-section-title` | `1.25rem` | 700 | Profile sheet sections, modal titles, empty-state headings |
| `.t-body` | `0.9375rem` (15px) | 500 | Profile prose, chat text, card names |
| `.t-label` | `0.6875rem` (11px) | 700 | Every section header and field label |

The two display steps are fluid: `.t-display` is
`clamp(2.5rem, 1.6rem + 4vw, 4.25rem)` and `.t-page-title` is
`clamp(1.75rem, 1.3rem + 1.8vw, 2.5rem)`. The frontmatter above records each
step's maximum; the clamp minimum is part of the same step, not a new one.

Supporting steps for controls and metadata: **16px** (form fields and the chat
composer — smaller values make iOS Safari zoom the viewport on focus), **14px**
(buttons, body-small), **13px** (compact buttons, status text), **12px**
(captions, chips).

### Named rules

**The One Family Rule.** Nunito carries the product. No display face for app
labels, buttons, forms, or profile content.

**The One Label Rule.** `.t-label` is the *only* all-caps metadata style. A
second, smaller 10px label size existed on the detail page and was removed —
11px is the floor for tracked uppercase text.

**The 16px Field Rule.** Form controls never go below 16px on mobile.

## 5. Elevation

**There is no elevation, because there are no shadows.** Not on cards, buttons,
modals, bars, the FAB, the composer, or toasts. Nexia is a flat product.

Separation comes from exactly three things:

1. White paper sitting on the warm cream page.
2. A single warm hairline (`border` / `border-mid`).
3. Spacing.

Because borders carry all the separation, they are set slightly stronger than a
decorative border would be. If a surface doesn't read clearly, fix its contrast
or its spacing — do not reach for a shadow.

**Named rules:**

**The Flat Rule.** No `box-shadow` anywhere. Hover states that used to lift with
a shadow (profile cards) now darken their border and rise a few pixels instead.

**The No Nested Paper Rule.** `.paper` inside `.paper` is never correct. Nested
groups use `.paper-sunk` (a bordered `surface-2` well).

**The Float Line Rule.** A hairline is only visible when it is darker than
**both** surfaces it divides. On the page that happens for free — a card's line
is darker than its own fill and darker than the cream behind it. On the overlay
it does not: the scrim composites to a mid tone, so a normal 1px card border
ends up *lighter* than the scrim and dissolves into the card's silhouette. A
dialog that simply reuses its card's border therefore looks like it has no
border at all. Surfaces floating on the scrim use `line-float` /
`lavender-line-float` at **2px** instead — the one place in the product where a
border is not 1px, because it is the one place a border has to out-contrast a
mid grey. `overlay` itself is `0.55`, not `0.42`; the lighter scrim sat too
close to the paper it was meant to be pushing back.

## 6. Components

- **Buttons** — one component, `atoms/Button.tsx`, four variants (`primary`,
  `secondary`, `destructive`, `ghost`) and two sizes. Both sizes clear 44px.
  Nothing hand-rolls a button.
- **Fields** — `atoms/Input`, `atoms/Textarea`, `atoms/Select`, all built on
  `atoms/Field` for the shared label / error / `aria-describedby` wiring.
  Fields are **white**, not tinted: a cream-tinted input on a white card reads
  as muddy, and a field should look like a hole punched in the paper rather
  than a slightly different shade of it. Definition comes from `border-mid`.
  The `.field` class deliberately sets **no width** — it is unlayered CSS and
  would otherwise beat every Tailwind sizing utility on the same element. Size
  a field from its wrapper, not the control. A button sitting **beside** a field
  takes its height from the row (`self-stretch` plus `min-h-11`), never a hard
  `h-11`: `.field` is a 44px *minimum* plus its own padding and line box, so it
  computes taller than 44px, and every fixed-height add button in the profile
  form sat a pixel short of the input next to it.
- **Back button** — `atoms/BackButton`. Its hover pill aligns to the content
  column; it is never pulled left with a negative margin to align the arrow
  glyph, because the fill then spills past the card edge on hover.
- **Chips** — `.sticker-chip` for neutral metadata, `.sticker-tag` for
  personality tags.
- **Cards** — `.paper` with `16px`–`28px` radii. Profile cards lift on hover
  (translate + a darkened border, never a shadow); they carry no CSS
  `transition` on `transform`, because Framer Motion owns that property and the
  two smear each other frame by frame.
- **Washi tape** — one material, two placements, sharing a torn-end silhouette.
  `.washi-tape` **pins**: rotated, pasted across the top edge of a surface, one
  per surface. Colour, width, and angle vary per person, keyed off the **profile
  id** rather than the grid index, so someone keeps the same tape however the
  list is filtered. The profile sheet pins exactly one, at the top of the sheet.
  `.tape-mark` **marks**: the same strip laid flat in a heading row to open a
  section, in the text flow rather than over an edge, at full strength because
  26px of 70%-opacity peach on cream is not a colour. Tape never decorates a
  surface that is already tinted — a peach strip on a peach well reads as a
  blob, and it costs the hero its claim to the only pinned tape on the page.
- **Profile sheet section** — `features/profiles/components/SheetSection.tsx`,
  shared by the detail page and the form. Tape mark, `.t-section-title`, then a
  hairline running out to the sheet's edge; more air above the heading than
  below it. Section titles and tape colours live in
  `features/profiles/sections.ts` so read, edit, and export cannot drift.
- **Quote bubble** — a `lavender-soft` card with the quotation mark hung in its
  left gutter at `.t-page-title` scale. Reserved for things the person actually
  **said**: it is the one device meaning "their words, not yours", which is why
  memories, notes, and the bio are plain wells and prose instead.
- **Form action bar** — `features/profiles/components/FormActionBar.tsx`. A
  viewport-anchored bar, not a floating pill: it reports dirty state, disables
  save until something actually changed, and guards against navigating away with
  unsaved edits.

## 7. Motion

One easing curve: `--ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`). Entrances
fade and rise a few pixels. Nothing overshoots — the old
`cubic-bezier(0.175, 0.885, 0.32, 1.275)` back-out was removed.

Framer Motion respects the OS setting through `<MotionConfig reducedMotion="user">`
in `shared/providers/query-provider.tsx`; the CSS side is handled by the
`prefers-reduced-motion` block in `globals.css`.

## 8. Do's and Don'ts

### Do

- **Do** route every page through `PageShell`.
- **Do** use an `-ink` colour for anything readable.
- **Do** keep touch targets at 44px or larger.
- **Do** hide empty profile sections rather than showing placeholders.
- **Do** keep 16px on form controls at mobile widths.
- **Do** let the loading skeleton use the loaded state's shell and padding, so
  nothing shifts when data arrives.

### Don't

- **Don't** add a `box-shadow`. Anywhere.
- **Don't** add `backdrop-filter`, glass, or blur as decoration.
- **Don't** tint a form field — fields are white.
- **Don't** add dark mode.
- **Don't** put text or icons in `peach`, `lavender`, or `blue`.
- **Don't** use `min-h-screen` on a page that sits under the navbar.
- **Don't** hand-roll a button, field label, or container width.
- **Don't** nest `.paper` inside `.paper`.
- **Don't** break a profile back into a stack of section cards.
- **Don't** colour something by its index in a loop — colour it by what it is.
- **Don't** paste tape on a surface that already carries a wash.
- **Don't** give a button beside a field a fixed height.
- **Don't** animate the same property in both CSS and Framer Motion.
- **Don't** use emoji as an icon system — the app uses Lucide.
