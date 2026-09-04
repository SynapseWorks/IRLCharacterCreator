import OpenAI from "openai";

export type RenderProductReference = {
  category?: string;
  name?: string;
  brand?: string;
  notes?: string;
  imageUrl?: string;
};

export type OpenAIRenderInput = {
  basePhotoDataUrl: string;
  prompt: string;
  products: RenderProductReference[];
};

export async function renderWithOpenAI(input: OpenAIRenderInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const client = new OpenAI({ apiKey });
  const productImages = input.products
    .filter((product) => product.imageUrl?.startsWith("http://") || product.imageUrl?.startsWith("https://"))
    .slice(0, 8)
    .map((product) => ({
      type: "input_image" as const,
      image_url: product.imageUrl!,
      detail: "high" as const,
    }));

  const response = await client.responses.create({
    model: process.env.OPENAI_RESPONSES_MODEL || "gpt-5.6-sol",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              input.prompt,
              "The first image is the identity/base-photo reference. Preserve this person's recognizable identity.",
              "Any following images are product references in the same order as the equipped product list. Use them as visual references rather than inventing exact branding details.",
            ].join(" "),
          },
          {
            type: "input_image",
            image_url: input.basePhotoDataUrl,
            detail: "high",
          },
          ...productImages,
        ],
      },
    ],
    tools: [
      {
        type: "image_generation",
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        action: "edit",
        quality: "medium",
        size: "1024x1536",
        output_format: "png",
      },
    ],
    tool_choice: { type: "image_generation" },
  });

  const imageCall = response.output.find((item) => item.type === "image_generation_call");
  if (!imageCall || !("result" in imageCall) || !imageCall.result) {
    throw new Error("The image provider completed without returning an image.");
  }

  return {
    imageDataUrl: `data:image/png;base64,${imageCall.result}`,
    provider: "openai",
    responseId: response.id,
  };
}
