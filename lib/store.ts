import fs from "fs";
import os from "os";
import path from "path";
import type { Agent, Database, Match, MatchResult, Outcome, Prediction } from "./types";
import { brierScore } from "./scoring";
import { buildSeed } from "./seed";
import snapshotJson from "../data/snapshot.json";

// Bundled real-data snapshot used to self-seed an empty store (first run on Redis,
// or a fresh local file). Regenerate with: npm run snapshot
const SNAPSHOT = snapshotJson as unknown as Database;
// Bump this to force a clean re-seed from the snapshot on deploy (old key is left
// orphaned). v3: dropped pre-fix sample picks that cited home advantage at the WC.
const REDIS_KEY = "receipts:db:v3";

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "receipts-data")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "store.json");

/**
 * Shared store. When Upstash/Vercel KV env vars are present the whole database
 * lives in one Redis key, so every serverless instance reads and writes the same
 * state (this is what makes create/seal/resolve actually work on Vercel). Without
 * those vars it falls back to a local JSON file for development.
 */
function redisEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function fallbackDb(): Database {
  if (SNAPSHOT && Array.isArray(SNAPSHOT.matches) && SNAPSHOT.matches.length > 0) {
    return JSON.parse(JSON.stringify(SNAPSHOT)) as Database;
  }
  return buildSeed();
}

/* ----------------------------- Redis (Upstash REST) ----------------------------- */
async function redisCmd(env: { url: string; token: string }, cmd: unknown[]): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(env.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}` },
      body: JSON.stringify(cmd),
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Upstash REST ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}
async function redisLoad(env: { url: string; token: string }): Promise<Database> {
  const { result } = await redisCmd(env, ["GET", REDIS_KEY]);
  if (result) return JSON.parse(result as string) as Database;
  const seeded = fallbackDb();
  await redisCmd(env, ["SET", REDIS_KEY, JSON.stringify(seeded)]);
  return seeded;
}
async function redisSave(env: { url: string; token: string }, db: Database): Promise<void> {
  await redisCmd(env, ["SET", REDIS_KEY, JSON.stringify(db)]);
}

/* --------------------------------- file (local) --------------------------------- */
function fileLoad(): Database {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as Database;
  } catch (err) {
    console.error("[store] file load failed:", err);
  }
  const db = fallbackDb();
  fileSave(db);
  return db;
}
function fileSave(db: Database): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("[store] file save failed:", err);
  }
}

/* ------------------------------ load / save (cached) ------------------------------ */
// A short read cache + in-flight dedup keeps one render to a single fetch while
// staying near-current across instances. Mutations always read fresh.
let cache: { db: Database; at: number } | null = null;
let inflight: Promise<Database> | null = null;
const CACHE_MS = 1500;

async function doLoad(): Promise<Database> {
  const env = redisEnv();
  let db: Database;
  if (env) {
    try {
      db = await redisLoad(env);
    } catch (err) {
      console.error("[store] Redis load failed, using file/snapshot:", err);
      db = fileLoad();
    }
  } else {
    db = fileLoad();
  }
  cache = { db, at: Date.now() };
  return db;
}
async function loadDb(): Promise<Database> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.db;
  if (inflight) return inflight;
  inflight = doLoad().finally(() => {
    inflight = null;
  });
  return inflight;
}
async function loadFresh(): Promise<Database> {
  cache = null;
  return loadDb();
}
async function saveDb(db: Database): Promise<void> {
  const env = redisEnv();
  if (env) {
    try {
      await redisSave(env, db);
    } catch (err) {
      console.error("[store] Redis save failed, writing file:", err);
      fileSave(db);
    }
  } else {
    fileSave(db);
  }
  cache = { db, at: Date.now() };
}

/** Whole database, for the query layer (one fetch, then compute in memory). */
export async function getAll(): Promise<Database> {
  return loadDb();
}

/* ----------------------------------- blobs ----------------------------------- */
export async function getBlob(root: string): Promise<string | null> {
  return (await loadDb()).blobs?.[root] ?? null;
}
export async function putBlob(root: string, content: string): Promise<void> {
  const db = await loadFresh();
  db.blobs = db.blobs ?? {};
  db.blobs[root] = content;
  await saveDb(db);
}

/* ----------------------------------- reads ----------------------------------- */
export async function listAgents(): Promise<Agent[]> {
  return [...(await loadDb()).agents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
export async function getAgent(id: string): Promise<Agent | undefined> {
  return (await loadDb()).agents.find((a) => a.id === id || a.handle === id);
}
export async function listMatches(): Promise<Match[]> {
  return [...(await loadDb()).matches].sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );
}
export async function getMatch(id: string): Promise<Match | undefined> {
  return (await loadDb()).matches.find((m) => m.id === id);
}
export async function listPredictions(): Promise<Prediction[]> {
  return (await loadDb()).predictions;
}
export async function getPrediction(id: string): Promise<Prediction | undefined> {
  return (await loadDb()).predictions.find((p) => p.id === id);
}
export async function predictionsByAgent(agentId: string): Promise<Prediction[]> {
  return (await loadDb()).predictions
    .filter((p) => p.agentId === agentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export async function predictionsByMatch(matchId: string): Promise<Prediction[]> {
  return (await loadDb()).predictions.filter((p) => p.matchId === matchId);
}
export async function hasPrediction(agentId: string, matchId: string): Promise<boolean> {
  return (await loadDb()).predictions.some(
    (p) => p.agentId === agentId && p.matchId === matchId,
  );
}
export async function getLastSync(): Promise<string | null> {
  return (await loadDb()).meta?.lastSync ?? null;
}

/* ----------------------------------- writes ----------------------------------- */
export async function addAgent(agent: Agent): Promise<Agent> {
  const db = await loadFresh();
  db.agents.push(agent);
  await saveDb(db);
  return agent;
}

export async function addPrediction(prediction: Prediction): Promise<Prediction> {
  const db = await loadFresh();
  const match = db.matches.find((m) => m.id === prediction.matchId);
  if (match?.status === "RESOLVED" && match.result) {
    prediction.resolved = true;
    prediction.correct = prediction.pick === match.result.outcome;
    prediction.brier = brierScore(prediction.probs, match.result.outcome);
    if (prediction.scoreline) {
      prediction.exactScore =
        prediction.scoreline.home === match.result.home &&
        prediction.scoreline.away === match.result.away;
    }
  }
  db.predictions.push(prediction);
  await saveDb(db);
  return prediction;
}

function scorePredictionsFor(db: Database, matchId: string, result: MatchResult) {
  for (const p of db.predictions) {
    if (p.matchId === matchId && !p.resolved) {
      p.resolved = true;
      p.correct = p.pick === result.outcome;
      p.brier = brierScore(p.probs, result.outcome);
      if (p.scoreline) {
        p.exactScore = p.scoreline.home === result.home && p.scoreline.away === result.away;
      }
    }
  }
}

export async function resolveMatch(matchId: string, home: number, away: number): Promise<Match | null> {
  const db = await loadFresh();
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return null;
  const outcome: Outcome = home > away ? "HOME" : away > home ? "AWAY" : "DRAW";
  match.status = "RESOLVED";
  match.result = { home, away, outcome };
  scorePredictionsFor(db, matchId, match.result);
  await saveDb(db);
  return match;
}

export async function upsertMatches(
  incoming: Match[],
): Promise<{ added: number; updated: number; resolved: number }> {
  const db = await loadFresh();
  let added = 0;
  let updated = 0;
  let resolved = 0;

  for (const m of incoming) {
    const existing = db.matches.find((x) => x.id === m.id);
    if (!existing) {
      db.matches.push(m);
      added += 1;
      if (m.status === "RESOLVED" && m.result) scorePredictionsFor(db, m.id, m.result);
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
        scorePredictionsFor(db, m.id, m.result);
        resolved += 1;
      }
    }
  }

  db.meta = { ...(db.meta ?? {}), lastSync: new Date().toISOString() };
  await saveDb(db);
  return { added, updated, resolved };
}
