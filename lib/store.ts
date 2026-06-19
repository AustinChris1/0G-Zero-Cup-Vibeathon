import fs from "fs";
import os from "os";
import path from "path";
import type { Agent, Database, Match, Outcome, Prediction } from "./types";
import { brierScore } from "./scoring";
import { buildSeed } from "./seed";
import snapshotJson from "../data/snapshot.json";

// Bundled real-data snapshot (real fixtures + sealed receipts + proof blobs).
// On serverless where there is no writable store yet, this is the baseline so
// every instance shows real data consistently. Regenerate with: npm run snapshot
const SNAPSHOT = snapshotJson as unknown as Database;

// On serverless (Vercel) the project dir is read-only; only the temp dir is
// writable. Locally we use ./data so state persists across restarts.
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "receipts-data")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "store.json");

/* Blobs live in their own global map so writing one never triggers a DB load
 * (that would recurse during seeding). They are snapshotted into the DB on save. */
function blobMap(): Record<string, string> {
  const g = globalThis as unknown as { __receiptsBlobs?: Record<string, string> };
  if (!g.__receiptsBlobs) g.__receiptsBlobs = {};
  return g.__receiptsBlobs;
}
export function putBlob(root: string, content: string) {
  blobMap()[root] = content;
}
export function getBlob(root: string): string | null {
  return blobMap()[root] ?? null;
}

// Prefer the bundled snapshot (real fixtures + picks) when there is no writable
// store yet; fall back to agents-only seed if the snapshot is empty.
function fallbackDb(): Database {
  if (SNAPSHOT && Array.isArray(SNAPSHOT.matches) && SNAPSHOT.matches.length > 0) {
    return JSON.parse(JSON.stringify(SNAPSHOT)) as Database;
  }
  return buildSeed();
}

function load(): Database {
  const g = globalThis as unknown as { __receiptsDb?: Database };
  if (g.__receiptsDb) return g.__receiptsDb;

  let db: Database;
  let fromDisk = false;
  try {
    if (fs.existsSync(DB_PATH)) {
      db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as Database;
      fromDisk = true;
    } else {
      db = fallbackDb();
    }
  } catch (err) {
    console.error("[store] load failed, using fallback:", err);
    db = fallbackDb();
  }

  // Hydrate the blob map from whatever the DB carries, BEFORE any persist (so
  // persist, which snapshots the blob map back onto the DB, does not wipe them).
  const blobs = blobMap();
  for (const [k, v] of Object.entries(db.blobs ?? {})) blobs[k] = v;
  db.blobs = blobs;

  g.__receiptsDb = db;
  // Persist the fallback so subsequent reads on this instance are fast.
  if (!fromDisk) persist(db);
  return db;
}

function persist(db: Database) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db.blobs = blobMap();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("[store] persist failed:", err);
  }
}

/* --------------------------------- reads --------------------------------- */
export function listAgents(): Agent[] {
  return [...load().agents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
export function getAgent(id: string): Agent | undefined {
  return load().agents.find((a) => a.id === id || a.handle === id);
}
export function listMatches(): Match[] {
  return [...load().matches].sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );
}
export function getMatch(id: string): Match | undefined {
  return load().matches.find((m) => m.id === id);
}
export function listPredictions(): Prediction[] {
  return load().predictions;
}
export function getPrediction(id: string): Prediction | undefined {
  return load().predictions.find((p) => p.id === id);
}
export function predictionsByAgent(agentId: string): Prediction[] {
  return load()
    .predictions.filter((p) => p.agentId === agentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function predictionsByMatch(matchId: string): Prediction[] {
  return load().predictions.filter((p) => p.matchId === matchId);
}
export function hasPrediction(agentId: string, matchId: string): boolean {
  return load().predictions.some((p) => p.agentId === agentId && p.matchId === matchId);
}

/* -------------------------------- writes -------------------------------- */
export function addAgent(agent: Agent) {
  const db = load();
  db.agents.push(agent);
  persist(db);
  return agent;
}

export function addPrediction(prediction: Prediction) {
  const db = load();
  // resolve immediately if the match already has a result
  const match = db.matches.find((m) => m.id === prediction.matchId);
  if (match?.status === "RESOLVED" && match.result) {
    prediction.resolved = true;
    prediction.correct = prediction.pick === match.result.outcome;
    prediction.brier = brierScore(prediction.probs, match.result.outcome);
  }
  db.predictions.push(prediction);
  persist(db);
  return prediction;
}

function scorePredictionsFor(db: Database, matchId: string, outcome: Outcome) {
  for (const p of db.predictions) {
    if (p.matchId === matchId && !p.resolved) {
      p.resolved = true;
      p.correct = p.pick === outcome;
      p.brier = brierScore(p.probs, outcome);
    }
  }
}

export function resolveMatch(matchId: string, home: number, away: number) {
  const db = load();
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return null;
  const outcome: Outcome = home > away ? "HOME" : away > home ? "AWAY" : "DRAW";
  match.status = "RESOLVED";
  match.result = { home, away, outcome };
  scorePredictionsFor(db, matchId, outcome);
  persist(db);
  return match;
}

export function getLastSync(): string | null {
  return load().meta?.lastSync ?? null;
}

/**
 * Merge real fixtures (from the football API) into the store. New fixtures are
 * added; existing ones have their status/score updated. When a match flips to
 * resolved, every pick on it is scored. Seed history is left untouched.
 */
export function upsertMatches(incoming: Match[]) {
  const db = load();
  let added = 0;
  let updated = 0;
  let resolved = 0;

  for (const m of incoming) {
    const existing = db.matches.find((x) => x.id === m.id);
    if (!existing) {
      db.matches.push(m);
      added += 1;
      if (m.status === "RESOLVED" && m.result) {
        scorePredictionsFor(db, m.id, m.result.outcome);
      }
    } else {
      const wasResolved = existing.status === "RESOLVED";
      existing.stage = m.stage;
      existing.home = m.home;
      existing.away = m.away;
      existing.kickoff = m.kickoff;
      existing.venue = m.venue;
      existing.status = m.status;
      existing.source = m.source;
      if (m.result) existing.result = m.result;
      updated += 1;
      if (!wasResolved && m.status === "RESOLVED" && m.result) {
        scorePredictionsFor(db, m.id, m.result.outcome);
        resolved += 1;
      }
    }
  }

  db.meta = { ...(db.meta ?? {}), lastSync: new Date().toISOString() };
  persist(db);
  return { added, updated, resolved };
}
