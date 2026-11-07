import { ACCEPTED_TYPES, MAX_BYTES } from "@/lib/languages";
import { OcrUpstreamError, OcrWakingError, runOcr } from "@/lib/ocr";
import { parseScaleKg } from "@/lib/scale-reading";

// A sleeping Space has to load its models before it can answer.
export const maxDuration = 60;

/** Reads a photo of the scale display with PaddleOCR on Hugging Face, and finds the weight. */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return Response.json({ error: "No image uploaded." }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.includes(image.type)) {
    return Response.json({ error: "Image must be PNG, JPEG or WebP." }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return Response.json({ error: "Image must be 4 MB or smaller." }, { status: 400 });
  }

  try {
    const lines = await runOcr(image);
    return Response.json({ lines, kg: parseScaleKg(lines) });
  } catch (error) {
    if (error instanceof OcrWakingError) {
      return Response.json(
        { error: "The OCR service is starting up. Try again in a minute.", waking: true },
        { status: 503 },
      );
    }
    const detail = error instanceof OcrUpstreamError ? error.message : "Unexpected error.";
    console.error("[ocr/scale]", error);
    return Response.json({ error: `The OCR service failed: ${detail}` }, { status: 502 });
  }
}
