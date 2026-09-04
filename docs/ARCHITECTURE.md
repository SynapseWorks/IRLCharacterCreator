# Technical Architecture

## Design principle

Keep the application core provider-agnostic. Retail metadata and image rendering will change over time; the character/build model should not.

## Layers

### 1. Next.js web app

Responsibilities:

- Character creation UI
- Photo selection/upload flow
- Equipment slots
- Product item editor
- Live stats
- Build history and compare UX
- Scene/makeup presets

V0 uses browser state + localStorage so the interaction can be tested without accounts or infrastructure.

### 2. Product resolver

Current endpoint: `POST /api/products/inspect`

Input:

```json
{ "url": "https://merchant.example/product" }
```

Output attempts:

```json
{
  "url": "…",
  "name": "…",
  "brand": "…",
  "imageUrl": "…",
  "price": 49.95,
  "currency": "CAD"
}
```

Resolution order:

1. JSON-LD `Product`
2. Product/OpenGraph meta fields
3. Manual user correction

### SSRF/security note

The prototype blocks obvious local/private IPv4 targets. Production should place arbitrary URL fetching behind a hardened egress service that performs DNS resolution checks, redirect validation, request size/time limits, content-type limits, and ideally merchant allowlisting. Do not treat the V0 check as sufficient SSRF protection.

### 3. Persistence (planned Supabase)

Core tables:

- profiles
- characters
- builds
- products
- build_items
- render_jobs

Object storage:

- private base photos
- private generated renders
- optional cached merchant images, subject to merchant terms

### 4. Render orchestrator

Current endpoint: `POST /api/render`

V0 creates the deterministic render plan/prompt. Provider implementation is intentionally separated behind a future adapter.

Suggested adapter contract:

```ts
type RenderInput = {
  basePhotoUrl: string;
  products: { category: string; imageUrl?: string; name: string; notes?: string }[];
  background: string;
  makeup: string;
};

type RenderResult = {
  imageUrl: string;
  provider: string;
  providerRequestId?: string;
};
```

### Image-generation provider

OpenAI currently exposes image generation/editing through GPT image models and supports an image-generation tool in the Responses API. The integration should live server-side, read the API key only from server environment variables, upload/reference the user's base image and product reference images, and return the output into private storage.

Do not send secret API keys to the browser.

### 5. Job queue

Image rendering is slow/expensive compared with ordinary API calls. Before public launch, move rendering to an asynchronous job model:

`queued → validating → rendering → storing → completed | failed`

This allows retries, rate limits, quotas, cancellations, and cost tracking.

## Proposed production flow

1. Browser obtains a signed upload URL.
2. Browser uploads base photo directly to private object storage.
3. Build data is saved to Postgres.
4. Product URLs resolve to normalized product records with `price_observed_at`.
5. User presses Generate.
6. API creates a render job and returns job ID.
7. Worker fetches signed reference images, calls render provider, stores result.
8. Client subscribes/polls for job completion.
9. Generated image becomes the current build render.

## Pricing and currency

Never silently add different currencies. V0 warns on mixed currencies. Production should either:

- keep each currency subtotal separate, or
- convert using a timestamped FX rate and explicitly show the conversion basis.

Prices need `observed_at`, `currency`, and ideally `source` fields because commerce pricing is temporal data.

## Observability

Track without storing sensitive image contents in logs:

- product resolver success/failure by merchant
- render latency and provider cost
- generation failure reason
- build save/generation conversion
- URL metadata freshness

## Future computer-vision helpers

Optional pre-render analysis can add:

- pose estimation
- face landmarks
- human segmentation
- garment-region detection

These are optimization tools, not prerequisites for the V0 UI.
