---
name: "Nexia"
description: "Soft: a white page, flat pastel surfaces, and one colour and shape per person."
colors:
  page: "#ffffff"
  surface: "#ffffff"
  surface-2: "#f5f4f8"
  surface-3: "#ebe9f2"
  text-1: "#1c1a24"
  text-2: "#4a4757"
  text-3: "#5f5c6d"
  border: "#e6e4ee"
  border-mid: "#cfccdb"
  field-line: "#8a8698"
  line-float: "#a5a1b8"
  peach: "#ff8f57"
  peach-soft: "#ffd2b8"
  peach-tint: "#fff0e6"
  peach-ink: "#4f1d05"
  butter: "#ffc21a"
  butter-soft: "#ffe894"
  butter-tint: "#fff7d6"
  butter-ink: "#453000"
  mint: "#4fcb8a"
  mint-soft: "#bdebd0"
  mint-tint: "#e6f7ed"
  mint-ink: "#0b3d26"
  sky: "#5fa8ff"
  sky-soft: "#c4deff"
  sky-tint: "#e8f2ff"
  sky-ink: "#082f57"
  lilac: "#a58cf5"
  lilac-soft: "#dacfff"
  lilac-tint: "#f1ecff"
  lilac-ink: "#22104f"
  pink: "#ff7fae"
  pink-soft: "#ffcbdf"
  pink-tint: "#ffe9f1"
  pink-ink: "#5c0e31"
  action: "#ff8f57"
  action-hover: "#ff7d3d"
  action-soft: "#ffe3d2"
  action-ink: "#3a1503"
  red-ink: "#b3201a"
  red-bg: "#fde8e6"
  red-bg-hover: "#fbd5d1"
  focus: "#4a2fd6"
  overlay: "#1c1a2480"
typography:
  display:
    fontFamily: "Alan Sans, Avenir Next, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "5.25rem"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  name:
    fontFamily: "Alan Sans, Avenir Next, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "4.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  pageTitle:
    fontFamily: "Alan Sans, Avenir Next, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  sectionTitle:
    fontFamily: "Alan Sans, Avenir Next, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  control:
    fontFamily: "Alan Sans, Avenir Next, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "Alan Sans, Avenir Next, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Alan Sans, Avenir Next, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  chip:
    fontFamily: "Alan Sans, Avenir Next, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  code:
    fontFamily: "ui-monospace, SF Mono, SFMono-Regular, Menlo, monospace"
    fontSize: "0.85em"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  focus: "4px"
  field: "16px"
  bubble: "22px"
  card: "28px"
  hero: "40px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "28px"
  3xl: "40px"
  gutter-sm: "20px"
  gutter-md: "24px"
  gutter-lg: "40px"
  navbar: "72px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.full}"
    padding: "0 22px"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-1}"
    typography: "{typography.control}"
    rounded: "{rounded.full}"
    padding: "0 22px"
  button-destructive:
    backgroundColor: "{colors.red-bg}"
    textColor: "{colors.red-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.full}"
    padding: "0 22px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-1}"
    typography: "{typography.control}"
    rounded: "{rounded.field}"
    padding: "10px 16px"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-1}"
    typography: "{typography.chip}"
    rounded: "{rounded.full}"
    padding: "0 12px"
  panel:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-1}"
    rounded: "{rounded.card}"
    padding: "28px"
  card-person:
    backgroundColor: "{colors.lilac-soft}"
    textColor: "{colors.lilac-ink}"
    rounded: "{rounded.card}"
    padding: "22px"
---

# Design System: Nexia

## 1. Overview

**Creative North Star: "Soft"**

Nexia is a slambook: one person keeping track of the people they care about.
There are no photos in it, so a person's identity on screen is a **colour and a
shape**. Everything else stays out of the way: a white page, flat pastel
surfaces with large corners, one friendly typeface, and one colour that means
"do this".

The personality is cute and polished. Cute comes from the shapes, the pastels
and the round corners. Polished comes from restraint: flat fills, a single type
family, generous space, and no decoration that isn't carrying information.

**Key characteristics**

- A white page. Colour belongs to people, not to the chrome.
- Each person has one of six colours and one of seven shapes, derived from
  their profile id (`features/profiles/identity.ts`). A person looks the same
  in the grid, on their page, in a dialog and in a chat result.
- Flat. No `box-shadow`, no `backdrop-filter`, anywhere.
- Light theme only.
- One family, Alan Sans. Hierarchy is size and weight.
- Fields are white, defined by their edge.
- No native browser UI: no `<select>`, date input, `alert()`, `confirm()` or
  `title` tooltip.

## 2. Layout

`PageShell` (`components/layout/PageShell.tsx`) is the only container, backed
by `.shell` in `globals.css`.

| Width     | Token             | Used for                                          |
| --------- | ----------------- | ------------------------------------------------- |
| `wide`    | `--shell-wide` 76rem    | People grid, profile page, landing, navbar  |
| `reading` | `--shell-reading` 46rem | The profile form and chat                   |

One gutter token, `--gutter` (20 / 24 / 40px), is folded into `max-width`, so
the two widths are concentric and the navbar lines up with wide content. No
page sets its own `max-width` or horizontal padding.

Dashboard pages use `.page-body` (`100dvh` minus the navbar), never
`min-h-screen`. The navbar is 72px (`--navbar-h`), white, sticky, with a
hairline under it because content scrolls beneath.

**Spacing.** Tight inside a group, generous between groups. Cards in a grid sit
16px apart (12px on a phone). Panels on a profile sit 16px apart. Sections of a
page are separated by space, not rules.

**Responsive.** A person's card stands (shape above name) from `sm` up and lies
flat (shape beside name) on a phone, in one column. The grid is 2 / 3 / 4
columns at `sm` / `md` / `xl`. Profile panels sit in a wrapping row and grow to
fill it, so a missing field never leaves a hole; on a phone they stack.

## 3. Colours

All tokens live in `:root` in `apps/web/src/app/globals.css` and are exposed to
Tailwind through `@theme inline` (`bg-surface-2`, `text-p-ink`, …).

The same values exist as data in `@nexia/shared/brand`, for the logo, the
profile PDF, the social image and the emails, none of which can read a
stylesheet. `palette.test.ts` in the web app fails if the two differ.

### Surfaces

| Token         | Value     | Role                                   |
| ------------- | --------- | -------------------------------------- |
| `--page`      | `#ffffff` | The page                               |
| `--surface`   | `#ffffff` | Fields, dialogs, menus                 |
| `--surface-2` | `#f5f4f8` | Neutral panels, chips, secondary buttons |
| `--surface-3` | `#ebe9f2` | Hover on the above                     |

### Ink

A cool near-black ramp: `--text-1` `#1c1a24` (16.6:1 on white), `--text-2`
`#4a4757` (8.9:1), `--text-3` `#5f5c6d` (6.4:1).

### The six person colours

Each comes in four steps.

| Step      | Example (lilac) | Used for                                        |
| --------- | --------------- | ----------------------------------------------- |
| base      | `#a58cf5`       | The shape behind an initial; solid blocks (their song, rank badges) |
| `-soft`   | `#dacfff`       | A person's card and the top of their page; speech bubbles |
| `-tint`   | `#f1ecff`       | Panels on their page and in their form          |
| `-ink`    | `#22104f`       | The only step ever used for text or icons       |

The six are peach, butter, mint, sky, lilac and pink.

**The current person.** A `.person-<colour>` class sets `--p`, `--p-soft`,
`--p-tint` and `--p-ink`. Components use `bg-p-soft`, `text-p-ink`,
`.card-person` and `.panel-person` and never need to know which colour they
are in. Outside any person the variables fall back to neutral, which is how the
new-profile form is grey until the person exists.

### Action

Tangerine: `--action` `#ff8f57` with `--action-ink` `#3a1503` (7.5:1). It is the
primary button, the send button, a selected date, and (as `--action-soft`) the
current item in the navbar. It is the same value as peach, under its own name,
so a button never depends on which person is peach.

### Problems, focus, overlay

Red is `--red-ink` on `--red-bg`. Success borrows mint. The focus ring is
`--focus` `#4a2fd6`, 2.5px, everywhere. The scrim is `--overlay`, with no blur.

### Named rules

- **The Ink Rule.** Text and icons on a colour use that colour's `-ink`. The
  base, `-soft` and `-tint` steps are surfaces, never foregrounds.
- **The Person Rule.** Colour on a signed-in screen means a person. Do not use
  a person colour as decoration next to real people. The exceptions are fixed
  and listed: the logo, the three shapes in an empty state, the count beside
  "Your people", the four chat suggestions, and the landing page.
- **The One Action Rule.** One tangerine button per view. Everything else is
  neutral (`secondary`), quiet (`ghost`) or, on a person's colour, `frost`.
  Chat is the one exception: its send button is always tangerine, and so is
  Save on a change it is proposing.
- **The White Field Rule.** Fields are white with a 1.5px `--field-line` edge.
  Never tint a field.

## 4. Typography

One family: **Alan Sans**, loaded with `next/font` as `--font-alan`. Weights in
use: 400 body, 500 controls and meta, 600 labels and chips, 700 titles and
primary buttons.

### The ramp

| Class              | Size                         | Use                                  |
| ------------------ | ---------------------------- | ------------------------------------ |
| `.t-display`       | clamp(2.75rem → 5.25rem), 700 | Landing headlines                   |
| `.t-name`          | clamp(2.5rem → 4.75rem), 700  | A person's name on their page       |
| `.t-page-title`    | clamp(2.125rem → 3.5rem), 700 | Page titles                         |
| `.t-section-title` | 1.375rem, 700                | Panel and dialog titles              |
| `.t-label`         | 0.9375rem, 600               | Field labels                         |
| `.t-body`          | 1rem / 1.55                  | Running text                         |

### Named rules

- Sentence case everywhere. No tracked uppercase labels.
- No small label sitting above a heading. A heading carries itself.
- Body text is never below 15px; 16px in fields, so iOS does not zoom.
- Display tracking stops at -0.035em.

## 5. Elevation

There is none. Nothing casts a shadow and nothing blurs what is behind it.

- On the page, separation is colour: a pastel card, a neutral panel, a white
  field with an edge.
- Things that float over content (`Select` menu, calendar) use `.float`: white
  with a 1.5px `--line-float` edge.
- Dialogs are a white (or person-coloured) sheet on the scrim.
- Hover on a card is a 4px lift (`-translate-y-1`), with no shadow. Press is a
  slight scale down.

## 6. Components

**Logo** (`atoms/Logo`, geometry in `shared/brand/mark.ts`). Four round petals
in peach, pink, lilac and sky, overlapping in turn around a butter centre: four
people, one flower. It turns an eighth on hover. The favicon, app icons and
`docs/brand` are renders of `mark.ts`; change it, then run `npm run brand -w web`.
It is also the assistant's face in chat.

**Avatar** (`features/profiles/components/Avatar`). A person's initial inside
their shape: circle, squircle, clover, flower, arch, diamond or hexagon. Always
decorative (`aria-hidden`). `Shape` is the same drawing without an initial.

**Button** (`atoms/Button`). A pill. `primary` (tangerine), `secondary`
(neutral fill), `destructive` (red tint), `ghost`, and `frost` (translucent
white, for controls sitting on a person's colour). Minimum 44px tall; `md` is
48px.

**Fields** (`Input`, `Textarea`, `Select`, `DatePicker`, `SearchField`). White,
16px corners, 48px tall, 1.5px edge that darkens on hover and turns to the
focus colour on focus.

**Chips** (`.chip`). A pill of text. Neutral on the page; `.chip-on-color` is
frosted white and inherits the person's ink.

**Person card** (`molecules/CardProfilePreview`). `.card-person`, 28px
corners: avatar, name, relationship and pronouns, then zodiac and up to three
tags as chips.

**Profile page** (`features/profiles/components/ProfileSheet`). A block of the
person's `-soft` colour holds the controls, avatar, name, who they are, bio and
tags. Below it, one `.panel-person` per kind of thing, each with a small bold
heading. Quotes are speech bubbles. Their song is the one solid block.

**Profile form** (`ProfileForm`, `SheetSection`). The same sections as panels,
tinted with the person's colour when editing, with white fields inside. The
save bar is fixed to the bottom: white with a line above, the one place a line
separates two surfaces.

**Dialog** (`overlays/Dialog`). The one modal: a 32px-cornered sheet, a title,
actions bottom right. A quote opens on a sheet of the person's colour.

**StatusNote** (`molecules/StatusNote`). Empty, missing and failed states: a
neutral panel with three small shapes, a title, a line of help and the way out.

**Toast** (`shared/ui/toast`). One line in a dark pill at the top of the page.
The only dark surface, so it reads over white and over any person's colour.

**Chat.** Your messages are neutral bubbles on the right; Nexia's replies are
plain text. People it finds are small flat person cards. A change it proposes
is a white card with a line round it and Save / Not now. The composer is one
rounded field with a tangerine send button.

## 7. Motion

Ease-out only (`--ease-out-soft`, mirrored by `EASE_OUT` in `shared/ui/motion`);
nothing overshoots. Entrances fade up a few pixels, staggered by 40ms and capped
at one screenful. State changes take 150–200ms. `prefers-reduced-motion` stops
looping animation and removes travel; Framer Motion follows it through
`MotionConfig`.

## 8. Do's and Don'ts

### Do

- Put a `person-*` class on the outermost element that is about one person,
  and use the `p` utilities inside it.
- Use `Button`, `Select`, `DatePicker`, `ConfirmDialog`, `toast` and `Tooltip`.
- Check ink-on-colour contrast when adding a colour: 4.5:1 for text.
- Draw the sparse case. Only a name and a relationship are required, and the
  page has to look finished with just those.

### Don't

- Add a shadow, a blur, a gradient, or a border on a card.
- Tint a field.
- Use a person colour for text, or as decoration on a signed-in screen.
- Put a second tangerine button in a view, outside chat.
- Add a label above a heading, or uppercase tracked text.
- Imitate a physical material: no tilt, no texture, nothing stuck on.
