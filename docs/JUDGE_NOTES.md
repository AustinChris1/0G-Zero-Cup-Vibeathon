# Judge notes and tough questions

Honest, prepared answers to the hard questions. If a judge pushes on any of these,
you want to sound like you already thought about it, because you did.

---

### "Is this actually live on 0G, or a mock?"
Live. Predictions run through real 0G Compute Sealed Inference (`qwen/qwen2.5-omni-7b`
in a TEE; the response carries an attestation that verifies on every call), and every
receipt is written to real 0G Storage with an on-chain transaction on chain id 16602.
Open any receipt and hit verify, or hit "Attack this receipt" on the proof page and watch
the same verifier reject a forged copy. (There is also a zero-config demo mode with real
ECDSA signing, so the proof works even with no keys, but the deployed app runs on the real
0G stack.)

### "0G's SDK already verifies the TEE signature. What did you actually add?"
0G's `processResponse` returns a boolean and is scoped to your live broker session; it is
not a "any third party can re-verify this saved receipt later" path. A track record needs
the opposite: anyone, later, with no session, must be able to re-verify a saved pick. So we
capture the signature, signer, and exact request and response at seal time, store all of it
in the receipt, and ship our own verifier (`lib/og/verify.ts`) that re-checks it
independently. That transferable-proof layer is the moat.

### "Is the AI real, or scripted?"
Real. In live mode the pick and reasoning come from a real LLM on 0G Compute. One honest
limitation: the only live 0G model right now is a small 7B, which differentiates the agent
personas less sharply than a frontier model would, so picks can cluster. The strategies are
injected into the prompt and steer it; a bigger model (as more come online on 0G) separates
them further. Nothing about the proof depends on the model size.

### "Why do some competition tabs have no fixtures?"
Because it is real data, not mock. We pull live from football-data.org. In June/July the
domestic leagues are between seasons: last season's matches are correctly hidden (you cannot
predict the past), and most leagues have not published their new-season schedule yet. The
World Cup is live now, Serie A has already released its 2026/27 fixtures, and the other tabs
fill automatically as each league publishes. Empty tabs are the honest state, not a bug.

### "Can't an operator just not submit the picks that look bad?"
Pre-kickoff the outcome is unknown, so you cannot selectively keep winners. The only signal
at seal time is the model's own confidence. Defenses: the seal pipeline writes every pick
with no discard step; the leaderboard uses Brier score, which punishes overconfidence; and a
full slate per round can be required. The narrow claim we make is the one that matters: you
cannot add wins or delete losses after the fact.

### "Why a blockchain at all? Why not a database with timestamps?"
A database timestamp means trusting the host's clock and that they did not edit the row.
Receipts removes that trust: the signature proves the content came from a specific enclave
key, the storage root proves the content was not altered (it is its own address), and the
chain timestamp proves when, without trusting our server. Remove any leg and faking becomes
possible again, which is why all three 0G primitives are load-bearing.

### "The leaderboard is mostly empty / unsettled. Why?"
Because we removed all mock data. Agents can only honestly predict upcoming matches, so
"settled" results and Brier scores populate as real matches are played during the tournament
and voting window. We chose an honest empty start over a fake full one. The proof, not the
leaderboard, is the centrepiece.

### "Is it truly impossible to fake, or just hard?"
Precise claim: you cannot alter a sealed pick, or backdate one, without breaking a
cryptographic check anyone can run. Forging the signature requires the enclave's private
key, which you do not have. Same security model as any digital signature. What we do not
claim: that an agent is forced to enter every match. We are upfront about that boundary.

### "What is the business / what is next?"
Portable, un-fakeable AI reputation is the primitive; forecasting is the wedge; football is
the launch surface but the platform is competition-agnostic. Next: seal with the raw TEE
chat signature, mint proven agents as ERC-7857 iNFTs, and head-to-head staked challenges.

---

## 30-second pitch (memorize this)
"Every AI track record you have seen could be fake, because model output is just text with
no proof. Receipts makes faking impossible: agents predict real matches, every pick is run
through Sealed Inference on 0G and sealed on 0G Storage before kickoff, and anyone can audit
it. Try to forge one and the math rejects you. It is an un-fakeable AI reputation layer, live
on 0G, launching on the World Cup."
