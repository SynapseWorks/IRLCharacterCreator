import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function blockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  return false;
}

function firstMeta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return undefined;
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function jsonLdBlocks(html: string) {
  const blocks: unknown[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    try { blocks.push(JSON.parse(match[1])); } catch { /* retailers often emit malformed JSON-LD */ }
  }
  return blocks;
}

function findProduct(value: unknown): Record<string, any> | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const child of value) { const found = findProduct(child); if (found) return found; }
    return undefined;
  }
  const object = value as Record<string, any>;
  const type = object["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return object;
  for (const child of Object.values(object)) { const found = findProduct(child); if (found) return found; }
  return undefined;
}

function imageFrom(product?: Record<string, any>) {
  const image = product?.image;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return typeof image[0] === "string" ? image[0] : image[0]?.url;
  if (image && typeof image === "object") return image.url ?? image.contentUrl;
  return undefined;
}

function offerFrom(product?: Record<string, any>) {
  const offers = product?.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer || typeof offer !== "object") return {};
  const rawPrice = offer.price ?? offer.lowPrice ?? offer.highPrice;
  const price = rawPrice === undefined ? undefined : Number(String(rawPrice).replace(/[^0-9.,-]/g, "").replace(",", "."));
  return { price: Number.isFinite(price) ? price : undefined, currency: offer.priceCurrency };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.url !== "string") return NextResponse.json({ error: "A product URL is required." }, { status: 400 });
    const url = new URL(body.url);
    if (!["http:", "https:"].includes(url.protocol) || blockedHost(url.hostname)) return NextResponse.json({ error: "That URL is not allowed." }, { status: 400 });

    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "IRLCharacterCreator/0.1 (+product-preview; contact repository owner)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return NextResponse.json({ error: `Retailer returned HTTP ${response.status}. Enter the details manually.` }, { status: 422 });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return NextResponse.json({ error: "That URL did not return a product web page." }, { status: 422 });
    const html = (await response.text()).slice(0, 2_000_000);
    const product = jsonLdBlocks(html).map(findProduct).find(Boolean);
    const offer = offerFrom(product);
    const brand = typeof product?.brand === "string" ? product.brand : product?.brand?.name;
    const fallbackPrice = firstMeta(html, "product:price:amount") ?? firstMeta(html, "price");
    const parsedFallback = fallbackPrice ? Number(fallbackPrice.replace(/[^0-9.,-]/g, "").replace(",", ".")) : undefined;

    return NextResponse.json({
      url: response.url,
      name: product?.name ?? firstMeta(html, "og:title") ?? firstMeta(html, "twitter:title"),
      brand,
      imageUrl: imageFrom(product) ?? firstMeta(html, "og:image") ?? firstMeta(html, "twitter:image"),
      price: offer.price ?? (Number.isFinite(parsedFallback) ? parsedFallback : undefined),
      currency: offer.currency ?? firstMeta(html, "product:price:currency") ?? "CAD",
      warning: offer.price === undefined && parsedFallback === undefined ? "No machine-readable price was found. Confirm the current price manually." : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not inspect the URL." }, { status: 500 });
  }
}
