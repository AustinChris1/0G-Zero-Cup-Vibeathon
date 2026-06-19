import { fetchAllFixtures } from "./data/football";
import { getLastSync, upsertMatches } from "./store";

export interface SyncResult {
  ok: boolean;
  reason?: string;
  fetched: number;
  added: number;
  updated: number;
  resolved: number;
  skipped?: boolean;
}

// Minimum minutes between real API calls. Enforced server-side so any number of
// visitors only ever triggers one external fetch per window.
const TTL_MINUTES = Number(process.env.SYNC_TTL_MINUTES || 10);

// Coalesce concurrent syncs so a burst of visitors cannot fan out into a burst
// of API calls. In-flight callers share the one real request.
let inFlight: Promise<SyncResult> | null = null;

export async function syncFootball(opts: { force?: boolean } = {}): Promise<SyncResult> {
  const last = getLastSync();
  if (!opts.force && last && Date.now() - new Date(last).getTime() < TTL_MINUTES * 60_000) {
    return { ok: true, skipped: true, reason: "Data is fresh.", fetched: 0, added: 0, updated: 0, resolved: 0 };
  }
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSync(): Promise<SyncResult> {
  const { matches, error } = await fetchAllFixtures();
  if (matches.length === 0) {
    return {
      ok: false,
      reason: error || "No fixtures returned.",
      fetched: 0,
      added: 0,
      updated: 0,
      resolved: 0,
    };
  }
  const { added, updated, resolved } = upsertMatches(matches);
  return { ok: true, fetched: matches.length, added, updated, resolved };
}
