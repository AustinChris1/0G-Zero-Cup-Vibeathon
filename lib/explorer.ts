// 0G Galileo testnet explorers (public). Used for one-click on-chain verification.
export const CHAIN_EXPLORER = "https://chainscan-galileo.0g.ai";
export const STORAGE_EXPLORER = "https://storagescan-galileo.0g.ai";

export const txUrl = (hash: string) => `${CHAIN_EXPLORER}/tx/${hash}`;
export const addressUrl = (addr: string) => `${CHAIN_EXPLORER}/address/${addr}`;
export const storageUrl = () => `${STORAGE_EXPLORER}/`;
