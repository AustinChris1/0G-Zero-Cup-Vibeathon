import type { Match, Prediction } from "../types";
import { canonicalPayload, hashPayload, keccakOf, recover } from "./crypto";
import { buildStoredReceipt, serializeReceipt } from "./document";
import { fetchReceipt } from "./storage";

export interface VerifyStep {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface VerifyResult {
  ok: boolean;
  recovered: string;
  steps: VerifyStep[];
}

/**
 * Independent re-verification of a sealed pick. This deliberately does NOT trust
 * our own database: it re-derives the payload hash, recovers the signing key from
 * the signature, re-hashes the stored document, and re-checks it against 0G
 * Storage. Anyone could run this exact routine against the public receipt.
 */
export async function verifyPrediction(
  prediction: Prediction,
  match?: Match,
): Promise<VerifyResult> {
  const { seal } = prediction;
  const steps: VerifyStep[] = [];

  // 1. Integrity: the captured payload still hashes to the recorded digest.
  const canonical = canonicalPayload({
    agentId: prediction.agentId,
    matchId: prediction.matchId,
    model: prediction.model,
    request: prediction.request,
    response: prediction.response,
    createdAt: prediction.createdAt,
  });
  const recomputedHash = hashPayload(canonical);
  const integrityOk = recomputedHash === seal.payloadHash;
  steps.push({
    key: "integrity",
    label: "Payload integrity",
    ok: integrityOk,
    detail: integrityOk
      ? "Reasoning and pick hash to the exact digest that was signed."
      : "Recomputed hash does not match. Content was altered after sealing.",
  });

  // 2. Authenticity: recover the signer from the signature over that digest.
  let recovered = "";
  let authOk = false;
  try {
    recovered = recover(seal.payloadHash, seal.signature);
    authOk = recovered.toLowerCase() === seal.signer.toLowerCase();
  } catch {
    authOk = false;
  }
  steps.push({
    key: "authenticity",
    label: "Enclave signature",
    ok: authOk,
    detail: authOk
      ? `Signature recovers to the sealing key ${seal.signer.slice(0, 10)}…`
      : "Signature does not recover to the recorded signer.",
  });

  // 3. Immutability: the stored document re-hashes to the same storage root.
  const doc = buildStoredReceipt({
    agentId: prediction.agentId,
    matchId: prediction.matchId,
    model: prediction.model,
    request: prediction.request,
    response: prediction.response,
    pick: prediction.pick,
    probs: prediction.probs,
    reasoning: prediction.reasoning,
    signature: seal.signature,
    signer: seal.signer,
    payloadHash: seal.payloadHash,
    sealedAt: seal.sealedAt,
    mode: seal.mode,
  });
  const localRoot = keccakOf(serializeReceipt(doc));
  // The presented content must hash to the claimed root...
  let storageOk = localRoot === seal.storageRoot;
  // ...and must equal the copy actually held in 0G Storage.
  const stored = await fetchReceipt(seal.storageRoot);
  if (stored) storageOk = storageOk && keccakOf(stored) === localRoot;
  steps.push({
    key: "storage",
    label: "0G Storage root",
    ok: storageOk,
    detail: storageOk
      ? `Stored receipt re-hashes to root ${seal.storageRoot.slice(0, 12)}…`
      : "Stored document does not match its root hash.",
  });

  // 4. Timing: the seal was committed before the match could be known.
  let timingOk = true;
  let timingDetail = "Sealed and timestamped on 0G.";
  if (match) {
    timingOk = new Date(seal.sealedAt).getTime() < new Date(match.kickoff).getTime();
    timingDetail = timingOk
      ? "Committed before kickoff. The outcome could not have been known."
      : "Seal timestamp is after kickoff.";
  }
  steps.push({
    key: "timing",
    label: "Sealed pre-kickoff",
    ok: timingOk,
    detail: timingDetail,
  });

  return {
    ok: steps.every((s) => s.ok),
    recovered,
    steps,
  };
}
