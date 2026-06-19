import { keccak256, toUtf8Bytes, Wallet, recoverAddress } from "ethers";

/**
 * Deterministic demo "enclave" signer. In live mode the signature comes from a
 * real 0G TEE provider key instead, but the verification math below is the same
 * elliptic-curve recovery either way. This is the load-bearing primitive: a
 * sealed pick cannot be altered without invalidating its signature.
 *
 * The fallback key is a well-known throwaway dev key. Override in production
 * demos with DEMO_ENCLAVE_KEY so receipts stay verifiable across restarts.
 */
const DEMO_ENCLAVE_KEY =
  process.env.DEMO_ENCLAVE_KEY ||
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

let _enclave: Wallet | null = null;
function enclave(): Wallet {
  if (!_enclave) _enclave = new Wallet(DEMO_ENCLAVE_KEY);
  return _enclave;
}

export interface PayloadParts {
  agentId: string;
  matchId: string;
  model: string;
  request: string;
  response: string;
  createdAt: string;
}

/** Stable, canonical serialization so the same inputs always hash identically. */
export function canonicalPayload(parts: PayloadParts): string {
  return JSON.stringify({
    v: 1,
    agentId: parts.agentId,
    matchId: parts.matchId,
    model: parts.model,
    request: parts.request,
    response: parts.response,
    createdAt: parts.createdAt,
  });
}

export function hashPayload(canonical: string): string {
  return keccak256(toUtf8Bytes(canonical));
}

export function keccakOf(content: string): string {
  return keccak256(toUtf8Bytes(content));
}

/** Sign a 32-byte digest with the demo enclave key (synchronous, raw ECDSA). */
export function enclaveSign(payloadHash: string): { signature: string; signer: string } {
  const w = enclave();
  const sig = w.signingKey.sign(payloadHash);
  return { signature: sig.serialized, signer: w.address };
}

/** Recover the address that produced a signature over a digest. */
export function recover(payloadHash: string, signature: string): string {
  return recoverAddress(payloadHash, signature);
}

export function demoTxHash(seed: string): string {
  return keccak256(toUtf8Bytes(`tx:${seed}`));
}
