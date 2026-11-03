import type { BootstrapData, Listing } from "./types";

export type Source = { title: string; url: string; note: string };

export type AiReply = {
  reasoning?: string[];
  tool?: { name: string; input: string; output: string };
  plan?: { label: string; detail?: string; status: "done" | "active" | "pending" }[];
  content: string;
  sources?: Source[];
};

export const aiPrompts = [
  "Which pantry has the most grounds ready?",
  "Find 20 kg for a community garden",
  "How much CO₂e have we avoided this term?",
  "Schedule a pickup from SCIS tomorrow",
];

const fmtKg = (n: number) => `${n.toFixed(1)} kg`;

function availableListings(data: BootstrapData): Listing[] {
  return data.listings
    .filter((listing) => !listing.claimed)
    .sort((a, b) => b.weightKg - a.weightKg);
}

function metricValue(data: BootstrapData, key: string): string {
  return data.metrics.find((metric) => metric.key === key)?.value ?? "—";
}

export function getAiReply(prompt: string, data: BootstrapData): AiReply {
  const p = prompt.toLowerCase();
  const available = availableListings(data);
  const rankedBins = [...data.bins].sort((a, b) => b.weightKg - a.weightKg);
  const top = rankedBins[0];
  const latestAt = data.events[0]?.at;
  const liveAge = latestAt
    ? `${Math.max(1, Math.round((Date.now() - Date.parse(latestAt)) / 60_000))} min ago`
    : "no events yet";
  const sources = {
    live: {
      title: "Live bin telemetry",
      url: "/dashboard",
      note: `Latest audit event ${liveAge}`,
    },
    marketplace: {
      title: "Grounds marketplace",
      url: "/marketplace",
      note: `${available.length} batch${available.length === 1 ? "" : "es"} available`,
    },
    methodology: {
      title: "Impact methodology v2.1",
      url: "/#about",
      note: "OCIS sustainability reporting",
    },
  };

  if (!top) {
    return {
      reasoning: ["The live bootstrap data has no bins yet."],
      content:
        "I can't see any bin telemetry yet. Start the demo database and run the seed script, then ask me again.",
      sources: [sources.live],
    };
  }

  const topPct = Math.round((top.weightKg / top.capacityKg) * 100);

  if (p.includes("most") || p.includes("ready") || p.includes("which pantry")) {
    const second = rankedBins[1];
    return {
      reasoning: [
        `Checked fill levels from all ${data.bins.length} smart bins.`,
        `Ranked by kilograms available; ${top.short} is highest at ${topPct}% of capacity.`,
      ],
      tool: {
        name: "query_bins",
        input: `{ "order_by": "weight_kg", "bins": ${data.bins.length} }`,
        output: `${top.id} · ${fmtKg(top.weightKg)} · ${topPct}% full`,
      },
      content:
        `The **${top.name} (${top.short})** has the most grounds ready right now: **${fmtKg(
          top.weightKg
        )}**, at ${topPct}% of its ${top.capacityKg} kg capacity (${top.pantry}).` +
        (second
          ? `\n\n${second.short} is next at **${fmtKg(second.weightKg)}** (${Math.round(
              (second.weightKg / second.capacityKg) * 100
            )}% full).`
          : "") +
        "\n\nUse the dashboard to collect it, or ask me to find a match for the next batch.",
      sources: [sources.live, sources.marketplace],
    };
  }

  if (p.includes("20 kg") || p.includes("20kg") || p.includes("garden") || p.includes("match")) {
    const need = 20;
    const picked: Listing[] = [];
    let total = 0;
    for (const listing of available) {
      if (total >= need) break;
      picked.push(listing);
      total += listing.weightKg;
    }
    if (!picked.length) {
      return {
        reasoning: ["Searched the live marketplace for unclaimed batches."],
        content:
          "There are no unclaimed batches on the marketplace right now. Check the dashboard for bins that are nearly full and due for collection.",
        sources: [sources.marketplace, sources.live],
      };
    }
    const lines = picked
      .map(
        (listing) =>
          `- **${listing.building}** — ${fmtKg(listing.weightKg)} ${listing.type.toLowerCase()}, pickup ${listing.pickup}`
      )
      .join("\n");
    return {
      reasoning: [
        "Searched the live marketplace for unclaimed batches.",
        `Sorted by weight and took ${picked.length} batch${
          picked.length === 1 ? "" : "es"
        } to reach the ${need} kg request.`,
      ],
      tool: {
        name: "match_grounds",
        input: `{ "need_kg": ${need}, "available_batches": ${available.length} }`,
        output: `${picked.length} batches · ${fmtKg(total)} selected`,
      },
      plan: [
        { label: "Shortlist available batches", status: "done", detail: `${picked.length} batches` },
        { label: "Reserve the selected batches", status: "active", detail: fmtKg(total) },
        { label: "Arrange pickup", status: "pending" },
        { label: "Confirm with the garden", status: "pending" },
      ],
      content:
        `I found ${picked.length} available batch${picked.length === 1 ? "" : "es"} totalling **${fmtKg(
          total
        )}**` +
        (total < need ? ` — ${fmtKg(need - total)} short of ${need} kg.` : ` — enough for ${need} kg.`) +
        `\n\n${lines}\n\nWant me to reserve them and draft a pickup plan?`,
      sources: [sources.marketplace, sources.live],
    };
  }

  if (p.includes("co2") || p.includes("co₂") || p.includes("avoid") || p.includes("emission")) {
    return {
      reasoning: [
        "Pulled the programme-to-date figures from the live metrics table.",
        "Applied the OCIS v2.1 reporting definitions.",
      ],
      tool: {
        name: "impact_report",
        input: '{ "period": "programme", "metrics": ["co2", "collected", "diverted"] }',
        output: `${metricValue(data, "co2")} CO₂e · ${metricValue(
          data,
          "collected"
        )} collected · ${metricValue(data, "diverted")} diverted`,
      },
      content:
        `Since launch SMU has collected **${metricValue(data, "collected")}** of spent coffee grounds and avoided **${metricValue(
          data,
          "co2"
        )} CO₂e**. The diversion rate is **${metricValue(data, "diverted")}** of grounds kept out of incineration.` +
        "\n\nThe figures are reported under the OCIS v2.1 methodology and reconciled against the monthly report.",
      sources: [sources.methodology, sources.live],
    };
  }

  if (p.includes("schedule") || p.includes("pickup") || p.includes("pick up")) {
    const requested = p.includes("scis")
      ? data.bins.find((bin) => bin.short.toLowerCase() === "scis") ?? top
      : top;
    const pct = Math.round((requested.weightKg / requested.capacityKg) * 100);
    return {
      reasoning: [
        `Checked the live bin weights and chose ${requested.short} (${pct}% full).`,
        "The prototype cannot dispatch facilities, so it surfaces the next action instead.",
      ],
      tool: {
        name: "collection_queue",
        input: `{ "bin": "${requested.id}", "min_fill": 70 }`,
        output: `${requested.id} · ${fmtKg(requested.weightKg)} · ${pct}% full`,
      },
      content:
        `**${requested.name} (${requested.short})** is the bin to collect at **${fmtKg(
          requested.weightKg
        )}** (${pct}% of ${requested.capacityKg} kg).\n\nThis prototype can't send a real facilities request yet — open the dashboard and use **Collect** on that bin to log the pickup and add it to the audit trail.`,
      sources: [sources.live],
    };
  }

  const availableKg = available.reduce((sum, listing) => sum + listing.weightKg, 0);
  return {
    reasoning: [
      "Read the live bin, marketplace and reporting data.",
      "Summarised the most useful actions for today.",
    ],
    content:
      `Here's what stands out today:\n\n` +
      `- **${fmtKg(top.weightKg)}** is ready at **${top.name}** (${topPct}% of capacity).\n` +
      `- The marketplace has **${available.length} unclaimed batch${
        available.length === 1 ? "" : "es"
      }** totalling **${fmtKg(availableKg)}**.\n` +
      `- Diversion is at **${metricValue(data, "diverted")}** of grounds kept from incineration.\n\n` +
      "Ask me to find a match, explain the impact numbers or show the next collection.",
    sources: [sources.live, sources.marketplace, sources.methodology],
  };
}
