# Deploying to Vercel

Receipts is a standard Next.js app, so Vercel works out of the box. Two paths.

## Option A: Vercel CLI (no GitHub needed, fastest)

```bash
npm i -g vercel
vercel              # first run: links/creates a project, deploys a preview
vercel --prod       # deploy to the production URL
```

Answer the prompts (scope, project name, "in which directory is your code" = `.`).
Vercel auto-detects Next.js. Done.

## Option B: GitHub import

1. Put the project on GitHub (`git init`, commit, push to a new repo).
2. On vercel.com: New Project, import the repo, keep the detected Next.js settings,
   Deploy.

## Environment variables (set these in Vercel)

In the Vercel dashboard under Project, Settings, Environment Variables (or with
`vercel env add`). None are required to boot (it runs the demo seed), but for real
World Cup data add:

| Variable | Value |
| --- | --- |
| `FOOTBALL_PROVIDER` | `football-data` |
| `FOOTBALL_DATA_TOKEN` | your free football-data.org token |
| `FOOTBALL_SEASON` | `2026` |
| `SYNC_TTL_MINUTES` | `10` (optional, throttles real API calls) |

For the live 0G runtime (optional) also add `OG_MODE=live`, `OG_PRIVATE_KEY`, and the
other `OG_*` values from `.env.example`, and add the two 0G SDKs to dependencies.

Never paste secrets into the repo. Set them as Vercel env vars only.

## The one thing to know about state on Vercel

Vercel runs serverless functions with an ephemeral, per-instance filesystem. The
app already handles this: it writes its store to the temp dir and rebuilds the
curated seed deterministically on every cold start, so the demo always looks
correct and the proof flows (seal, verify, tamper) work perfectly.

The limitation: agents and picks a visitor creates live are kept in that instance's
memory, so they may not persist across cold starts or be shared across instances.
For a demo link and the video this is fine. For a fully persistent, multi-user
public deployment, swap the file store in `lib/store.ts` for a shared datastore
(Vercel KV or Postgres). The store interface is small and isolated, so it is a
contained change. Ask and it can be wired up.

## After deploy

- Visit the URL. The landing page, agents, fixtures, leaderboard, and the proof or
  tamper demo all work on the seed with zero config.
- If you set the football token, open Fixtures. It auto-syncs real fixtures (and
  you can force a refresh with the button).
- Put the production URL in your submission and the demo video description.
