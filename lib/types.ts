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
  source?: EventSource | null;
  beforeKg?: number | null;
  afterKg?: number | null;
  photo?: string | null;
};

export type NewsItem = {
  id: string;
  title: string;
  tag: string;
  publishedAt: string;
  image: string;
  href: string;
};

export type ProgrammeEvent = {
  id: string;
  title: string;
  eventDate: string;
  venue: string;
  description: string;
  image: string;
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
  news: NewsItem[];
  programmeEvents: ProgrammeEvent[];
  metrics: ProgrammeMetric[];
};
