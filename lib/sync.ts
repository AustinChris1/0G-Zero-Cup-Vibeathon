import { fetchWorldCupFixtures } from "./data/football";
import {
  addPrediction,
  getAgent,
  getLastSync,
  hasPrediction,
  listMatches,
  upsertMatches,
} from "./store";
import { sealPredictionSync } from "./og/seal";
import { SEED_AGENT_IDS } from "./seed";

export interface SyncResult {
  ok: boolean;
  reason?: string;
  fetched: number;
  added: number;
  updated: number;
  resolved: number;
  autoSealed: number;
  skipped?: boolean;
}

// How many seed agents auto-seal each new real fixture. The rest are left for
// the user to run interactively in the demo.
const AUTO_SEAL_AGENTS = 4;

// Minimum minutes between real API calls. Enforced server-side so that any
// number of visitors only ever triggers one external fetch per window.
const TTL_MINUTES = Number(process.env.SYNC_TTL_MINUTES || 10);

const empty = { fetched: 0, added: 0, updated: 0, resolved: 0, autoSealed: 0 };

// Coalesce concurrent syncs so a burst of visitors can never fan out into a
// burst of API calls. In-flight callers share the one real request.
let inFlight: Promise<SyncResult> | null = null;

export async function syncFootball(opts: { force?: boolean } = {}): Promise<SyncResult> {
  const last = getLastSync();
  if (!opts.force && last && Date.now() - new Date(last).getTime() < TTL_MINUTES * 60_000) {
    return { ok: true, skipped: true, reason: "Data is fresh.", ...empty };
  }
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<SyncResult> {
  // The provider returns a precise error (missing token, blocked season, etc.).
  const { matches: fixtures, error } = await fetchWorldCupFixtures();
  if (fixtures.length === 0) {
    return {
      ok: false,
      reason: error || "No fixtures returned. Running on the curated seed.",
      fetched: 0,
      added: 0,
      updated: 0,
      resolved: 0,
      autoSealed: 0,
    };
  }

  const { added, updated, resolved } = upsertMatches(fixtures);

  // Populate brand-new real upcoming fixtures with a few sealed picks so the
  // field is alive. These are honest: sealed now, before kickoff.
  let autoSealed = 0;
  const agents = SEED_AGENT_IDS.slice(0, AUTO_SEAL_AGENTS)
    .map((id) => getAgent(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  for (const match of listMatches()) {
    if (match.source !== "live" || match.status !== "UPCOMING") continue;
    for (const agent of agents) {
      if (hasPrediction(agent.id, match.id)) continue;
      try {
        addPrediction(sealPredictionSync(agent, match, new Date().toISOString()));
        autoSealed += 1;
      } catch {
        /* skip on any seal failure */
      }
    }
  }

  return { ok: true, fetched: fixtures.length, added, updated, resolved, autoSealed };
}
