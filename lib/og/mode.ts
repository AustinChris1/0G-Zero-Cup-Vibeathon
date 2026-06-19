export type RunMode = "live" | "demo";

/**
 * Live mode requires an explicit opt-in plus a funded key. Anything short of
 * that stays in the self-contained demo runtime so the app always boots.
 */
export function runMode(): RunMode {
  if (process.env.OG_MODE === "live" && process.env.OG_PRIVATE_KEY) {
    return "live";
  }
  return "demo";
}

export const ogConfig = {
  rpc: process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai",
  provider: process.env.OG_PROVIDER_ADDRESS || "",
  indexer:
    process.env.OG_STORAGE_INDEXER ||
    "https://indexer-storage-testnet-turbo.0g.ai",
  leaderboard: process.env.OG_LEADERBOARD_ADDRESS || "",
};
