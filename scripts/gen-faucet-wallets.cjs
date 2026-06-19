/**
 * Generate throwaway testnet wallets to claim faucet OG into, so you can bypass
 * the per-address daily cap and reach the 3 OG inference-ledger minimum fast.
 *
 *   node scripts/gen-faucet-wallets.cjs 8
 *
 * Writes .faucet-wallets.json (gitignored) and prints the addresses to claim to.
 * Then claim 0.5 OG to each, and run: node scripts/sweep-faucet.cjs
 */
const { ethers } = require("ethers");
const fs = require("fs");

const n = Number(process.argv[2] || 8);
const wallets = Array.from({ length: n }, () => {
  const w = ethers.Wallet.createRandom();
  return { address: w.address, privateKey: w.privateKey };
});

fs.writeFileSync(".faucet-wallets.json", JSON.stringify(wallets, null, 2));
console.log(`Generated ${n} wallets -> .faucet-wallets.json (keep this file private)\n`);
console.log("Claim faucet OG to each of these addresses:\n");
wallets.forEach((w, i) => console.log(`  ${String(i + 1).padStart(2)}. ${w.address}`));
console.log(`\nAt ~0.5 OG each, ${n} wallets gives ~${(n * 0.5).toFixed(1)} OG.`);
console.log("Then run:  node scripts/sweep-faucet.cjs");
