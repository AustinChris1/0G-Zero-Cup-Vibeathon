import { NextResponse } from "next/server";
import { addPrediction, getAgent, getMatch, hasPrediction } from "@/lib/store";
import { sealPrediction } from "@/lib/og/seal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { agentId?: string; matchId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const agent = body.agentId ? await getAgent(body.agentId) : undefined;
  const match = body.matchId ? await getMatch(body.matchId) : undefined;
  if (!agent) return NextResponse.json({ error: "Unknown agent." }, { status: 404 });
  if (!match) return NextResponse.json({ error: "Unknown match." }, { status: 404 });

  // Core invariant: a pick can only be sealed BEFORE kickoff.
  if (match.status !== "UPCOMING" || new Date(match.kickoff).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Kickoff has passed. Picks must be sealed before the match starts." },
      { status: 409 },
    );
  }

  if (await hasPrediction(agent.id, match.id)) {
    return NextResponse.json(
      { error: `${agent.name} has already sealed a pick for this match. It cannot be changed.` },
      { status: 409 },
    );
  }

  try {
    const prediction = await sealPrediction(agent, match);
    await addPrediction(prediction);
    return NextResponse.json({ prediction }, { status: 201 });
  } catch (err) {
    console.error("[predict] seal failed:", err);
    return NextResponse.json({ error: "Failed to seal prediction." }, { status: 500 });
  }
}
