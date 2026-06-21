import type { Agent, Match, Outcome, Probabilities, Scoreline } from "../types";
import { topPick } from "../scoring";
import { computeLive, ogConfig } from "./mode";

export interface InferenceResult {
  probs: Probabilities;
  pick: Outcome;
  confidence: number;
  scoreline: Scoreline;
  reasoning: string;
  request: string;
  response: string;
  model: string;
  chatId: string;
}

// Rough strength priors (0..1, ~ FIFA/Elo): shape demo forecasts and ground the
// live model so it stops defaulting to the first-listed team. It still makes the
// call; this is just the context a human analyst would have open.
const STRENGTH: Record<string, number> = {
  ARG: 0.93, FRA: 0.92, ESP: 0.9, BRA: 0.89, ENG: 0.88, POR: 0.86, NED: 0.84, GER: 0.84, ITA: 0.83,
  BEL: 0.8, CRO: 0.8, URU: 0.8, COL: 0.79, MAR: 0.8, SEN: 0.78, JPN: 0.78, SUI: 0.77, DEN: 0.77,
  NOR: 0.76, MEX: 0.75, USA: 0.75, AUT: 0.74, TUR: 0.74, ALG: 0.74, CIV: 0.74, SRB: 0.74, NGA: 0.74,
  EGY: 0.73, ECU: 0.73, SWE: 0.73, KOR: 0.73, CZE: 0.72, UKR: 0.71, IRN: 0.71, SCO: 0.71, CAN: 0.71,
  CMR: 0.7, POL: 0.7, GHA: 0.69, PAR: 0.68, PER: 0.67, CHI: 0.67, TUN: 0.67, RSA: 0.67, AUS: 0.67,
  BIH: 0.66, COD: 0.64, QAT: 0.63, UZB: 0.62, CRC: 0.62, JAM: 0.61, KSA: 0.61, PAN: 0.58, IRQ: 0.58,
  CPV: 0.56, NZL: 0.55, JOR: 0.53, HAI: 0.5, CUW: 0.46,
};
function strength(code: string): number {
  return STRENGTH[code] ?? 0.6; // neutral default for placeholders / unknown
}
// We only keep priors for national teams. Used to decide whether to feed the model
// a strength line or let it judge club quality from its own knowledge.
function rated(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(STRENGTH, code);
}

function tier(v: number): string {
  if (v >= 0.86) return "elite";
  if (v >= 0.78) return "very strong";
  if (v >= 0.7) return "solid";
  if (v >= 0.6) return "mid-tier";
  return "lower-tier";
}

// Deterministic per-(agent, match) randomness so demo forecasts are stable.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Style {
  homeBias: number;
  underdogBias: number;
  drawBias: number;
  sharpen: number;
  label: string;
}
function deriveStyle(strategy: string): Style {
  const s = strategy.toLowerCase();
  const has = (...words: string[]) => words.some((w) => s.includes(w));
  return {
    homeBias: has("home", "host", "fortress", "crowd") ? 0.14 : 0,
    underdogBias: has("underdog", "upset", "dark horse", "longshot", "contrarian")
      ? 0.18
      : 0,
    drawBias: has("draw", "cagey", "defensive", "low scoring", "tight") ? 0.12 : 0,
    sharpen: has("xg", "model", "quant", "data", "calibrat", "expected goals")
      ? 0.7
      : has("chaos", "vibe", "gut", "coin", "random")
        ? -0.55
        : 0.1,
    label: has("xg", "model", "quant", "data")
      ? "model-driven"
      : has("chaos", "vibe", "gut")
        ? "intuition-led"
        : has("underdog", "upset")
          ? "contrarian"
          : "balanced",
  };
}

// Relative-strength grounding so the model anchors on quality, not list position.
function strengthContext(match: Match): string {
  // No prior table for clubs: let the model judge from its own knowledge (it knows
  // famous clubs well) rather than feed it a misleading flat/equal rating.
  if (!rated(match.home.code) || !rated(match.away.code)) {
    return `Judge the favourite yourself from what you know of each club: recent form, squad quality, league position, and home advantage. Do not treat the two clubs as automatically equal, and do not let the order they are listed influence your call.`;
  }
  const h = strength(match.home.code);
  const a = strength(match.away.code);
  const sH = Math.round(h * 100);
  const sA = Math.round(a * 100);
  const gap = Math.abs(sH - sA);
  const head = `STRENGTH (rough, 0-100, higher is better): ${match.home.name} ${sH} (${tier(h)}), ${match.away.name} ${sA} (${tier(a)}). The fixture order is administrative; it does NOT indicate home or favourite.`;

  // Name the favourite outright (qwen-7b won't infer direction from raw numbers).
  // This is grounding, not the call: the model still sets the probs, score and
  // reasoning, and a contrarian agent can still back the upset.
  if (gap < 6) {
    return `${head} The two sides are closely matched (gap ${gap}); expect a tight game that can go either way, with a real chance of a draw.`;
  }
  const stronger = sH >= sA ? match.home.name : match.away.name;
  const weaker = sH >= sA ? match.away.name : match.home.name;
  if (gap >= 18) {
    return `${head} On quality this is a clear mismatch (gap ${gap}): ${stronger} is much stronger and should be a strong favourite (roughly 65-85%), most likely winning by two or more goals. ${weaker} winning would be a major upset. Make the probabilities and scoreline reflect that.`;
  }
  return `${head} On quality ${stronger} is the better side and should be favoured to win (roughly 50-65%); ${weaker} is the underdog and is less likely to win, though it can keep it close. Favour ${stronger} by about a goal. Do not pick ${weaker} unless your strategy gives a deliberate contrarian reason. Make the probabilities and scoreline reflect that.`;
}

// Venue context (grounding, not an instruction): the World Cup is single-host, so
// matches are neutral sites unless a host nation plays; leagues are real home/away.
function venueNote(match: Match): string {
  const where = match.venue ? ` at ${match.venue}` : "";
  if (match.competition.code === "WC") {
    const HOSTS = new Set(["USA", "MEX", "CAN"]);
    const host = HOSTS.has(match.home.code)
      ? match.home.name
      : HOSTS.has(match.away.code)
        ? match.away.name
        : null;
    return host
      ? `VENUE: World Cup${where}, in the host country. ${host} (a host nation) has home support; the other side does not.`
      : `VENUE: World Cup${where}, a neutral site in the host country (USA/Canada/Mexico). Neither team is playing at home.`;
  }
  return `VENUE: ${match.home.name}'s home ground${where}.`;
}

// A blunt, concrete instruction per archetype so a small model actually leans
// into the strategy instead of defaulting to the obvious favourite.
function personaDirective(strategy: string): string {
  const style = deriveStyle(strategy);
  const lines: string[] = [];
  if (style.label === "contrarian" || style.underdogBias > 0) {
    lines.push(
      "You hunt upsets. Shade probability toward the WEAKER side well beyond the market: give the underdog noticeably more chance than consensus, and predict a tight, low-margin scoreline. Do not just rubber-stamp the favourite.",
    );
  }
  if (style.label === "model-driven") {
    lines.push(
      "You are a cold xG/data modeller. Be calibrated, avoid extreme confidence, and base the call on shot quality and expected goals. Predict a realistic, low-variance scoreline.",
    );
  }
  if (style.label === "intuition-led") {
    lines.push(
      "You forecast on instinct and tournament energy. Be bold: be willing to call upsets and unusual scorelines that a cautious model would never pick.",
    );
  }
  if (style.drawBias > 0) {
    lines.push(
      "You believe tight, low-scoring football wins tournaments. Price the DRAW as a top outcome (often your pick) and predict a low score such as 0-0 or 1-1.",
    );
  }
  if (style.homeBias > 0) {
    lines.push(
      "You back the home side and crowd hard: lean clearly toward the home team and a home win.",
    );
  }
  if (lines.length === 0) {
    lines.push(
      "Read the game on its merits, weighing form, rest and matchups. Keep the draw genuinely live.",
    );
  }
  return lines.join(" ");
}

// The demo-mode strength engine: a logistic on the rating gap, then shaped by style.
function forecast(agent: Agent, match: Match): {
  probs: Probabilities;
  scoreline: Scoreline;
  reasoning: string;
} {
  const style = deriveStyle(agent.strategy);
  const rng = mulberry32(fnv1a(agent.id + ":" + match.id));
  const sH = strength(match.home.code);
  const sA = strength(match.away.code);

  // The World Cup is at neutral venues in the host countries, so the nominal
  // "home" side has no real home advantage unless it is a host nation.
  const HOSTS = new Set(["USA", "MEX", "CAN"]);
  const neutral = match.competition.code === "WC" && !HOSTS.has(match.home.code);
  const homeAdv = neutral ? 0 : 0.12 + style.homeBias;
  const diff = sH + homeAdv - sA;
  const logistic = (x: number) => 1 / (1 + Math.exp(-x));

  let pHomeWin = logistic(4 * diff + (rng() - 0.5) * 0.6);
  let pAwayWin = 1 - pHomeWin;

  let draw = 0.3 - 0.42 * Math.abs(diff) + style.drawBias + (rng() - 0.5) * 0.08;
  draw = Math.min(0.42, Math.max(0.08, draw));

  let h = pHomeWin * (1 - draw);
  let a = pAwayWin * (1 - draw);
  let d = draw;

  // contrarian: bleed probability from the favourite toward the underdog
  if (style.underdogBias > 0) {
    if (h > a) {
      const shift = h * style.underdogBias;
      h -= shift;
      a += shift;
    } else {
      const shift = a * style.underdogBias;
      a -= shift;
      h += shift;
    }
  }

  // sharpen (>0 confident, <0 chaotic toward uniform)
  const sh = style.sharpen;
  const apply = (p: number) =>
    sh >= 0 ? Math.pow(p, 1 + sh) : p + (1 / 3 - p) * Math.abs(sh);
  h = apply(h);
  a = apply(a);
  d = apply(d);

  const sum = h + a + d;
  let probs: Probabilities = {
    HOME: h / sum,
    DRAW: d / sum,
    AWAY: a / sum,
  };
  probs = roundProbs(probs);

  const scoreline = predictScore(topPick(probs), style, rng);
  return { probs, scoreline, reasoning: writeReasoning(agent, match, probs, style, rng) };
}

// A plausible full-time scoreline consistent with the pick and the style.
function predictScore(pick: Outcome, style: Style, rng: () => number): Scoreline {
  const lowScoring = style.drawBias > 0; // defensive agents lean to tighter games
  const big = () => (rng() < (lowScoring ? 0.15 : 0.35) ? 1 : 0); // chance of an extra goal
  if (pick === "DRAW") {
    const g = rng() < (lowScoring ? 0.55 : 0.35) ? (rng() < 0.5 ? 0 : 1) : 1 + big();
    return { home: g, away: g };
  }
  const winner = 1 + (rng() < 0.5 ? 1 : 0) + big(); // 1..3
  const loser = rng() < (lowScoring ? 0.65 : 0.4) ? 0 : 1;
  return pick === "HOME" ? { home: winner, away: loser } : { home: loser, away: winner };
}

function roundProbs(p: Probabilities): Probabilities {
  const out = {
    HOME: Math.round(p.HOME * 100),
    DRAW: Math.round(p.DRAW * 100),
    AWAY: Math.round(p.AWAY * 100),
  };
  // fix rounding drift so the three always sum to 100
  const drift = 100 - (out.HOME + out.DRAW + out.AWAY);
  const keys: Outcome[] = ["HOME", "DRAW", "AWAY"];
  keys.sort((x, y) => out[y] - out[x]);
  out[keys[0]] += drift;
  return { HOME: out.HOME / 100, DRAW: out.DRAW / 100, AWAY: out.AWAY / 100 };
}

function writeReasoning(
  agent: Agent,
  match: Match,
  probs: Probabilities,
  style: Style,
  rng: () => number,
): string {
  const pick = topPick(probs);
  const fav = probs.HOME >= probs.AWAY ? match.home : match.away;
  const dog = probs.HOME >= probs.AWAY ? match.away : match.home;
  const pct = Math.round(Math.max(probs.HOME, probs.DRAW, probs.AWAY) * 100);
  const pickName =
    pick === "HOME" ? match.home.name : pick === "AWAY" ? match.away.name : "the draw";

  const banks: Record<string, string[]> = {
    "model-driven": [
      `Running the numbers on ${match.home.name} vs ${match.away.name}: the expected-goals split favours ${pickName} once you adjust for finishing variance. I land at ${pct}% and I am holding that line, not the public one.`,
      `Shot quality and chance creation point one way here. ${fav.name} generate the cleaner looks, but ${dog.name} suppress xG well enough that I keep this ${pct}% rather than overpricing it.`,
    ],
    "intuition-led": [
      `No spreadsheet on this one. ${match.home.name} vs ${match.away.name} smells like a game that ignores the form book, so I am taking ${pickName} at ${pct}% and letting it ride.`,
      `Knockout nights do strange things. The vibe says ${pickName}. I am comfortable at ${pct}% and comfortable being wrong loudly.`,
    ],
    contrarian: [
      `Everyone is on ${fav.name}. That is exactly why I am fading them. ${dog.name} have the legs to turn this into chaos, and I price ${pickName} at ${pct}%.`,
      `The favourite tag on ${fav.name} is doing a lot of work it has not earned. I take ${pickName} at ${pct}% and dare the bracket to laugh.`,
    ],
    balanced: [
      `${match.home.name} vs ${match.away.name} is closer than the names suggest. Weighing form, rest and matchups, I settle on ${pickName} at ${pct}%.`,
      `Reading this one straight down the middle: ${fav.name} edge it on paper, but I keep ${pickName} honest at ${pct}% with the draw live.`,
    ],
  };
  const bank = banks[style.label] ?? banks.balanced;
  const base = bank[Math.floor(rng() * bank.length)];
  const draws =
    probs.DRAW > 0.3 ? " The draw is genuinely in play; ninety minutes may not settle it." : "";
  return base + draws;
}

export function demoInference(agent: Agent, match: Match): InferenceResult {
  const request = buildPrompt(agent, match);
  const { probs, scoreline, reasoning } = forecast(agent, match);
  const pick = topPick(probs);
  const { hk, ak } = outputKeys(match);
  // Emit the same name-keyed shape the live model is asked for, so the sealed
  // request/response pair is internally consistent in both modes.
  const response = JSON.stringify({
    [`prob_${hk}`]: round2(probs.HOME),
    [`prob_${ak}`]: round2(probs.AWAY),
    prob_draw: round2(probs.DRAW),
    winner: pick === "HOME" ? match.home.name : pick === "AWAY" ? match.away.name : "Draw",
    [`goals_${hk}`]: scoreline.home,
    [`goals_${ak}`]: scoreline.away,
    reasoning,
  });
  return {
    probs,
    pick,
    confidence: Math.max(probs.HOME, probs.DRAW, probs.AWAY),
    scoreline,
    reasoning,
    request,
    response,
    model: agent.model,
    chatId: "demo-" + fnv1a(agent.id + match.id).toString(16),
  };
}

export async function runInference(agent: Agent, match: Match): Promise<InferenceResult> {
  if (computeLive()) {
    try {
      return await liveInference(agent, match, buildPrompt(agent, match));
    } catch (err) {
      console.error("[0G Compute] live inference failed, falling back:", err);
    }
  }
  return demoInference(agent, match);
}

// Keys for the model's JSON, derived from each side's code. Keying the output by
// TEAM (not HOME/AWAY slots) is what stops qwen-7b defaulting to the first-listed
// side: with named keys it reasons about the teams, not their position.
function outputKeys(match: Match): { hk: string; ak: string } {
  const clean = (c: string) => (c || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  let hk = clean(match.home.code) || "HOME";
  let ak = clean(match.away.code) || "AWAY";
  if (hk === ak) {
    hk = `${hk}_H`;
    ak = `${ak}_A`;
  }
  return { hk, ak };
}

function buildPrompt(agent: Agent, match: Match): string {
  const { hk, ak } = outputKeys(match);
  return [
    `You are "${agent.name}", a football forecaster with a STRONG, distinctive style.`,
    `Your strategy, which you follow aggressively even when it disagrees with the obvious favourite:`,
    `"${agent.strategy}"`,
    ``,
    `Stay fully in character. Your probabilities, pick and score MUST reflect this strategy, not the`,
    `market consensus. Two different strategies should produce visibly different numbers.`,
    `How you must apply your strategy: ${personaDirective(agent.strategy)}`,
    ``,
    `MATCH: ${match.competition.name} · ${match.stage}`,
    `${match.home.name} (${hk}) vs ${match.away.name} (${ak})`,
    venueNote(match),
    strengthContext(match),
    ``,
    `Give a win probability for each team plus the draw (the three sum to about 1.0), name the most`,
    `likely winner, and predict the exact full-time score (integer goals for each side).`,
    ``,
    `Respond ONLY with strict JSON, no markdown, no prose outside it:`,
    `{"prob_${hk}":0.0-1.0,"prob_${ak}":0.0-1.0,"prob_draw":0.0-1.0,"winner":"${match.home.name}|${match.away.name}|Draw","goals_${hk}":0,"goals_${ak}":0,"reasoning":"one or two sentences in your own voice"}`,
    `"winner" must be the team with your highest win probability (or "Draw"), and the goals must agree`,
    `with it (more goals for the winner; equal for a draw).`,
  ].join("\n");
}

// Live 0G Compute: ledger + signer set up once per boot, then cached.
let ledgerReady = false;
const acknowledged = new Set<string>();

async function liveInference(
  agent: Agent,
  match: Match,
  request: string,
): Promise<InferenceResult> {
  // @ts-ignore optional dependency, only installed for live mode
  const broker: any = await import("@0glabs/0g-serving-broker").catch(() => null);
  const { ethers }: any = await import("ethers");
  if (!broker) throw new Error("0g-serving-broker not installed");

  const provider = new ethers.JsonRpcProvider(ogConfig.rpc);
  const wallet = new ethers.Wallet(process.env.OG_PRIVATE_KEY as string, provider);
  const zg = await broker.createZGComputeNetworkBroker(wallet);

  // Ensure the inference ledger exists (min 3 OG to create). Done once per boot.
  if (!ledgerReady) {
    try {
      await zg.ledger.getLedger();
    } catch {
      const amount = Number(process.env.OG_LEDGER_OG || 3);
      await zg.ledger.addLedger(amount);
    }
    ledgerReady = true;
  }

  const providerAddr = ogConfig.provider;
  if (!acknowledged.has(providerAddr)) {
    await zg.inference.acknowledgeProviderSigner(providerAddr).catch(() => {});
    acknowledged.add(providerAddr);
  }
  const { endpoint, model } = await zg.inference.getServiceMetadata(providerAddr);

  const prompt = request;

  // Providers occasionally fail to reach the public RPC to validate a request
  // (transient "EOF"). Retry a few times before falling back to the demo engine.
  let chatId = "";
  let content = "";
  let lastErr = "";
  for (let attempt = 1; attempt <= 4; attempt++) {
    const headers = await zg.inference.getRequestHeaders(providerAddr, prompt);
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        // Some variation so strategies don't collapse to one answer, but low
        // enough that the strength grounding dominates over noise.
        temperature: 0.7,
        top_p: 0.95,
      }),
    });
    const data = await res.json();
    const got = data?.choices?.[0]?.message?.content;
    if (got && !data.error) {
      chatId = res.headers.get("ZG-Res-Key") || data.id || "";
      content = got;
      break;
    }
    lastErr = JSON.stringify(data?.error ?? data).slice(0, 160);
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!content) throw new Error("provider returned no content: " + lastErr);

  // Verify the TEE signature for this response.
  const teeVerified = await zg.inference
    .processResponse(providerAddr, chatId, content)
    .catch(() => false);
  console.log("[0G Compute] response received, TEE verified:", teeVerified);

  const { probs, pick, scoreline, reasoning } = parseLive(content, match);
  return {
    probs,
    pick,
    confidence: Math.max(probs.HOME, probs.DRAW, probs.AWAY),
    scoreline,
    reasoning,
    request: prompt,
    response: content,
    model,
    chatId: chatId || "live",
  };
}

// Pull the model's name-keyed JSON back into the app's HOME/DRAW/AWAY shape. We
// match on the team codes we sent, with several fallbacks so a slightly off-format
// reply still parses instead of collapsing to a uniform default.
function parseLive(
  content: string,
  match: Match,
): { probs: Probabilities; pick: Outcome; scoreline: Scoreline; reasoning: string } {
  const { hk, ak } = outputKeys(match);
  const o = safeParse(content);
  const p = o?.probs && typeof o.probs === "object" ? o.probs : {};

  let ph = num(o[`prob_${hk}`], o.prob_home, o.HOME, p[hk], p.HOME, p.home);
  let pa = num(o[`prob_${ak}`], o.prob_away, o.AWAY, p[ak], p.AWAY, p.away);
  let pd = num(o.prob_draw, o.DRAW, p.DRAW, p.draw);
  if (ph === null && pa === null && pd === null) {
    ph = 0.34;
    pa = 0.33;
    pd = 0.33;
  }
  const probs = normalizeTriple(ph ?? 0, pd ?? 0, pa ?? 0);

  // Pick: prefer the model's explicit "winner" (by name or code), else the top prob.
  const w = String(o.winner ?? o.pick ?? "").toLowerCase();
  const names = (t: { name: string; code: string }) =>
    [t.name.toLowerCase(), t.code.toLowerCase()].filter(Boolean);
  let pick: Outcome;
  if (w && names(match.home).some((n) => w.includes(n))) pick = "HOME";
  else if (w && names(match.away).some((n) => w.includes(n))) pick = "AWAY";
  else if (w.includes("draw")) pick = "DRAW";
  else pick = topPick(probs);

  const gh = num(o[`goals_${hk}`], o.goals_home, o?.score?.home, o.home);
  const ga = num(o[`goals_${ak}`], o.goals_away, o?.score?.away, o.away);
  const scoreline = normalizeScore({ home: gh, away: ga }, pick);

  return { probs, pick, scoreline, reasoning: o.reasoning || o.reason || "" };
}

function num(...vals: any[]): number | null {
  for (const v of vals) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function normalizeTriple(h: number, d: number, a: number): Probabilities {
  h = Math.max(0, h);
  d = Math.max(0, d);
  a = Math.max(0, a);
  const sum = h + d + a || 1;
  return { HOME: h / sum, DRAW: d / sum, AWAY: a / sum };
}

// Coerce the model's score into clean integers that agree with the pick.
function normalizeScore(raw: any, pick: Outcome): Scoreline {
  let home = Math.max(0, Math.round(Number(raw?.home)) || 0);
  let away = Math.max(0, Math.round(Number(raw?.away)) || 0);
  if (pick === "HOME" && home <= away) home = away + 1;
  if (pick === "AWAY" && away <= home) away = home + 1;
  if (pick === "DRAW" && home !== away) away = home;
  return { home, away };
}

function safeParse(s: string): any {
  try {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return { probs: { HOME: 0.34, DRAW: 0.33, AWAY: 0.33 }, reasoning: s.slice(0, 400) };
  }
}
