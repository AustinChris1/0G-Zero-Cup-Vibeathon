# Demo video guide

A shot-by-shot script for your submission video. Target length: **2 to 3 minutes**.
You can read the narration close to word for word.

The single most important moment is the **tamper demo** near the end. Everything builds
to it. Do not rush it.

The app now runs **live on 0G** with **real fixtures**. One consequence: sealing a pick
does a real 0G Compute inference plus a real on-chain storage write, so it takes ~30 to 40
seconds. Plan for that (see the checklist).

---

## Before you hit record (checklist)

1. Make sure the app is built and running on the live stack:
   ```bash
   npm run build && npm start        # production server, stable for the demo
   ```
   `.env` should have `OG_MODE=live`, `OG_COMPUTE=on`, a funded `OG_PRIVATE_KEY`, and a
   `FOOTBALL_DATA_TOKEN`.
2. **Pre-seal a few picks before recording** so the agents and a couple of fixtures already
   have real receipts to show (sealing live on camera is slow):
   ```bash
   node scripts/seal-batch.cjs 2 7
   ```
3. Open `http://localhost:3000` in a clean browser: full screen, no bookmarks bar, 100% zoom.
4. Audio: a calm voiceover beats on-screen text. Use the lines below or your own.
5. Do one silent dry run clicking the whole flow.

---

## The script

### 1. Hook (0:00 - 0:20)
**On screen:** the landing page hero. Let the headline animate in, scroll to the live ticker.

> "Any AI or influencer can screenshot the bets they won and quietly delete the ones they
> lost. So every AI track record you have ever seen could be fake. This is Receipts. It makes
> faking one mathematically impossible, live on 0G."

### 2. What it is (0:20 - 0:40)
**On screen:** scroll the "how it works" four steps.

> "You spin up a forecasting agent. Every pick it makes is run through Sealed Inference on
> 0G, signed inside a hardware enclave, and sealed on 0G storage before kickoff. No deleting
> losses. No screenshots of wins. Just receipts."

### 3. The field and the platform (0:40 - 1:05)
**On screen:** Fixtures page. Show the **competition tabs** (World Cup, Champions League,
Premier League, La Liga, Serie A...). Click into the World Cup, show a match card with the
agents' picks and the consensus bar.

> "It launches on the World Cup, but it is a platform. These are real fixtures, pulled live.
> Here are the agents' real, signed predictions on an upcoming match, each one already sealed
> on 0G."

### 4. Seal a pick, the core moment (1:05 - 1:45)
**On screen:** create or pick an agent, seal a pick on an upcoming match. Let the four-step
animation play. Because it is live, narrate over the ~30 second wait.

> "Watch it forecast on 0G Compute. The response is signed inside the TEE, written to 0G
> storage, and timestamped on-chain, all before the game is played. This is happening on 0G
> right now."

Pause on the stamped receipt. Point out the real signature, storage root, and tx hash.

> "That is a receipt. Permanent, public, and it can never be edited."

### 5. The audit trail (1:45 - 2:05)
**On screen:** the agent profile. Scroll the feed, click **Verify this receipt**, let the
four green checks cascade.

> "Here is the agent's whole history. Anyone can re-verify any receipt independently. Four
> checks, all green. The leaderboard fills with settled results as these real matches play out."

### 6. The proof, the wow (2:05 - 2:45)
**On screen:** the `/proof` page. Click **Forge the outcome**. The verification turns red.

> "Now let's try to cheat. I will secretly rewrite a sealed pick to the opposite result and
> run the exact same verifier. The signature no longer matches. The forgery is rejected.
> There is no private key to re-sign with. The losing call stays on the record forever."

Let the red FAIL lines sit. This is the payoff.

### 7. Why 0G and close (2:45 - 3:00)
**On screen:** the footer (LIVE ON 0G, Compute + Storage live), then the hero.

> "This is only possible on 0G: Sealed Inference for the signature, Storage for immutability,
> the chain for trustless timing. An un-fakeable AI track record, live. That is Receipts."

---

## Narration and editing tips
- Speak slower than feels natural. Let animations finish before talking over the next thing.
- Say "0G" out loud at least three times (Compute, Storage, Chain).
- The live seal is ~30s; either cut to it already finished, or narrate the wait as "this is
  really happening on 0G."
- The tamper FAIL screen deserves an extra second of hold and a subtle zoom.
- Be upfront that the leaderboard is light: it is real, and it fills as matches resolve.
- Export 1080p MP4, under the hackathon's size and length limits.

## If you only have 60 seconds
Hook (10s) -> a pre-sealed real receipt with its 0G hashes (15s) -> the tamper demo rejecting
a forgery (25s) -> "only possible on 0G" close (10s). The receipt and the tamper sell it.
