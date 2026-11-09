export type BinStatus = "ok" | "near" | "full";

export type Bin = {
  id: string;
  short: string;
  name: string;
  pantry: string;
  weightKg: number;
  capacityKg: number;
  levels: number;
  updatedAt: string;
};

export type Cleaner = {
  id: string;
  name: string;
  initials: string;
  pass: string;
  shift: "AM" | "PM";
  vendor: string;
};

/** Who a scanned barcode belongs to. */
export type BarcodeMatch = {
  cleaner: Pick<Cleaner, "id" | "name" | "pass">;
  name: string;
};

export type EventSource = "ocr" | "reference" | "manual" | "demo";

export type BinEvent = {
  id: string;
  at: string;
  binId: string;
  level?: number | null;
  pantry?: string | null;
  type: "deposit" | "collect";
  kg: number;
  cleanerId?: string | null;
  /** Who took a collected bin away to be repurposed. Only set on collect events. */
  collectedBy?: string | null;
  source?: EventSource | null;
  beforeKg?: number | null;
  afterKg?: number | null;
  photo?: string | null;
};

export type ProgrammeMetric = {
  key: string;
  value: string;
  label: string;
  detail: string;
  tone: "gold" | "navy" | "success";
};

export type BootstrapData = {
  bins: Bin[];
  events: BinEvent[];
  cleaners: Cleaner[];
  metrics: ProgrammeMetric[];
  /** When this snapshot was read from Postgres (not when the browser fetched it). */
  updatedAt?: string;
};
