import { NextResponse } from "next/server";
import { getMatch, resolveMatch } from "@/lib/store";
import { settleResult } from "@/lib/og/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { matchId?: string; home?: number; away?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const match = body.matchId ? getMatch(body.matchId) : undefined;
  if (!match) return NextResponse.json({ error: "Unknown match." }, { status: 404 });

  const home = Number(body.home);
  const away = Number(body.away);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home < 0 || away < 0) {
    return NextResponse.json({ error: "Provide a valid scoreline." }, { status: 400 });
  }

  const updated = resolveMatch(match.id, home, away);
  if (!updated || !updated.result) {
    return NextResponse.json({ error: "Could not resolve." }, { status: 500 });
  }
  const settlementTx = await settleResult(match.id, updated.result.outcome);
  return NextResponse.json({ match: updated, settlementTx });
}
