# IRL Character Creator ✨

**Upload yourself. Name your character. Equip your life.**

IRL Character Creator is a real-world character customization experience: upload a photo, equip products into visual slots around your character, preview a styled version of yourself in a curated scene, compare builds, and track the real-world cost of the look.

## Product idea

Think **RPG equipment screen × virtual try-on × wardrobe planner × identity sandbox**.

A character can equip:

- Hat
- Glasses
- Earrings
- Necklace
- Top
- Outerwear
- Bottoms
- Shoes
- Bag

Each item may come from a real product URL. The app attempts to resolve product metadata (title, image, price, currency) and always lets the user correct it manually.

### Character stats

The first practical stat is intentionally real-world:

- **Equipped items**
- **Look total** (sum of real item prices)
- **Average item price**
- **Most expensive item**

Future stats can include style/vibe dimensions such as Feminine, Creative, Outdoorsy, Professional, Bold, Cozy, and Glam.

## Current V0 scaffold

This repository starts with a browser-first prototype that supports:

- Character name
- Base photo upload
- Clickable equipment slots around the character
- Product URL inspection (best-effort JSON-LD/OpenGraph parsing)
- Manual product metadata correction
- Live outfit cost stats
- Curated scene/background selection
- Makeup/style preset selection
- Local build persistence
- A render-plan API contract ready for the image-generation layer

The first milestone deliberately separates the **character-builder UX** from the **AI rendering provider** so we can validate the interaction model before spending money on image generation.

## Stack

- Next.js + React + TypeScript
- CSS (no UI framework required for V0)
- Browser localStorage for zero-config prototyping
- Server route for product metadata inspection
- Planned: Supabase for auth/database/storage
- Planned: image-edit/generation provider adapter

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` when adding provider integrations.

## Documents

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — product requirements and user experience
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — technical architecture and data flow
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — staged implementation plan

## Product principles

1. **Fun first.** It should feel like opening a character customization screen, not filling in a shopping form.
2. **Private by default.** User photos and builds are sensitive personal content.
3. **Preview, not promise.** Generated styling is an approximation, never a guarantee of garment fit.
4. **Real prices matter.** Fantasy build, real-world budget.
5. **Inclusive by design.** Gender expression, body type, age, skin tone, mobility aids, and personal style should not be treated as edge cases.
6. **Provider-agnostic core.** Product ingestion and image generation should be replaceable adapters rather than hard-coded dependencies.

## Status

**V0 — foundation in progress.**

The next technical milestone is a real image render adapter that preserves identity while applying the equipped items to a consistent preset scene.
