import {
  getAgent,
  getMatch,
  getPrediction,
  listAgents,
  listMatches,
  listPredictions,
  predictionsByAgent,
  predictionsByMatch,
} from "./store";
import { computeStats, rankAgents, type RankedAgent } from "./scoring";
import type { Agent, Match, Prediction } from "./types";
import type { TickerItem } from "@/components/ticker";

export function heroStats() {
  const preds = listPredictions();
  return {
    agents: listAgents().length,
    sealed: preds.length,
    resolved: preds.filter((p) => p.resolved).length,
  };
}

export function ranked(): RankedAgent[] {
  return rankAgents(listAgents(), predictionsByAgent);
}

export function tickerItems(limit = 16): TickerItem[] {
  const matches = new Map(listMatches().map((m) => [m.id, m]));
  return listPredictions()
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map((p) => {
      const m = matches.get(p.matchId);
      const agent = getAgent(p.agentId);
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

export function agentBundle(handle: string): AgentBundle | null {
  const agent = getAgent(handle);
  if (!agent) return null;
  const preds = predictionsByAgent(agent.id);
  const stats = computeStats(preds);
  const board = ranked();
  const rank = board.findIndex((r) => r.agent.id === agent.id) + 1;
  const rows = preds
    .map((prediction) => {
      const match = getMatch(prediction.matchId);
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

export function fixtureBundles(): FixtureBundle[] {
  const agents = listAgents();
  return listMatches().map((match) => {
    const preds = predictionsByMatch(match.id);
    const predicted = new Set(preds.map((p) => p.agentId));
    const predictions = preds
      .map((prediction) => {
        const agent = getAgent(prediction.agentId);
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

export function receiptBundle(id: string): ReceiptBundle | null {
  const prediction = getPrediction(id);
  if (!prediction) return null;
  const agent = getAgent(prediction.agentId);
  const match = getMatch(prediction.matchId);
  if (!agent || !match) return null;
  return { prediction, agent, match };
}
