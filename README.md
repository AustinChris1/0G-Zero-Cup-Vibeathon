# Receipts

**An AI track record that is mathematically impossible to fake. Built for the 0G Zero Cup.**

Spin up a forecasting agent, point it at a World Cup knockout fixture, and it makes a
prediction. That prediction is signed inside a hardware enclave on 0G Compute and written to
0G Storage, timestamped before kickoff. From that moment it is permanent and public. No editing.
No deleting losses. No screenshots of only the wins. Just receipts.

The whole product is one idea made physical: **provenance, not vibes.** Any AI influencer can
screenshot a winning call and quietly delete the losers. Receipts makes that impossible, because
every pick carries a cryptographic seal over its exact contents, committed before the outcome
exists.

## Documentation

- [docs/WORKFLOW.md](docs/WORKFLOW.md) - how the whole system works, end to end
- [docs/DEMO_VIDEO.md](docs/DEMO_VIDEO.md) - shot-by-shot script for the submission video
- [docs/SUBMISSION.md](docs/SUBMISSION.md) - paste-ready submission copy
- [docs/JUDGE_NOTES.md](docs/JUDGE_NOTES.md) - prepared answers to the hard questions
- [docs/DEPLOY.md](docs/DEPLOY.md) - deploy to Vercel (CLI or GitHub)

---

## Why this needs 0G specifically

This app cannot exist on a normal AI stack. It is load-bearing on three 0G primitives:

| Leg | 0G primitive | What it proves |
| --- | --- | --- |
| **Authenticity** | 0G Compute · Sealed Inference (TEE) | This exact model produced this exact output, untampered. The response is signed by an enclave-born key. |
| **Immutability** | 0G Storage | The signed receipt is content-addressed and permanent. Change one byte and the address changes. |
| **Timing** | 0G Chain | The storage write lands on-chain with a block timestamp before kickoff, so the outcome was unknowable when sealed. |

On OpenAI or Anthropic you only get text back. There is no signature, so survivorship bias is
free. On 0G the signed output *is* the proof.

---

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

It boots straight into **demo mode** with a full World Cup bracket, seven agents, and a hundred-plus
already-sealed picks. **No keys, no wallet, no config required.**

### Demo mode is not fake

The cryptography is real in demo mode. Each pick is signed with a real ECDSA enclave key and the
verifier genuinely recovers the signer and re-hashes the content. You can prove this to yourself:
open any receipt and hit **Attack this receipt** on the proof panel. We flip the sealed pick and
re-run the exact same independent verifier. It rejects the forgery, every time. The only thing demo
mode swaps out is the *source* of the signature (a local enclave key instead of a live 0G TEE
provider). The verification math is identical.

### Real World Cup data (hybrid)

The app ships with a curated bracket so it always has something to show. To layer in
real 2026 World Cup fixtures and results, pick a provider in `.env` via
`FOOTBALL_PROVIDER` (the data layer is pluggable, see [`lib/data/football.ts`](lib/data/football.ts)):

- **`football-data`** (default, recommended): full 2026 World Cup on the free tier.
  Register a free token at football-data.org/client/register, then set
  `FOOTBALL_DATA_TOKEN=...`.
- **`thesportsdb`**: works with no signup at all, but the free key caps each response
  to a handful of matches. Good for a quick "yes it is real" cameo.
- **`api-football`**: full data, but its free plan blocks the 2026 season.

Open **Fixtures** and hit **Sync live World Cup data**. It pulls the real tournament,
merges fixtures into the store ([`lib/sync.ts`](lib/sync.ts)), auto-scores any match that
has finished, and seeds a few agent picks on new real fixtures so the field is alive. Real
fixtures are tagged `live data` in the UI; the curated seed stays as the sample track record.

It is a true hybrid: no token, provider down, or season not in your plan, and the app
silently keeps running on the seed. The Sync button shows the exact provider error so you
always know why. Nothing breaks during a demo.

### Going live on 0G

```bash
npm i @0glabs/0g-serving-broker @0gfoundation/0g-ts-sdk
cp .env.example .env   # then set OG_MODE=live and a funded OG_PRIVATE_KEY
```

In live mode:

- predictions run through `broker.inference` on **0G Compute** and are verified with
  `processResponse` (the TEE signature check),
- receipts are uploaded to **0G Storage** via the indexer (real merkle root + tx hash),
- match results can settle to the **Leaderboard** contract on **0G Chain** (see `contracts/`).

The integration code lives in [`lib/og/`](lib/og) and is dynamically imported, so the base app
installs and runs without the optional SDKs.

---

## The one honest caveat (from our 0G research)

The 0G Compute SDK's `processResponse()` returns a boolean and is scoped to your live broker
session; the broker does not yet expose a clean "any third party can re-verify this saved receipt
later" path (its own `Interface.md` marks third-party quote verification as `TBD`). So Receipts owns
the transferable-proof layer itself: at seal time we capture the signature material, signing
address, and exact request+response, write all of it into the stored receipt, and ship our **own**
verifier ([`lib/og/verify.ts`](lib/og/verify.ts)) that re-checks the signature independently of any
broker session. That is exactly the gap that turns "the platform verified it once" into "anyone can
audit it forever," and it is the part we built.

---

## Architecture

```
app/
  page.tsx              landing
  agents/               gallery, create, and the audit profile ([handle])
  fixtures/             upcoming + settled matches, seal picks live
  leaderboard/          Brier-ranked board
  receipt/[id]/         single shareable receipt + full proof + tamper demo
  proof/                why it cannot be faked, with a live forgery attempt
  api/                  predict · verify · resolve · tamper · agents
lib/
  og/
    compute.ts          inference (demo strategy engine + live 0G broker)
    crypto.ts           canonical payload, enclave signing, recovery
    storage.ts          0G Storage write/read (demo + live)
    verify.ts           independent 4-step verifier (the moat)
    chain.ts            on-chain settlement
    seal.ts             infer -> sign -> store pipeline
  store.ts              file-backed store
  seed.ts               the World Cup bracket + agents + sealed history
  scoring.ts            Brier, calibration, leaderboard ranking
contracts/
  Leaderboard.sol       trustless settlement on 0G Chain
```

### How a pick is sealed

1. `runInference` produces probabilities + reasoning (the agent's plain-language strategy drives it).
2. `canonicalPayload` serializes `{agent, match, model, request, response, time}` deterministically.
3. `enclaveSign` signs `keccak256(payload)` inside the enclave. Nothing is committed before it is signed.
4. `storeReceipt` writes the signed document to 0G Storage and returns `{root, tx}`.
5. After the match, `resolveMatch` scores every pick by Brier and `settleResult` anchors it on-chain.

### How a pick is verified (independently)

`verifyPrediction` re-derives everything from the public receipt with no trust in our database:

1. **Integrity** - recompute the payload hash, check it matches the signed digest.
2. **Authenticity** - recover the signer from the signature, check it matches the sealing key.
3. **Immutability** - re-hash the stored document, check it matches the 0G Storage root.
4. **Timing** - check the seal timestamp is before kickoff.

All four must pass. Tampering with any field fails check 1 and 2 instantly.

---

## Notes

- No analytics, no external calls in demo mode. Everything is local and deterministic.
- Tuned for the World Cup knockout window so picks resolve live during the voting period.
- Stack: Next.js (App Router), TypeScript, Tailwind, Framer Motion, ethers.
