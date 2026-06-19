# Judge notes and tough questions

Honest, prepared answers to the hard questions. If a judge pushes on any of these,
you want to sound like you already thought about it, because you did.

---

### "Isn't demo mode just fake? You're not really on 0G."
Demo mode swaps where the signature comes from, not whether it is real. Every pick
is signed with a real ECDSA key and the verifier really recovers it. Proof: the
"Attack this receipt" button forges a pick and the same verifier rejects it, live,
with no internet. The cryptography is identical in live mode; only the signing key's
origin changes (a local enclave key vs a 0G TEE provider key). Flip `OG_MODE=live`
with a funded key and the same code path uses 0G Compute and 0G Storage.

### "0G's SDK already verifies the TEE signature. What did you actually add?"
0G's `processResponse` returns a boolean and is scoped to your live broker session;
the broker does not yet expose third-party re-verification (its own interface marks
the quote check as TBD). A track record needs the opposite: anyone, later, with no
session, must be able to re-verify a saved pick. So we capture the signature, the
signer address, and the exact request and response at seal time, store all of it in
the receipt, and ship our own verifier (`lib/og/verify.ts`). That transferable-proof
layer is the moat. Without it you have "trust that the platform checked it once."

### "Can't an operator just not submit the picks that look bad?"
Pre-kickoff, the outcome is unknown, so you cannot selectively keep winners; you do
not know which will win. The only signal at seal time is the model's own confidence.
Three defenses:
1. The seal pipeline writes every pick automatically; there is no "discard" step.
2. The leaderboard uses **Brier score**, which punishes overconfidence, so spamming
   only high-confidence picks hurts you when you are wrong.
3. We can require a full slate per round so an agent must call every match.
The honest, narrow claim we make is the one that matters: you cannot add wins or
delete losses after the fact.

### "Why not just a database with timestamps? Why a blockchain at all?"
A database timestamp means trusting the host's clock and that they did not edit the
row. Receipts removes that trust:
- the **signature** proves the content came from a specific enclave key,
- the **storage root** proves the content was not altered (it is its own address),
- the **chain timestamp** proves when, without trusting our server.
Remove any one leg and faking becomes possible again. That is why all three 0G
primitives are load-bearing, not decoration.

### "What is genuinely on 0G versus simulated in the demo?"
Straight answer, with the matrix in `docs/WORKFLOW.md`:
- Live mode: inference on 0G Compute, receipts on 0G Storage, settlement on 0G Chain.
- Demo mode: real signing and real verification locally, with the 0G calls stubbed
  by deterministic equivalents so the app runs with zero setup.
We did not hide this; the footer shows DEMO or LIVE, and the README documents it.

### "Can the leaderboard be gamed with a lucky one-off?"
No. The score ramps in over the first dozen settled picks (`lib/scoring.ts`), so a
single lucky call cannot top a proven record. We rank by Brier, which rewards
calibration, not just hit rate.

### "Is it truly impossible to fake, or just hard?"
Precise claim: you cannot alter a sealed pick, or backdate one, without breaking a
cryptographic check that anyone can run. Forging the signature requires the enclave's
private key, which you do not have. That is the same security model as any digital
signature. What we do not claim: that an agent is forced to be honest about which
games it enters. We are upfront about that boundary.

### "Why the World Cup?"
The knockout stage runs during the hackathon voting window, so predictions resolve
live while people are watching. It is a built-in engagement loop and the perfect
stress test: real fixtures, real deadlines, real outcomes.

### "What is the business / what is next?"
Portable, un-fakeable AI reputation is the primitive. Forecasting is the wedge. Next:
mint proven agents as ERC-7857 iNFTs (tradeable AI assets), head-to-head staked
challenges settled on chain, and expansion to any resolvable prediction market.

---

## 30-second pitch (memorize this)
"Every AI track record you have seen could be fake, because model output is just
text with no proof. Receipts makes faking impossible: agents predict World Cup
matches, every pick is signed in a 0G enclave and sealed on 0G Storage before
kickoff, and anyone can audit it. Try to forge one and the math rejects you. It is
an un-fakeable AI reputation layer, and it only works on 0G."
