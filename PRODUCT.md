# Nexia — Design Context

## Project Overview

Nexia is a personal digital slambook for one person to keep track of the people they care about. It helps them manage friend profiles, remember the small details that matter later, and look those details up quickly through search and AI chat.

## Design Context

### Users

The primary user is one person using Nexia for personal life, not a team or workplace. They use it to keep track of friends, family, and close connections, and to quickly recall details they would otherwise forget.

The core job is simple: manage people, remember the small things, and look them up later without friction.

### Brand Personality

**Cute, polished, scrapbook.**

The product should feel playful, warm, polished, and confident. It should feel personal rather than technical, like a carefully kept digital memory book rather than a productivity tool.

### Aesthetic Direction

- **Light theme only.** No dark mode.
- Keep the current warm scrapbook direction already present in the product.
- Use cute colors with restraint: soft peach, lavender, blue, and similarly gentle accents are appropriate.
- Decorative touches like washi tape, paper-like layering, and scrapbook framing are part of the identity, but they should stay tidy and aligned rather than messy or novelty-first.
- The interface should feel polished and intentional, not loud or childish.
- **Not a tech product.** Avoid dashboards, sterile SaaS patterns, terminal aesthetics, heavy data UI, or anything that feels infrastructural.

### Current Theme System

DESIGN.md holds the exact tokens and the rules for using them; this is the short version.

- **Typeface:** `Nunito` (400–800) with a system sans fallback. The wordmark is Nunito ExtraBold.
- **Page:** warm cream `#fff7ed`. **Paper:** opaque white `#ffffff`, separated by warm hairlines. No glass, no blur, no shadows.
- **Ink:** a warm neutral ramp: `#292524`, `#57534e`, `#6f6660`.
- **Accents:** peach `#fdba74` (the one action, and the logo's tape), lavender `#c4b5fd` (people: avatars, tags, quotes), blue `#93c5fd` (the assistant). Accents are surfaces only; text uses their `-ink` shades.
- **The mark:** a pinned note, the same object as every card in the app: white paper, a strip of peach washi tape, an "N" in ink, set down slightly crooked. The files live in `docs/brand`.
- **Surface feel:** flat paper sheets, rounded corners, sticker chips, and one strip of washi tape per surface.

### Existing UI Cues To Preserve

- Rounded, soft-edged shapes are part of the product language.
- Washi-tape details should stay centered, tidy, and deliberate.
- Scrapbook details should support hierarchy rather than compete with it.
- Text should stay dark, readable, and calm against warm light surfaces.
- The app should keep feeling like a memory book with interface discipline, not a novelty mockup.

### Design Principles

1. **Personal before product.** Every screen should feel like it belongs to one person keeping memories, not operating software.

2. **Cute, but controlled.** Warm colors and scrapbook details should add charm without making the interface feel cluttered, sloppy, or toy-like.

3. **Lookup must stay easy.** The emotional tone can be soft, but the interaction model should remain clear, fast, and dependable when the user needs an answer.

4. **Polish is structural.** Alignment, spacing, and typography matter as much as color or decoration. If a decorative element hurts clarity, remove it.

5. **Light and warm, always.** The product should feel open, friendly, and approachable, with no drift toward dark, corporate, or “AI tool” aesthetics.
