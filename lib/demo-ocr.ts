import type { Lang, OcrLine } from "./languages";

type Size = { width: number; height: number };

const documentText: Record<Lang, string[]> = {
  en: [
    "SINGAPORE MANAGEMENT UNIVERSITY",
    "Circular Coffee Programme",
    "Smart Bin Collection Log",
    "Building: SCIS · Level 4",
    "Weight: 4.20 kg",
    "Operator: SMU-CLN-0217",
  ],
  ch: [
    "新加坡管理大学",
    "咖啡渣循环计划",
    "智能回收箱记录",
    "地点：SCIS · 4楼",
    "重量：4.20 公斤",
    "操作员：SMU-CLN-0217",
  ],
  fr: [
    "SINGAPORE MANAGEMENT UNIVERSITY",
    "Programme café circulaire",
    "Registre de collecte",
    "Bâtiment : SCIS · Niveau 4",
    "Poids : 4,20 kg",
    "Opérateur : SMU-CLN-0217",
  ],
  german: [
    "SINGAPORE MANAGEMENT UNIVERSITY",
    "Kreislauf-Kaffeeprogramm",
    "Sammelprotokoll",
    "Gebäude: SCIS · Ebene 4",
    "Gewicht: 4,20 kg",
    "Bediener: SMU-CLN-0217",
  ],
  korean: [
    "싱가포르 경영대학교",
    "커피 재순환 프로그램",
    "스마트 수거함 기록",
    "건물: SCIS · 4층",
    "무게: 4.20 kg",
    "담당자: SMU-CLN-0217",
  ],
  japan: [
    "シンガポール経営大学",
    "コーヒー循環プログラム",
    "スマートビン回収記録",
    "建物：SCIS・4階",
    "重量：4.20 kg",
    "担当：SMU-CLN-0217",
  ],
};

function box(x: number, y: number, w: number, h: number, size: Size): [number, number][] {
  return [
    [Math.round(x * size.width), Math.round(y * size.height)],
    [Math.round((x + w) * size.width), Math.round(y * size.height)],
    [Math.round((x + w) * size.width), Math.round((y + h) * size.height)],
    [Math.round(x * size.width), Math.round((y + h) * size.height)],
  ];
}

export function demoDocumentLines(lang: Lang, size: Size): OcrLine[] {
  const lines = documentText[lang] ?? documentText.en;
  return lines.map((text, i) => ({
    text,
    box: box(0.09, 0.12 + i * 0.115, i === 0 ? 0.52 : 0.42, 0.07, size),
  }));
}

export function demoScaleLines(kg: number, size: Size): OcrLine[] {
  return [
    { text: `${kg.toFixed(2)} kg`, box: box(0.42, 0.11, 0.16, 0.13, size) },
    { text: "SMU SMART BIN", box: box(0.33, 0.39, 0.34, 0.05, size) },
    { text: "SCALE · 2 kg", box: box(0.37, 0.47, 0.25, 0.04, size) },
  ];
}

export type DemoOcrResult = { lines: OcrLine[]; kg?: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Static demo OCR: keeps the upload/overlay/scale flows working without a server. */
export async function runDemoOcr(input: {
  kind: "document" | "scale";
  lang?: Lang;
  size: Size;
  kg?: number;
  delayMs?: number;
}): Promise<DemoOcrResult> {
  await sleep(input.delayMs ?? 850);
  if (input.kind === "scale") {
    const kg = input.kg ?? 4.2;
    return { lines: demoScaleLines(kg, input.size), kg };
  }
  return { lines: demoDocumentLines(input.lang ?? "en", input.size) };
}
