import type { Outcome, Probabilities } from "../types";

/**
 * The exact bytes written to 0G Storage for a sealed pick. Anyone can download
 * this by its root hash and re-derive every proof in it with no access to our
 * database. Field order is fixed so the serialization is deterministic.
 */
export interface StoredReceipt {
  v: number;
  agentId: string;
  matchId: string;
  model: string;
  request: string;
  response: string;
  pick: Outcome;
  probs: Probabilities;
  reasoning: string;
  signature: string;
  signer: string;
  payloadHash: string;
  sealedAt: string;
  mode: "live" | "demo";
}

export function buildStoredReceipt(input: Omit<StoredReceipt, "v">): StoredReceipt {
  return {
    v: 1,
    agentId: input.agentId,
    matchId: input.matchId,
    model: input.model,
    request: input.request,
    response: input.response,
    pick: input.pick,
    probs: input.probs,
    reasoning: input.reasoning,
    signature: input.signature,
    signer: input.signer,
    payloadHash: input.payloadHash,
    sealedAt: input.sealedAt,
    mode: input.mode,
  };
}

export function serializeReceipt(doc: StoredReceipt): string {
  return JSON.stringify(doc);
}
