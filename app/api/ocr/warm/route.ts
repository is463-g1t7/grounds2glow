import { warmOcr } from "@/lib/ocr";

export const maxDuration = 30;

/** Starts waking the OCR Space early, so it's ready by the time a cleaner weighs a bin. */
export async function POST() {
  return Response.json(await warmOcr());
}
