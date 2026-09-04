# Product Requirements — IRL Character Creator

## North-star experience

A user should feel like they opened a real-world RPG equipment screen starring themselves.

**Upload yourself → name your character → equip real products → see the real cost → generate the styled character → save/compare the build.**

## Primary user stories

1. As a user, I can upload a clear photo of myself and immediately see it in the character stage.
2. I can name my character and each build/archetype.
3. I can click body-adjacent equipment slots instead of navigating a shopping form.
4. I can paste a real product URL and have the app attempt to read name, image, brand, price, and currency.
5. I can correct product metadata manually when a retailer blocks automated access or metadata is stale.
6. I can see the real-world cost of the equipped look update instantly.
7. I can choose a preset scene and makeup direction before rendering.
8. I can save builds and reload them for comparison.
9. Eventually, I can generate a new portrait that preserves my identity while visually equipping the selected products.

## V0 categories

- Hat
- Glasses
- Earrings
- Necklace
- Top
- Outerwear
- Bottoms
- Shoes
- Bag

Hair and makeup are initially presets, not retail-product slots.

## Character stats

### V0 practical stats

- Equipped item count
- Priced item count
- Look total
- Average item price
- Highest-cost item
- Currency warning when a build mixes currencies

### Later style stats

- Feminine
- Creative
- Professional
- Outdoorsy
- Bold
- Cozy
- Glam
- Minimal

Style stats should be transparent and playful, not presented as objective judgments about a person.

## URL/product handling

Pasted URLs are **references**, not truth. Retail prices change and many commerce sites block automated page reads.

V0 strategy:

1. Best-effort read of public JSON-LD Product schema.
2. Fallback to OpenGraph/meta product fields.
3. Always expose fields for manual correction.
4. Store the timestamp of resolved pricing once persistence is added.
5. Never claim the displayed price is guaranteed at checkout.

Future strategy: official retailer/affiliate APIs and merchant-specific adapters.

## Image-generation product contract

A render receives:

- Character/base photo reference
- Character/build name
- Background preset
- Makeup preset
- Equipped products with names, category, product image references, and notes

A successful render should:

- preserve recognizable identity
- preserve broad body proportions unless explicitly requested otherwise
- apply the visual direction of equipped products
- avoid inventing brand logos/details
- use a consistent curated background
- be described as an inspirational visualization rather than a fit guarantee

## Privacy

- Builds are private by default.
- A base photo must be deletable.
- Production storage should use signed/private URLs rather than public object buckets.
- The app should explain how long original and generated images are retained.
- Do not train custom models on user photos without separate, explicit consent.

## Definition of a lovable first release

A new user can create a named character, upload a photo, equip at least four real products, see the live total, save two alternate builds, and generate a coherent preview through a configured render provider.
