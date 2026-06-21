import { getAll } from "./store";
import { computeStats, rankAgents, type RankedAgent } from "./scoring";
import type { Agent, Database, Match, Prediction } from "./types";
import type { TickerItem } from "@/components/ticker";

const byCreatedDesc = (a: { createdAt: string }, b: { createdAt: string }) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export async function heroStats() {
  const db = await getAll();
  return {
    agents: db.agents.length,
    sealed: db.predictions.length,
    resolved: db.predictions.filter((p) => p.resolved).length,
  };
}

export async function ranked(): Promise<RankedAgent[]> {
  const db = await getAll();
  return rankAgents(db.agents, db.predictions);
}

export async function tickerItems(limit = 16): Promise<TickerItem[]> {
  const db = await getAll();
  const matches = new Map(db.matches.map((m) => [m.id, m]));
  const agents = new Map(db.agents.map((a) => [a.id, a]));
  return [...db.predictions]
    .sort(byCreatedDesc)
    .slice(0, limit)
    .map((p) => {
      const m = matches.get(p.matchId);
      const agent = agents.get(p.agentId);
      const pickName =
        p.pick === "HOME" ? m?.home.code : p.pick === "AWAY" ? m?.away.code : "DRAW";
      return {
        id: p.id,
        glyph: agent?.glyph ?? "◆",
        accent: agent?.accent ?? "#ceff1a",
        agent: agent?.name ?? "Agent",
        pick: pickName ?? "?",
        fixture: m ? `${m.home.code}-${m.away.code}` : "",
        confidence: Math.round(p.confidence * 100),
        hash: p.seal.payloadHash,
      };
    });
}

export interface AgentBundle {
  agent: Agent;
  stats: ReturnType<typeof computeStats>;
  rank: number;
  rows: { prediction: Prediction; match: Match }[];
}

export async function agentBundle(handle: string): Promise<AgentBundle | null> {
  const db = await getAll();
  const agent = db.agents.find((a) => a.id === handle || a.handle === handle);
  if (!agent) return null;
  const preds = db.predictions
    .filter((p) => p.agentId === agent.id)
    .sort(byCreatedDesc);
  const stats = computeStats(preds);
  const board = rankAgents(db.agents, db.predictions);
  const rank = board.find((r) => r.agent.id === agent.id)?.stats.rank ?? 0;
  const matches = new Map(db.matches.map((m) => [m.id, m]));
  const rows = preds
    .map((prediction) => {
      const match = matches.get(prediction.matchId);
      return match ? { prediction, match } : null;
    })
    .filter((x): x is { prediction: Prediction; match: Match } => x !== null);
  return { agent, stats, rank, rows };
}

export interface FixtureBundle {
  match: Match;
  predictions: { prediction: Prediction; agent: Agent }[];
  unpredicted: Agent[];
}

export async function fixtureBundles(): Promise<FixtureBundle[]> {
  const db = await getAll();
  const agents = [...db.agents];
  const agentMap = new Map(db.agents.map((a) => [a.id, a]));
  const matches = [...db.matches].sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );
  return matches.map((match) => {
    const preds = db.predictions.filter((p) => p.matchId === match.id);
    const predicted = new Set(preds.map((p) => p.agentId));
    const predictions = preds
      .map((prediction) => {
        const agent = agentMap.get(prediction.agentId);
        return agent ? { prediction, agent } : null;
      })
      .filter((x): x is { prediction: Prediction; agent: Agent } => x !== null)
      .sort((a, b) => b.prediction.confidence - a.prediction.confidence);
    return {
      match,
      predictions,
      unpredicted: agents.filter((a) => !predicted.has(a.id)),
    };
  });
}

export interface ReceiptBundle {
  prediction: Prediction;
  agent: Agent;
  match: Match;
}

export async function receiptBundle(id: string): Promise<ReceiptBundle | null> {
  const db = await getAll();
  const prediction = db.predictions.find((p) => p.id === id);
  if (!prediction) return null;
  const agent = db.agents.find((a) => a.id === prediction.agentId);
  const match = db.matches.find((m) => m.id === prediction.matchId);
  if (!agent || !match) return null;
  return { prediction, agent, match };
}

export type { Database };
