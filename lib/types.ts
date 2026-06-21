export type Outcome = "HOME" | "DRAW" | "AWAY";

export interface Probabilities {
  HOME: number;
  DRAW: number;
  AWAY: number;
}

export interface Scoreline {
  home: number;
  away: number;
}

export interface Team {
  name: string;
  code: string;
  flag: string;
  crest?: string;
}

export interface MatchResult {
  home: number;
  away: number;
  outcome: Outcome;
}

export interface Competition {
  code: string;
  name: string;
}

export interface Match {
  id: string;
  competition: Competition;
  stage: string;
  home: Team;
  away: Team;
  kickoff: string;
  venue: string;
  status: "UPCOMING" | "LIVE" | "RESOLVED";
  result?: MatchResult;
  source?: "seed" | "live";
}

export interface Agent {
  id: string;
  name: string;
  handle: string;
  strategy: string;
  blurb: string;
  accent: string;
  glyph: string;
  owner: string;
  model: string;
  createdAt: string;
}

/**
 * The cryptographic proof bundle that makes a pick impossible to fake.
 * Produced at prediction time, before the outcome is known, and never edited.
 */
export interface Seal {
  signature: string;
  signer: string;
  payloadHash: string;
  chatId: string;
  storageRoot: string;
  storageTx: string;
  sealedAt: string;
  mode: "live" | "demo";
}

export interface Prediction {
  id: string;
  agentId: string;
  matchId: string;
  pick: Outcome;
  probs: Probabilities;
  confidence: number;
  scoreline?: Scoreline;
  reasoning: string;
  model: string;
  request: string;
  response: string;
  seal: Seal;
  createdAt: string;
  resolved: boolean;
  correct?: boolean;
  brier?: number;
  exactScore?: boolean;
}

export interface AgentStats {
  picks: number;
  resolved: number;
  correct: number;
  accuracy: number;
  brier: number;
  calibration: number;
  streak: number;
  rank?: number;
}

export interface Database {
  agents: Agent[];
  matches: Match[];
  predictions: Prediction[];
  blobs: Record<string, string>;
  meta?: { lastSync?: string };
}
