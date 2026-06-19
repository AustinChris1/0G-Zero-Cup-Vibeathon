import { keccakOf, demoTxHash } from "./crypto";
import { runMode, ogConfig } from "./mode";
import { putBlob, getBlob } from "../store";

export interface StorageWrite {
  root: string;
  tx: string;
}

/**
 * Write a sealed receipt to 0G Storage. Returns the merkle root (the permanent,
 * content-addressed identifier) and the on-chain transaction hash whose block
 * timestamp is the immutable proof of WHEN this was committed.
 *
 * Demo mode mirrors the exact shape: a keccak content root and a derived tx
 * hash, with the blob persisted locally so it can be downloaded and re-verified.
 */
export async function storeReceipt(content: string): Promise<StorageWrite> {
  const root = keccakOf(content);

  if (runMode() === "live") {
    try {
      const tx = await liveUpload(content, root);
      putBlob(root, content);
      return { root, tx };
    } catch (err) {
      console.error("[0G Storage] live upload failed, falling back:", err);
    }
  }

  putBlob(root, content);
  return { root, tx: demoTxHash(root) };
}

/** Synchronous demo write, used by seeding so it stays simple and deterministic. */
export function storeReceiptSync(content: string): StorageWrite {
  const root = keccakOf(content);
  putBlob(root, content);
  return { root, tx: demoTxHash(root) };
}

export async function fetchReceipt(root: string): Promise<string | null> {
  const local = getBlob(root);
  if (local) return local;

  if (runMode() === "live") {
    try {
      return await liveDownload(root);
    } catch (err) {
      console.error("[0G Storage] live download failed:", err);
    }
  }
  return null;
}

/* --------------------------- live 0G Storage --------------------------- */

async function liveUpload(content: string, _root: string): Promise<string> {
  // Loaded lazily so the base app installs without the optional SDK.
  // @ts-ignore optional dependency, only installed for live mode
  const sdk: any = await import("@0gfoundation/0g-ts-sdk").catch(() => null);
  const { ethers }: any = await import("ethers");
  if (!sdk) throw new Error("0g-ts-sdk not installed");

  const provider = new ethers.JsonRpcProvider(ogConfig.rpc);
  const signer = new ethers.Wallet(process.env.OG_PRIVATE_KEY as string, provider);
  const indexer = new sdk.Indexer(ogConfig.indexer);

  const data = new TextEncoder().encode(content);
  const file = new sdk.MemData(data);
  const [tree, treeErr] = await file.merkleTree();
  if (treeErr) throw treeErr;

  const [tx, err] = await indexer.upload(file, ogConfig.rpc, signer);
  if (err) throw err;
  return typeof tx === "string" ? tx : tx?.txHash ?? tree?.rootHash() ?? "0x";
}

async function liveDownload(root: string): Promise<string | null> {
  // @ts-ignore optional dependency, only installed for live mode
  const sdk: any = await import("@0gfoundation/0g-ts-sdk").catch(() => null);
  if (!sdk) return null;
  const indexer = new sdk.Indexer(ogConfig.indexer);
  const tmp = `./.data/dl-${root.slice(2, 14)}.json`;
  const err = await indexer.download(root, tmp, true);
  if (err) throw err;
  const fs = await import("fs/promises");
  const content = await fs.readFile(tmp, "utf8").catch(() => null);
  await fs.unlink(tmp).catch(() => {});
  return content;
}
