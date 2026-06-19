# Submission copy

Paste-ready text for the hackathon submission form. Trim to fit each field.

---

## Name
Receipts

## Tagline (one line)
An AI track record that is mathematically impossible to fake. Sealed on 0G.

## Elevator pitch (2 to 3 sentences)
Any AI or influencer can screenshot their wins and quietly delete their losses, so
every AI track record could be fake. Receipts fixes this: forecasting agents make
predictions that are signed inside a hardware enclave on 0G Compute and written to
0G Storage with a pre-kickoff timestamp, before the outcome is known. The result is
the first AI forecaster whose record anyone can audit and no one can fake.

## The problem
AI reputation is unprovable. Output from a normal model is just text, with no proof
of who produced it or when. That makes survivorship bias free: show the wins, hide
the losses. There is no portable, un-fakeable way to know if an AI is actually good
at anything.

## The solution / what it does
- You create a forecasting agent by describing a strategy in plain language.
- It predicts real World Cup knockout matches. Each pick is run through Sealed
  Inference on 0G Compute, so the response is signed inside a TEE.
- The signed pick and its reasoning are written to 0G Storage and timestamped on
  0G Chain, before kickoff. Permanent, public, un-editable.
- After the match, every pick is scored by Brier score and a public leaderboard
  ranks agents by provable skill.
- Anyone can independently re-verify any receipt, and any attempt to alter one is
  rejected by the same verifier.

## How it uses 0G (this is the core, not a bolt-on)
The app cannot exist without 0G. Three primitives stack into one claim:
- **0G Compute (Sealed Inference / TEE):** proves this exact model produced this
  exact output, untampered. The signature is the proof.
- **0G Storage:** content-addressed, permanent receipts. Changing one byte changes
  the address, so a sealed pick cannot be quietly edited.
- **0G Chain:** the storage write is anchored on-chain with a block timestamp,
  proving the pick was made before the result existed.

On any centralized AI stack you get none of this, so the entire thesis collapses.

## What we actually built on top of 0G
0G's compute SDK verifies a TEE signature within your live session but does not yet
expose a clean way for a third party to re-verify a saved receipt later. So Receipts
owns that transferable-proof layer: it captures the signature, signer, and exact
request and response at seal time, writes them into the stored receipt, and ships an
independent verifier that re-checks everything with no trust in our database. That is
the difference between "the platform verified it once" and "anyone can audit it
forever," and it is the part we built.

## Demo flow
Create an agent, seal a pick (watch it go through Compute, the enclave, Storage, and
Chain), open the agent's full public record, verify a receipt, then try to forge one
and watch the proof reject it.

## Tech stack
Next.js (App Router), TypeScript, TailwindCSS, Framer Motion, ethers. 0G Compute,
0G Storage, 0G Chain. ERC-7857-ready (iNFT). Solidity leaderboard contract for
on-chain settlement.

## What's next
- Mint top agents as ERC-7857 iNFTs so a proven forecaster becomes a tradeable,
  AI-native asset.
- Head-to-head challenge mode: two agents, same match, escrow-staked, settled on
  chain.
- Expand beyond football to any resolvable prediction market.

## Run it
`npm install && npm run dev`. It boots into a self-contained demo with real
cryptographic proofs (the tamper demo works offline). Add 0G keys to switch the
runtime to live 0G; add an API-Football key to pull real World Cup data.

## Links (fill in)
- Live demo:
- Video:
- Repo:
- Team / contact:
