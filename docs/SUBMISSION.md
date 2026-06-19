# Submission copy

Paste-ready text for the hackathon submission form. Trim to fit each field.

---

## Name
Receipts

## Tagline (one line)
An AI track record that is mathematically impossible to fake. Live on 0G.

## Elevator pitch (2 to 3 sentences)
Any AI or influencer can screenshot their wins and quietly delete their losses, so
every AI track record could be fake. Receipts fixes this: forecasting agents predict
real football matches, each pick is run through Sealed Inference on 0G Compute (signed
inside a TEE) and written to 0G Storage with a pre-kickoff timestamp, before the outcome
is known. The result is the first AI forecaster whose record anyone can audit and no one
can fake.

## The problem
AI reputation is unprovable. Output from a normal model is just text, with no proof of
who produced it or when. That makes survivorship bias free: show the wins, hide the
losses. There is no portable, un-fakeable way to know if an AI is actually any good.

## The solution / what it does
- You create a forecasting agent by describing a strategy in plain language.
- It predicts real fixtures. Each pick runs through Sealed Inference on 0G Compute, so the
  response is generated and signed inside a hardware TEE (verified live).
- The signed pick and its reasoning are written to 0G Storage and timestamped on-chain,
  before kickoff. Permanent, public, un-editable.
- After the match, every pick is scored by Brier score and a public leaderboard ranks
  agents by provable skill.
- Anyone can independently re-verify any receipt, and any attempt to alter one is rejected
  by the same verifier.

## How it uses 0G (this is the core, not a bolt-on)
The app cannot exist without 0G. Three primitives stack into one claim, and all three run
live (chain id 16602):
- **0G Compute (Sealed Inference / TEE):** predictions come from a real model
  (`qwen/qwen2.5-omni-7b`) executed in a hardware enclave; the response carries a TEE
  attestation that verifies on every call.
- **0G Storage:** every signed receipt is uploaded on-chain, content-addressed by its
  merkle root. Change one byte and the address changes.
- **0G Chain:** the storage write lands on-chain with a block timestamp, proving the pick
  was made before the result existed.

On any centralized AI stack you get none of this, so the entire thesis collapses.

## What we built on top of 0G
0G's compute SDK verifies a TEE signature within your live session but does not expose a
clean way for a third party to re-verify a saved receipt later. So Receipts owns the
transferable-proof layer: it captures the signature, signer, and exact request and
response at seal time, writes them into the stored receipt, and ships an independent
verifier that re-checks everything with no trust in our database. That is the difference
between "the platform verified it once" and "anyone can audit it forever."

## A platform, not a one-off
Receipts is competition-agnostic. It launches on the 2026 World Cup (live now), with tabs
for the Champions League, Premier League, La Liga, Serie A, Bundesliga and Ligue 1. The
World Cup is just the launch event; as each league publishes its new-season schedule, its
tab fills automatically. The reputation primitive outlives any single tournament.

## Real data, no mock
Fixtures and results come live from football-data.org. There is no fabricated bracket and
no fake track record: every match is real and every pick is a real, TEE-sealed, on-chain
receipt. The leaderboard fills with settled results as real matches are played during the
tournament.

## Demo flow
Create an agent, seal a real pick (watch it run through 0G Compute, the enclave, 0G
Storage and the chain), open the agent's full public record, verify a receipt, then try to
forge one and watch the proof reject it.

## Tech stack
Next.js (App Router), TypeScript, TailwindCSS, Framer Motion, ethers. 0G Compute
(`@0glabs/0g-serving-broker`), 0G Storage (`@0gfoundation/0g-ts-sdk`), 0G Chain.
football-data.org for live fixtures. Solidity leaderboard contract for on-chain settlement.

## What's next
- Seal with the raw TEE chat signature (the SDK now exposes it) for fully provider-native proofs.
- Mint top agents as ERC-7857 iNFTs so a proven forecaster becomes a tradeable asset.
- Head-to-head challenge mode: two agents, same match, escrow-staked, settled on chain.

## Run it
`npm install && npm run dev` boots a self-contained demo with real cryptographic proofs.
With 0G testnet keys (`OG_MODE=live`, `OG_COMPUTE=on`) it runs the real 0G stack, and with
a football-data.org token it pulls real fixtures. See README and docs/DEPLOY.md.

## Links (fill in)
- Live demo:
- Video:
- Repo:
- Team / contact:
