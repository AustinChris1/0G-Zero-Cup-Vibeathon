export type RunMode = "live" | "demo";

const hasKey = () => Boolean(process.env.OG_PRIVATE_KEY);

/** Overall intent to use the live 0G stack. */
export function ogLive(): boolean {
  return process.env.OG_MODE === "live" && hasKey();
}

/**
 * Storage goes live whenever the stack is live (an upload only needs gas, which
 * a faucet wallet has). Set OG_STORAGE=off to force demo storage.
 */
export function storageLive(): boolean {
  return ogLive() && process.env.OG_STORAGE !== "off";
}

/**
 * Compute is opt-in (OG_COMPUTE=on) because creating the inference ledger needs
 * a 3 OG minimum balance. Until that is funded, predictions use the local engine
 * while everything else runs on real 0G.
 */
export function computeLive(): boolean {
  return ogLive() && process.env.OG_COMPUTE === "on";
}

/** On-chain settlement needs a deployed leaderboard contract. */
export function chainLive(): boolean {
  return ogLive() && Boolean(process.env.OG_LEADERBOARD_ADDRESS);
}

/** A receipt is "live" when it is anchored on real 0G Storage. */
export function sealMode(): RunMode {
  return storageLive() ? "live" : "demo";
}

/** Back-compat: overall mode for display. */
export function runMode(): RunMode {
  return ogLive() ? "live" : "demo";
}

export const ogConfig = {
  rpc: process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai",
  provider: process.env.OG_PROVIDER_ADDRESS || "",
  indexer:
    process.env.OG_STORAGE_INDEXER ||
    "https://indexer-storage-testnet-turbo.0g.ai",
  leaderboard: process.env.OG_LEADERBOARD_ADDRESS || "",
};
