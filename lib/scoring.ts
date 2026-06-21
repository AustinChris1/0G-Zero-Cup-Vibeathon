import type { Agent, AgentStats, Outcome, Prediction, Probabilities } from "./types";

/**
 * Multi-class Brier score for a single prediction.
 * Sum over outcomes of (predicted_prob - actual)^2, where actual is 1 for the
 * outcome that happened and 0 otherwise. Range 0 (perfect) .. 2 (worst).
 */
export function brierScore(probs: Probabilities, actual: Outcome): number {
  const outcomes: Outcome[] = ["HOME", "DRAW", "AWAY"];
  return outcomes.reduce((sum, o) => {
    const actualVal = o === actual ? 1 : 0;
    const diff = probs[o] - actualVal;
    return sum + diff * diff;
  }, 0);
}

export function topPick(probs: Probabilities): Outcome {
  const entries = Object.entries(probs) as [Outcome, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/**
 * Reliability / calibration: bucket predictions by stated confidence and
 * compare the average confidence to the realised hit-rate in each bucket.
 * Returns 1 for perfect calibration, decaying toward 0 as the gap widens.
 */
export function calibration(predictions: Prediction[]): number {
  const resolved = predictions.filter((p) => p.resolved && p.correct !== undefined);
  if (resolved.length === 0) return 0;
  const buckets = new Map<number, { conf: number; hit: number; n: number }>();
  for (const p of resolved) {
    const b = Math.min(9, Math.floor(p.confidence * 10));
    const cur = buckets.get(b) ?? { conf: 0, hit: 0, n: 0 };
    cur.conf += p.confidence;
    cur.hit += p.correct ? 1 : 0;
    cur.n += 1;
    buckets.set(b, cur);
  }
  let weightedGap = 0;
  let total = 0;
  for (const { conf, hit, n } of buckets.values()) {
    const avgConf = conf / n;
    const hitRate = hit / n;
    weightedGap += Math.abs(avgConf - hitRate) * n;
    total += n;
  }
  const meanGap = total ? weightedGap / total : 1;
  return Math.max(0, 1 - meanGap * 2);
}

export function currentStreak(predictions: Prediction[]): number {
  const resolved = predictions
    .filter((p) => p.resolved && p.correct !== undefined)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (resolved.length === 0) return 0;
  const wins = resolved[0].correct;
  let streak = 0;
  for (const p of resolved) {
    if (p.correct === wins) streak += 1;
    else break;
  }
  return wins ? streak : -streak;
}

export function computeStats(predictions: Prediction[]): AgentStats {
  const resolved = predictions.filter((p) => p.resolved && p.correct !== undefined);
  const correct = resolved.filter((p) => p.correct).length;
  const brierSum = resolved.reduce((s, p) => s + (p.brier ?? 0), 0);
  return {
    picks: predictions.length,
    resolved: resolved.length,
    correct,
    accuracy: resolved.length ? correct / resolved.length : 0,
    brier: resolved.length ? brierSum / resolved.length : 0,
    calibration: calibration(predictions),
    streak: currentStreak(predictions),
  };
}

export interface RankedAgent {
  agent: Agent;
  stats: AgentStats;
  score: number;
}

/**
 * Leaderboard score. We reward low Brier (skill + calibration) and apply a
 * mild penalty for thin sample sizes so a lucky 1-of-1 cannot top a proven 30.
 */
export function leaderboardScore(stats: AgentStats): number {
  if (stats.resolved === 0) return 0;
  const skill = (2 - stats.brier) / 2; // 0..1, higher is better
  const confidencePenalty = Math.min(1, stats.resolved / 12); // ramps over first dozen
  return skill * (0.55 + 0.45 * confidencePenalty);
}

export function rankAgents(agents: Agent[], predictions: Prediction[]): RankedAgent[] {
  const byAgent = new Map<string, Prediction[]>();
  for (const p of predictions) {
    const arr = byAgent.get(p.agentId);
    if (arr) arr.push(p);
    else byAgent.set(p.agentId, [p]);
  }
  const ranked = agents.map((agent) => {
    const stats = computeStats(byAgent.get(agent.id) ?? []);
    return { agent, stats, score: leaderboardScore(stats) };
  });
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.stats.brier - b.stats.brier;
  });
  ranked.forEach((r, i) => (r.stats.rank = i + 1));
  return ranked;
}
