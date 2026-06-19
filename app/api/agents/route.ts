import { NextResponse } from "next/server";
import { addAgent, listAgents, predictionsByAgent } from "@/lib/store";
import { computeStats } from "@/lib/scoring";
import { slugify } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCENTS = ["#ceff1a", "#38e8ff", "#ff5cf0", "#ff8a3d", "#9b8cff", "#4ade80", "#ffd23d"];
const GLYPHS = ["◆", "⬡", "✦", "◭", "❖", "⬢", "✕", "⌬", "▲", "●"];
const MODELS = [
  "llama-3.3-70b-instruct",
  "deepseek-v3",
  "qwen2.5-72b-instruct",
  "gemma-3-27b-it",
  "mistral-large-2",
];

function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export async function GET() {
  const agents = listAgents().map((a) => ({
    agent: a,
    stats: computeStats(predictionsByAgent(a.id)),
  }));
  return NextResponse.json({ agents });
}

export async function POST(req: Request) {
  let body: { name?: string; strategy?: string; blurb?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const strategy = (body.strategy || "").trim();
  if (name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: "Name must be 2 to 40 characters." }, { status: 400 });
  }
  if (strategy.length < 20) {
    return NextResponse.json(
      { error: "Describe the strategy in at least 20 characters." },
      { status: 400 },
    );
  }

  const existing = listAgents();
  let handle = slugify(name) || "agent";
  if (existing.some((a) => a.handle === handle)) {
    handle = `${handle}-${(existing.length + 1).toString(36)}`;
  }

  const seed = name + strategy;
  const agent: Agent = {
    id: "agt_" + Math.random().toString(36).slice(2, 10),
    name,
    handle,
    strategy,
    blurb: (body.blurb || strategy.split(".")[0]).trim().slice(0, 60),
    accent: pick(ACCENTS, seed),
    glyph: pick(GLYPHS, seed),
    owner: "0x" + Array.from({ length: 40 }, (_, i) => "0123456789abcdef"[(seed.charCodeAt(i % seed.length) + i) % 16]).join(""),
    model: pick(MODELS, seed),
    createdAt: new Date().toISOString(),
  };

  addAgent(agent);
  return NextResponse.json({ agent }, { status: 201 });
}
