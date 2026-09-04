import { NextRequest, NextResponse } from "next/server";
import { renderWithOpenAI, type RenderProductReference } from "@/lib/render/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const equipped = Object.values(body.equipment ?? {}).filter(Boolean) as RenderProductReference[];
    const itemSummary = equipped
      .map((item) => `${item.category}: ${item.brand ? `${item.brand} ` : ""}${item.name}${item.notes ? ` (${item.notes})` : ""}`)
      .join("; ");

    const renderPrompt = [
      "Create a polished real-world character-creator portrait.",
      `Character: ${body.characterName || "the character"}.`,
      `Build: ${body.buildName || "untitled"}.`,
      `Preset scene: ${body.background || "neutral studio"}.`,
      `Makeup direction: ${body.makeup || "natural"}.`,
      itemSummary ? `Equipped real-world items: ${itemSummary}.` : "No retail products are equipped yet.",
      "Preserve the uploaded person's recognizable identity, facial features, skin tone, hair characteristics, and broad body proportions.",
      "Style the final image coherently rather than making a collage.",
      "Treat product imagery as visual reference. Do not invent or sharpen brand logos, and do not imply exact garment sizing or fit.",
      "Use a tasteful full-body or three-quarter composition suitable for an IRL character customization screen.",
    ].join(" ");

    const renderingEnabled = process.env.ENABLE_IMAGE_RENDERING === "true" && Boolean(process.env.OPENAI_API_KEY);
    if (!renderingEnabled) {
      return NextResponse.json({
        status: "planned",
        prompt: renderPrompt,
        message: "Render plan ready. Add OPENAI_API_KEY and set ENABLE_IMAGE_RENDERING=true to generate the styled portrait.",
      });
    }

    if (typeof body.basePhotoDataUrl !== "string" || !body.basePhotoDataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "A base photo is required for image rendering." }, { status: 400 });
    }
    if (body.basePhotoDataUrl.length > 6_000_000) {
      return NextResponse.json({ error: "The prepared base photo is too large. Please upload a smaller image." }, { status: 413 });
    }

    const result = await renderWithOpenAI({
      basePhotoDataUrl: body.basePhotoDataUrl,
      prompt: renderPrompt,
      products: equipped,
    });

    return NextResponse.json({
      status: "completed",
      ...result,
      prompt: renderPrompt,
      message: "Character render complete.",
    });
  } catch (error) {
    console.error("render_failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Character rendering failed." },
      { status: 500 },
    );
  }
}
