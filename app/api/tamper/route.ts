import { NextResponse } from "next/server";
import { getMatch, getPrediction } from "@/lib/store";
import { verifyPrediction } from "@/lib/og/verify";
import { canonicalPayload, hashPayload } from "@/lib/og/crypto";
import type { Outcome, Prediction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The proof, made visceral. We take a real sealed pick, secretly rewrite its
 * outcome, and run the exact same independent verifier. It fails, because the
 * altered content no longer hashes to the signed digest. You cannot fake a
 * receipt after the fact.
 */
export async function POST(req: Request) {
  let body: { predictionId?: string; newPick?: Outcome };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const original = body.predictionId ? await getPrediction(body.predictionId) : undefined;
  if (!original) return NextResponse.json({ error: "Unknown prediction." }, { status: 404 });

  const flipped: Outcome =
    body.newPick && body.newPick !== original.pick
      ? body.newPick
      : original.pick === "HOME"
        ? "AWAY"
        : "HOME";

  // Forge a tampered copy: change the pick and reasoning, keep the original seal.
  // Modify the raw response as a string (it may be markdown-fenced JSON from a
  // live model, so do not assume it parses).
  const tampered: Prediction = {
    ...original,
    pick: flipped,
    reasoning: original.reasoning.replace(/\b\d{1,3}%/, "99%") + " [edited after the fact]",
    response: `${original.response}\n[forged: pick changed to ${flipped}]`,
  };

  // Play the sophisticated forger: recompute the digest so the content matches
  // its fingerprint. The seal's signature was made over the original digest, so
  // it can no longer recover to the signer. There is no enclave key to re-sign.
  const forgedHash = hashPayload(
    canonicalPayload({
      agentId: tampered.agentId,
      matchId: tampered.matchId,
      model: tampered.model,
      request: tampered.request,
      response: tampered.response,
      createdAt: tampered.createdAt,
    }),
  );
  tampered.seal = { ...tampered.seal, payloadHash: forgedHash };

  const match = await getMatch(original.matchId);
  const result = await verifyPrediction(tampered, match);
  return NextResponse.json({ result, attemptedPick: flipped });
}
