import { keccakOf } from "./crypto";
import { runMode, ogConfig } from "./mode";

/**
 * On-chain settlement of a resolved match. In live mode this would write the
 * scored outcome to the Leaderboard contract on 0G Chain (see contracts/).
 * In demo mode we return a deterministic settlement hash so the UI can show the
 * trustless leg of the flow end to end.
 */
export async function settleResult(
  matchId: string,
  outcome: string,
): Promise<string> {
  if (runMode() === "live" && ogConfig.leaderboard) {
    try {
      return await pushOnChain(matchId, outcome);
    } catch (err) {
      console.error("[0G Chain] settlement failed, falling back:", err);
    }
  }
  return keccakOf(`settle:${matchId}:${outcome}`);
}

export function settlementTx(matchId: string, outcome: string): string {
  return keccakOf(`settle:${matchId}:${outcome}`);
}

async function pushOnChain(matchId: string, outcome: string): Promise<string> {
  const { ethers }: any = await import("ethers");
  const provider = new ethers.JsonRpcProvider(ogConfig.rpc);
  const signer = new ethers.Wallet(process.env.OG_PRIVATE_KEY as string, provider);
  const abi = [
    "function recordResult(string matchId, string outcome) external returns (bool)",
  ];
  const contract = new ethers.Contract(ogConfig.leaderboard, abi, signer);
  const tx = await contract.recordResult(matchId, outcome);
  await tx.wait();
  return tx.hash;
}
