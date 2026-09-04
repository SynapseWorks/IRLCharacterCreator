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

The browser-first prototype currently supports:

- Character name + build name
- Base photo upload and client-side resize/compression
- Clickable equipment slots around the character
- Product URL inspection (best-effort JSON-LD/OpenGraph parsing)
- Manual product metadata correction
- Live real-world outfit cost stats
- Curated scene/background selection
- Makeup/style preset selection
- Local build metadata persistence
- Explicit consent before an image render leaves the browser
- Optional server-side OpenAI image-render adapter behind environment flags
- Generated-image display in the character stage
- CI production-build validation

If image rendering is disabled, **Generate look** still builds the deterministic render plan without spending API credits. If enabled, the server sends the prepared identity photo plus available product-reference images to the configured image provider.

## Stack

- Next.js + React + TypeScript
- CSS (no UI framework required for V0)
- Browser localStorage for zero-config prototyping
- Server route for product metadata inspection
- OpenAI SDK for optional image generation/editing
- Planned: Supabase for auth/database/private image storage

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

For render-plan-only mode, no API key is required. For live image rendering, copy `.env.example` to `.env.local`, add a server-side API key, and explicitly enable rendering.

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

**V0 — working foundation.**

The character-builder UI, live price stats, product URL resolver, and render-provider path are scaffolded and production-build clean. The next infrastructure milestone is Supabase auth + private photo/build storage, followed by a live render test with configured credentials and compare mode.
