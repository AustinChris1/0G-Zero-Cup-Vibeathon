import { NextResponse } from "next/server";
import { getMatch, getPrediction } from "@/lib/store";
import { verifyPrediction } from "@/lib/og/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { predictionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prediction = body.predictionId ? getPrediction(body.predictionId) : undefined;
  if (!prediction) {
    return NextResponse.json({ error: "Unknown prediction." }, { status: 404 });
  }

  const match = getMatch(prediction.matchId);
  const result = await verifyPrediction(prediction, match);
  return NextResponse.json({ result });
}
