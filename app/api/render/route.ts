import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const equipped = Object.values(body.equipment ?? {}).filter(Boolean) as Array<{ category?: string; name?: string; brand?: string; notes?: string }>;
  const itemSummary = equipped.map((item) => `${item.category}: ${item.brand ? `${item.brand} ` : ""}${item.name}`).join("; ");

  const renderPrompt = [
    `Preserve the uploaded person's identity and recognizable features.`,
    `Create a polished full-body or three-quarter IRL character-creator portrait for ${body.characterName || "the character"}.`,
    `Build: ${body.buildName || "untitled"}.`,
    `Preset scene: ${body.background || "neutral studio"}.`,
    `Makeup direction: ${body.makeup || "natural"}.`,
    itemSummary ? `Equipped real-world items: ${itemSummary}.` : "No products equipped yet.",
    `Treat product imagery as visual reference; do not invent logos or claim exact garment fit.`,
  ].join(" ");

  const renderingEnabled = process.env.ENABLE_IMAGE_RENDERING === "true" && Boolean(process.env.OPENAI_API_KEY);

  return NextResponse.json({
    status: renderingEnabled ? "provider-not-wired" : "planned",
    prompt: renderPrompt,
    message: renderingEnabled
      ? "Image credentials are present. The next implementation step is wiring the provider adapter to upload the base photo and product references."
      : "Render plan ready. V0 is currently showing the interactive build; add the image provider integration to turn this plan into the styled portrait.",
  });
}
