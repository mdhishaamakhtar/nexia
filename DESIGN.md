---
name: "Nexia"
description: "A cute, polished scrapbook system for personal profiles and memory lookup."
colors:
  warm-page: "#fff7ed"
  paper: "#ffffff"
  glass: "#ffffffb8"
  fill: "#ffffff9e"
  fill-hover: "#ffffffe6"
  input-bg: "#ffffffbf"
  border-soft: "#94a3b847"
  border-mid: "#94a3b873"
  specular: "#fffffff2"
  text-primary: "#1f2937"
  text-secondary: "#374151"
  text-muted: "#6b7280"
  peach: "#fdba74"
  peach-text: "#7c2d12"
  lavender: "#c4b5fd"
  lavender-border: "#7c3aed33"
  blue: "#93c5fd"
  green: "#22c55e"
  red: "#ff3b30"
  red-bg: "#ff3b3014"
  red-bg-hover: "#ff3b3026"
  red-border: "#ff3b302e"
  purple: "#5b21b6"
  purple-bg: "#c4b5fd3d"
  purple-border: "#7c3aed3d"
  overlay: "#1e293b66"
typography:
  display:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "normal"
  headline:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "normal"
  title:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  xs: "4.8px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
  page-x: "24px"
  page-y: "48px"
components:
  button-primary:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.peach-text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-destructive:
    backgroundColor: "{colors.red-bg}"
    textColor: "{colors.red}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  input-text:
    backgroundColor: "{colors.input-bg}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  sticker-chip:
    backgroundColor: "{colors.fill-hover}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  glass-card:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Nexia

## 1. Overview

**Creative North Star: "The Tidy Memory Scrapbook"**

Nexia is a personal memory book, not a productivity dashboard. The interface should feel like a carefully kept slambook: warm paper, soft translucent layers, sticker chips, gentle color, and small washi-tape details that make profiles feel kept rather than stored.

The system is cute, polished, and controlled. Scrapbook details are allowed only when they support hierarchy. Alignment, readable type, and dependable lookup behavior come first. The app must stay light and friendly, with no drift toward a technical command center.

**Key Characteristics:**

- Warm light surfaces with restrained peach, lavender, and blue accents.
- Rounded paper-like panels with translucent fills and fine borders.
- Small decorative tape and sticker motifs used as hierarchy, not clutter.
- Nunito everywhere, with compact labels and calm body text.
- Playful motion for state and entrance, never choreography that slows lookup.

## 2. Colors

The palette is a warm scrapbook neutral system with three soft accent roles: peach for primary action, lavender for keepsake surfaces, and blue for discovery or AI-adjacent action.

### Primary

- **Pressed Peach** (`peach`): Used for primary actions, washi-tape accents, and moments that should feel warm and personal.
- **Peach Ink** (`peach-text`): Used on peach surfaces when white would feel too harsh and low-contrast.

### Secondary

- **Keepsake Lavender** (`lavender`): Used for avatar tiles, tape accents, profile export details, and soft memory framing.
- **Lookup Blue** (`blue`): Used for search, floating add actions, AI touchpoints, and small navigational emphasis.

### Tertiary

- **Sticker Purple** (`purple`, `purple-bg`, `purple-border`): Used for tag chips and personality labels where scrapbook color needs a stronger identity.
- **Success Green** (`green`): Reserved for success states only.
- **Soft Red** (`red`, `red-bg`, `red-bg-hover`, `red-border`): Reserved for destructive states and error copy.

### Neutral

- **Warm Page Cream** (`warm-page`): The application background. It should always keep the product in light scrapbook territory.
- **Clean Paper** (`paper`): Used for raised paper surfaces and hard white details.
- **Translucent Paper** (`glass`, `fill`, `fill-hover`, `input-bg`): Used for panels, buttons, inputs, hover fills, and soft layering.
- **Graphite Ink** (`text-primary`, `text-secondary`, `text-muted`): The full text scale. Primary text is dark and calm, secondary text carries normal UI copy, muted text carries labels and metadata.
- **Pencil Border** (`border-soft`, `border-mid`): Fine borders that define paper edges without making the UI feel boxed in.

### Named Rules

**The Warm Light Rule.** `warm-page` is the baseline for every app surface. Dark mode is forbidden.

**The Accent Ration Rule.** Peach, lavender, and blue must stay deliberate. If every card uses all three, the scrapbook stops feeling kept and starts feeling noisy.

**The Paper Before Chrome Rule.** Use translucent paper, fine borders, and tinted fills before reaching for heavy shadows or saturated UI chrome.

## 3. Typography

**Display Font:** Nunito with `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `system-ui`, `sans-serif` fallback.
**Body Font:** Nunito with the same fallback stack.
**Label/Mono Font:** Nunito for labels; `ui-monospace`, `SF Mono`, `monospace` only inside markdown code.

**Character:** The type is rounded, open, and personal. It should read like a polished journal interface: friendly headings, compact labels, and calm body copy.

### Hierarchy

- **Display** (600, `3rem`, `1.08`): Used for major page titles such as the slambook index.
- **Headline** (600, `2.25rem`, `1.15`): Used for profile names and large authenticated-page headings.
- **Title** (700, `1.25rem`, `1.25`): Used for modal titles, feature titles, and important empty-state copy.
- **Body** (500, `0.875rem`, `1.5`): Used for app copy, form fields, buttons, profile details, and chat text. Prose should stay under 65 to 75 characters per line.
- **Label** (700, `0.6875rem`, `0.12em`, uppercase): Used for section labels, field labels, metadata, and small scrapbook captions.

### Named Rules

**The One Family Rule.** Nunito carries the product. Do not introduce display fonts for app labels, buttons, forms, or profile detail content.

**The Compact Label Rule.** Labels are uppercase, small, and widely tracked. They should guide scanning without sounding corporate.

## 4. Elevation

Nexia uses tonal layering more than shadow. Depth comes from translucent paper, fine borders, inset specular highlights, and occasional paper-scrap offsets. Shadows are nearly absent at rest, because heavy drop shadows would make the app feel like a generic SaaS dashboard.

### Shadow Vocabulary

- **Glass Specular** (`box-shadow: inset 0 1px 0 var(--specular)`): Used on `.glass-panel` and `.glass-card` to create a subtle paper sheen.
- **Paper Scrap Offset** (`box-shadow: 2px 2px 0px var(--border-mid)`): Used only for deliberate paper-scrap moments.
- **Print Paper Flatness** (`box-shadow: none`): Used in PDF export so the exported page feels like a clean printable keepsake.

### Named Rules

**The Flat Keepsake Rule.** Surfaces are flat by default. Create depth through paper layering, translucent fills, and borders before using shadow.

**The No Heavy Glass Rule.** Blur can support translucent paper panels, but decorative glassmorphism is prohibited.

## 5. Components

Components should feel tactile and familiar. Standard controls stay standard; the personality comes from material, radius, spacing, and small scrapbook accents.

### Buttons

- **Shape:** Rounded rectangles with soft corners (`12px`) and full-pill chips where content is metadata.
- **Primary:** Pressed peach background with peach ink text (`peach`, `peach-text`), medium body text, `10px 20px` padding, and a fine lavender border.
- **Hover / Focus:** Small scale feedback from Framer Motion (`1.015` hover, `0.985` tap). Focus should keep the border visible and avoid loud rings.
- **Secondary / Ghost / Destructive:** Secondary uses translucent fill and graphite text. Ghost removes the fill until hover. Destructive uses red tint, red border, and red text.

### Chips

- **Style:** Sticker chips use white translucent fills, rounded full corners, fine borders, compact type, and optional tiny Lucide icons.
- **State:** Hover may strengthen the border or fill. Chips should not become saturated blocks unless they represent a meaningful tag category.

### Cards / Containers

- **Corner Style:** Profile cards and panels use soft rounded corners (`16px` to `24px`), with profile cards usually at `16px`.
- **Background:** Glass cards use translucent paper (`glass`) over the warm page.
- **Shadow Strategy:** Use inset specular highlight and border. Do not add generic large shadows.
- **Border:** Use `border-soft` for normal panels and `border-mid` for active or modal emphasis.
- **Internal Padding:** Compact cards use `20px`; form and detail sections use `24px` to `28px`.

### Inputs / Fields

- **Style:** Inputs use `input-bg`, `12px` corners, `12px 16px` padding, `border-soft`, and Nunito body text.
- **Focus:** Border shifts to lavender and the background becomes `glass`.
- **Error / Disabled:** Errors use red text and red border tint. Disabled controls use reduced opacity and keep the same shape.

### Navigation

- **Style:** The top nav is sticky, compact (`48px` high), translucent, and border-bottom only. Links use `14px` to `15px` Nunito with rounded hover fills.
- **Mobile Treatment:** Secondary labels can hide on small screens, but icons remain visible and familiar.

### Profile Cards

Profile cards are the signature browse component. They use a glass card, a slightly rotated colored avatar square, relationship chips, optional zodiac and tags, and a tiny washi-tape accent that appears on hover. The card may rotate by less than one degree at rest, then settle on hover.

### Profile PDF Export

The export surface is a print-only keepsake page. It uses A4 sizing, warm paper, subtle grid texture, washi tape, pill metadata, and section panels that only render when data exists. The exported PDF should feel like a tidy scrapbook page, not a browser screenshot.

## 6. Do's and Don'ts

### Do:

- **Do** keep the product light and warm, with `warm-page` as the default surface.
- **Do** use peach, lavender, and blue with restraint so the product stays cute and controlled.
- **Do** center washi-tape details and keep them tidy, deliberate, and subordinate to content.
- **Do** use rounded, soft-edged shapes consistently across cards, buttons, inputs, chips, and modals.
- **Do** make lookup easy: search, profile cards, forms, and chat responses must stay readable before decorative.
- **Do** hide empty profile sections and avoid placeholders that make a profile feel unfinished.
- **Do** preserve standard affordances for buttons, inputs, navigation, dialogs, and print export.

### Don't:

- **Don't** add dark mode. PRODUCT.md says light theme only.
- **Don't** make Nexia feel like a tech product.
- **Don't** use dashboards, sterile SaaS patterns, terminal aesthetics, heavy data UI, or anything infrastructural.
- **Don't** let scrapbook details become messy, novelty-first, loud, childish, or cluttered.
- **Don't** use colored side-stripe borders, gradient text, decorative glassmorphism, hero-metric templates, or repeated identical card grids.
- **Don't** use full-saturation accents on inactive states.
- **Don't** invent custom controls where a standard input, select, button, or link would be clearer.
