# Nexia — Design Context

## Project Overview

Nexia is a personal digital slambook for one person to keep track of the people they care about. It helps them manage friend profiles, remember the small details that matter later, and look those details up quickly through search and AI chat.

## Design Context

### Users

The primary user is one person using Nexia for personal life, not a team or workplace. They use it to keep track of friends, family, and close connections, and to quickly recall details they would otherwise forget.

The core job is simple: manage people, remember the small things, and look them up later without friction.

### Brand Personality

**Cute, polished, soft.**

The product should feel playful, warm, polished, and confident. It should feel personal rather than technical, like a carefully kept book of your people rather than a productivity tool.

### Aesthetic Direction

- **Light theme only.** No dark mode.
- The direction is called Soft: a white page, flat pastel surfaces with large corners, and one colour and one shape per person.
- Colour belongs to people. Each person gets one of six pastels (peach, butter, mint, sky, lilac, pink) and one of seven shapes behind their initial, and looks the same everywhere they appear.
- No imitation of physical things: no tape, no tilt, no paper texture.
- The interface should feel polished and intentional, not loud or childish.
- **Not a tech product.** Avoid dashboards, sterile SaaS patterns, terminal aesthetics, heavy data UI, or anything that feels infrastructural.

### Current Theme System

DESIGN.md holds the exact tokens and the rules for using them; this is the short version.

- **Typeface:** `Alan Sans` (400–700) with a system sans fallback, for everything including the wordmark.
- **Page:** white `#ffffff`. Neutral panels are `#f5f4f8`. No glass, no blur, no shadows.
- **Ink:** a cool near-black ramp: `#1c1a24`, `#4a4757`, `#5f5c6d`.
- **Person colours:** six pastels, each in four steps (the colour, a card fill, a panel tint, and an ink for text).
- **Action:** tangerine `#ff8f57`, the one colour that means "do this".
- **The mark:** four round petals in four of the person colours, overlapping around a yellow centre: four people, one flower. The files live in `docs/brand`.
- **Surface feel:** flat blocks of colour, large rounded corners, pill buttons and chips, white fields.

### UI Cues To Preserve

- Rounded, soft-edged shapes are part of the product language.
- A person's colour and shape stay the same wherever they appear.
- Text stays dark and readable: on a colour, it uses that colour's ink.
- Fields are white.
- The app should feel like a kept book of people with interface discipline, not a novelty mockup.

### Design Principles

1. **Personal before product.** Every screen should feel like it belongs to one person keeping memories, not operating software.

2. **Cute, but controlled.** Colour and shape should add charm without making the interface feel cluttered, sloppy, or toy-like.

3. **Lookup must stay easy.** The emotional tone can be soft, but the interaction model should remain clear, fast, and dependable when the user needs an answer.

4. **Polish is structural.** Alignment, spacing, and typography matter as much as color or decoration. If a decorative element hurts clarity, remove it.

5. **Light and friendly, always.** The product should feel open, friendly, and approachable, with no drift toward dark, corporate, or “AI tool” aesthetics.
