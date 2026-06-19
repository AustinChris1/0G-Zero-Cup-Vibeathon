# Demo video guide

A shot-by-shot script for your submission video. Target length: **2 to 3 minutes**
(most hackathons cap at 3 to 5; shorter and tighter beats long). You can read the
narration close to word for word.

The single most important moment is the **tamper demo** near the end. Everything
builds to it. Do not rush it.

---

## Before you hit record (5-minute checklist)

1. Reset to clean demo data so the screen looks curated:
   ```bash
   rm -f data/store.json
   npm run dev
   ```
2. Open `http://localhost:3000` in a clean browser window:
   - full screen, hide the bookmarks bar, close other tabs,
   - zoom at 100% (or 110% if your screen is very high resolution),
   - dark wallpaper if any desktop shows.
3. Decide audio: a calm voiceover beats on-screen text. Write your own or use the
   lines below. If you cannot record voice, add short on-screen captions instead.
4. Recording tool: OBS Studio (free) or your OS screen recorder. Record at 1080p,
   30fps is fine.
5. Do one silent dry run clicking through the whole flow so the live actions
   (especially the seal animation) feel smooth.
6. Optional: if you wired real data, click **Sync live World Cup data** once before
   recording so real fixtures are present. Otherwise the curated bracket is great.

---

## The script

### 1. Hook (0:00 - 0:20)
**On screen:** the landing page hero (`/`). Let the headline animate in.

> "Any AI or influencer can screenshot the bets they won and quietly delete the
> ones they lost. So every AI track record you have ever seen could be fake. This
> is Receipts. It makes faking one mathematically impossible."

Scroll slowly so the live ticker of sealed picks shows.

### 2. What it is (0:20 - 0:40)
**On screen:** keep scrolling the landing page through the "How it works" four steps.

> "You spin up a forecasting agent. Every pick it makes is signed inside a hardware
> enclave and sealed on 0G before kickoff. No deleting losses. No screenshots of
> wins. Just receipts."

### 3. Create an agent (0:40 - 1:05)
**On screen:** click **Create an agent**, go to `/agents/new`. Click a template
(for example "Underdog Hunter"), then click **Create agent**.

> "I describe a strategy in plain English. That becomes the agent's brain. Let's
> make an underdog hunter and put it to work."

### 4. Seal a pick, the core moment (1:05 - 1:45)
**On screen:** go to `/fixtures`. Pick an upcoming match, choose your new agent in
the panel, click **Seal pick**. Let the four-step animation play fully, then the
stamp slams down on the receipt.

> "It forecasts the match on 0G Compute. The answer is signed inside the enclave,
> written to 0G Storage, and timestamped on 0G Chain, all before the game is played.
> Watch it get sealed."

Pause on the stamped receipt for a beat. Point out the signature and storage hashes.

> "That is a receipt. Permanent, public, and it can never be edited."

### 5. The audit trail (1:45 - 2:10)
**On screen:** open the agent's profile (`/agents/[handle]`). Show the stats
counting up, then scroll the feed of receipts. Click **Verify this receipt** on one
and let the four green checks cascade.

> "Here is the agent's entire history. Every call, wins and losses, nothing hidden.
> Anyone can re-verify any receipt independently. Four checks, all green."

### 6. The proof, the wow (2:10 - 2:45)
**On screen:** go to `/proof`. Scroll to "Break it yourself". Click **Forge the
outcome**. The verification turns red and rejects the forgery.

> "Now let's try to cheat. I will secretly rewrite a sealed pick to the opposite
> result and run the exact same verifier. The signature no longer matches. The
> forgery is rejected. There is no private key to re-sign with. The losing call
> stays on the record forever."

Let the red FAIL lines sit on screen. This is the payoff shot.

### 7. Why 0G and close (2:45 - 3:00)
**On screen:** the leaderboard (`/leaderboard`), then back to the hero.

> "This is only possible on 0G: Sealed Inference for the signature, Storage for
> immutability, and the chain for trustless timing. An un-fakeable AI track record,
> live during the World Cup. That is Receipts."

End on the wordmark.

---

## Narration tips

- Speak slower than feels natural. Demo nerves make people rush.
- Let animations finish before you talk over the next thing.
- Say "0G" out loud at least three times (Compute, Storage, Chain). Judges are
  scoring how load-bearing the chain is.
- If a live action lags, cut to it already finished rather than showing a spinner.

## Editing tips

- Add a one-line caption with the product name and tagline in the first 3 seconds.
- Keep cuts tight. Trim every dead second between clicks.
- The tamper FAIL screen deserves an extra second of hold and maybe a subtle zoom.
- Export 1080p MP4. Keep it under the hackathon's size and length limits.

## If you only have 60 seconds

Do: hook (10s) -> seal a pick with the animation (20s) -> tamper demo rejecting a
forgery (20s) -> "only possible on 0G" close (10s). The seal and the tamper are the
two shots that sell it.
