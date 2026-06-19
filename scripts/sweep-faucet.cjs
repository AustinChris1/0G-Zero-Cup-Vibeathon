/**
 * Sweep every wallet in .faucet-wallets.json into the main spike wallet
 * (the address derived from OG_PRIVATE_KEY in .env). Each transfer pays its own
 * gas, so the target ends up with ~sum(balances) minus a little gas.
 *
 *   node scripts/sweep-faucet.cjs
 */
const { ethers } = require("ethers");
const fs = require("fs");

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL);
  const target = new ethers.Wallet(process.env.OG_PRIVATE_KEY, provider).address;
  console.log("sweeping into:", target, "\n");

  const wallets = JSON.parse(fs.readFileSync(".faucet-wallets.json", "utf8"));
  const fee = await provider.getFeeData();
  const unit = fee.maxFeePerGas ?? fee.gasPrice;
  const gasLimit = 21000n;
  const reserve = gasLimit * unit * 2n; // gas cost + margin

  let total = 0n;
  for (const w of wallets) {
    const wallet = new ethers.Wallet(w.privateKey, provider);
    const bal = await provider.getBalance(w.address);
    if (bal <= reserve) {
      console.log(`${w.address}  ${ethers.formatEther(bal)} OG  (skip, not funded)`);
      continue;
    }
    const value = bal - reserve;
    const opts = fee.maxFeePerGas
      ? { maxFeePerGas: fee.maxFeePerGas, maxPriorityFeePerGas: fee.maxPriorityFeePerGas, gasLimit }
      : { gasPrice: fee.gasPrice, gasLimit };
    try {
      const tx = await wallet.sendTransaction({ to: target, value, ...opts });
      await tx.wait();
      total += value;
      console.log(`${w.address}  sent ${ethers.formatEther(value)} OG  tx ${tx.hash.slice(0, 16)}…`);
    } catch (e) {
      console.log(`${w.address}  ERR ${String(e.message).slice(0, 80)}`);
    }
  }

  const finalBal = await provider.getBalance(target);
  console.log(`\nSwept ~${ethers.formatEther(total)} OG.`);
  console.log(`Target balance now: ${ethers.formatEther(finalBal)} OG`);
  console.log(
    finalBal >= ethers.parseEther("3")
      ? "\n>= 3 OG. Set OG_COMPUTE=on in .env and you are ready for live Sealed Inference."
      : "\nStill under 3 OG. Claim a few more addresses and run this again.",
  );
})().catch((e) => console.log("FATAL:", e.message));
