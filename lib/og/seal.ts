import type { Agent, Match, Prediction } from "../types";
import { canonicalPayload, enclaveSign, hashPayload, keccakOf } from "./crypto";
import { buildStoredReceipt, serializeReceipt } from "./document";
import { demoInference, runInference, type InferenceResult } from "./compute";
import { storeReceipt, storeReceiptSync } from "./storage";
import { runMode } from "./mode";

function predictionId(agentId: string, matchId: string, createdAt: string): string {
  return "rcpt_" + keccakOf(agentId + matchId + createdAt).slice(2, 14);
}

function assemble(
  agent: Agent,
  match: Match,
  inf: InferenceResult,
  createdAt: string,
  storage: { root: string; tx: string },
  signature: string,
  signer: string,
  payloadHash: string,
  mode: "live" | "demo",
): Prediction {
  return {
    id: predictionId(agent.id, match.id, createdAt),
    agentId: agent.id,
    matchId: match.id,
    pick: inf.pick,
    probs: inf.probs,
    confidence: inf.confidence,
    reasoning: inf.reasoning,
    model: inf.model,
    request: inf.request,
    response: inf.response,
    createdAt,
    resolved: false,
    seal: {
      signature,
      signer,
      payloadHash,
      chatId: inf.chatId,
      storageRoot: storage.root,
      storageTx: storage.tx,
      sealedAt: createdAt,
      mode,
    },
  };
}

/**
 * The full seal pipeline: infer -> sign the (request+response) digest inside the
 * enclave -> write the signed receipt to 0G Storage. The order matters: nothing
 * is committed until it has been signed, and nothing is signed after the outcome.
 */
export async function sealPrediction(agent: Agent, match: Match): Promise<Prediction> {
  const createdAt = new Date().toISOString();
  const inf = await runInference(agent, match);

  const canonical = canonicalPayload({
    agentId: agent.id,
    matchId: match.id,
    model: inf.model,
    request: inf.request,
    response: inf.response,
    createdAt,
  });
  const payloadHash = hashPayload(canonical);
  const { signature, signer } = enclaveSign(payloadHash);

  const doc = buildStoredReceipt({
    agentId: agent.id,
    matchId: match.id,
    model: inf.model,
    request: inf.request,
    response: inf.response,
    pick: inf.pick,
    probs: inf.probs,
    reasoning: inf.reasoning,
    signature,
    signer,
    payloadHash,
    sealedAt: createdAt,
    mode: runMode(),
  });
  const storage = await storeReceipt(serializeReceipt(doc));

  return assemble(
    agent, match, inf, createdAt, storage, signature, signer, payloadHash, runMode(),
  );
}

/** Synchronous demo seal, used to generate the seed track records. */
export function sealPredictionSync(
  agent: Agent,
  match: Match,
  createdAt: string,
): Prediction {
  const inf = demoInference(agent, match);
  const canonical = canonicalPayload({
    agentId: agent.id,
    matchId: match.id,
    model: inf.model,
    request: inf.request,
    response: inf.response,
    createdAt,
  });
  const payloadHash = hashPayload(canonical);
  const { signature, signer } = enclaveSign(payloadHash);

  const doc = buildStoredReceipt({
    agentId: agent.id,
    matchId: match.id,
    model: inf.model,
    request: inf.request,
    response: inf.response,
    pick: inf.pick,
    probs: inf.probs,
    reasoning: inf.reasoning,
    signature,
    signer,
    payloadHash,
    sealedAt: createdAt,
    mode: "demo",
  });
  const storage = storeReceiptSync(serializeReceipt(doc));

  return assemble(
    agent, match, inf, createdAt, storage, signature, signer, payloadHash, "demo",
  );
}
