import type { Agent, Match, Outcome, Probabilities } from "../types";
import { topPick } from "../scoring";
import { computeLive, ogConfig } from "./mode";

export interface InferenceResult {
  probs: Probabilities;
  pick: Outcome;
  confidence: number;
  reasoning: string;
  request: string;
  response: string;
  model: string;
  chatId: string;
}

/* ------------------------------ team ratings ------------------------------ */
// Rough strength priors (0..1) so demo forecasts track real-ish expectations.
const STRENGTH: Record<string, number> = {
  ARG: 0.92, FRA: 0.9, BRA: 0.88, ENG: 0.86, ESP: 0.87, POR: 0.84,
  NED: 0.82, GER: 0.83, BEL: 0.78, CRO: 0.76, URU: 0.77, USA: 0.66,
  MEX: 0.64, MAR: 0.72, JPN: 0.68, SEN: 0.67, COL: 0.71, SUI: 0.65,
  KOR: 0.63, DEN: 0.69, ITA: 0.8, CAN: 0.6,
};
function strength(code: string): number {
  if (STRENGTH[code] !== undefined) return STRENGTH[code];
  // deterministic fallback for any unseen code
  return 0.5 + (fnv1a(code) % 30) / 100;
}

/* ------------------------- deterministic randomness ------------------------- */
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

/* ---------------------------- strategy -> style ---------------------------- */
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

/* ------------------------------ the forecast ------------------------------ */
function forecast(agent: Agent, match: Match): {
  probs: Probabilities;
  reasoning: string;
} {
  const style = deriveStyle(agent.strategy);
  const rng = mulberry32(fnv1a(agent.id + ":" + match.id));
  const sH = strength(match.home.code);
  const sA = strength(match.away.code);

  const homeAdv = 0.12 + style.homeBias;
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

  return { probs, reasoning: writeReasoning(agent, match, probs, style, rng) };
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

/* ------------------------------ public API ------------------------------ */
export function demoInference(agent: Agent, match: Match): InferenceResult {
  const request = buildPrompt(agent, match);
  const { probs, reasoning } = forecast(agent, match);
  const pick = topPick(probs);
  const response = JSON.stringify({ probs, pick, reasoning });
  return {
    probs,
    pick,
    confidence: Math.max(probs.HOME, probs.DRAW, probs.AWAY),
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

function buildPrompt(agent: Agent, match: Match): string {
  return [
    `You are "${agent.name}", a football forecaster with a STRONG, distinctive style.`,
    `Your strategy, which you follow aggressively even when it disagrees with the obvious favourite:`,
    `"${agent.strategy}"`,
    ``,
    `Stay fully in character. Your probabilities and your pick MUST reflect this strategy, not the`,
    `market consensus. If your strategy favours underdogs, lean to the weaker side. If it favours`,
    `the draw, price the draw clearly higher. If it is data or form driven, commit to that read. If`,
    `it is chaos, be bold. Two different strategies should produce visibly different calls.`,
    ``,
    `FIXTURE: ${match.competition.name} · ${match.stage}`,
    `${match.home.name} (${match.home.code}, home) vs ${match.away.name} (${match.away.code}, away)`,
    ``,
    `Respond ONLY with strict JSON, no markdown, no prose outside it:`,
    `{"probs":{"HOME":0.0-1.0,"DRAW":0.0-1.0,"AWAY":0.0-1.0},"pick":"HOME|DRAW|AWAY","reasoning":"one or two sentences in your own voice"}`,
    `The three probabilities must sum to about 1.0 and "pick" must be your highest-probability outcome.`,
  ].join("\n");
}

/* ----------------------------- live 0G Compute ----------------------------- */
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

  const parsed = safeParse(content);
  const probs = normalize(parsed.probs);
  const pick = (parsed.pick as Outcome) || topPick(probs);
  return {
    probs,
    pick,
    confidence: Math.max(probs.HOME, probs.DRAW, probs.AWAY),
    reasoning: parsed.reasoning || "",
    request: prompt,
    response: content,
    model,
    chatId: chatId || "live",
  };
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
function normalize(p: any): Probabilities {
  const h = Number(p?.HOME) || 0.34;
  const d = Number(p?.DRAW) || 0.33;
  const a = Number(p?.AWAY) || 0.33;
  const sum = h + d + a || 1;
  return { HOME: h / sum, DRAW: d / sum, AWAY: a / sum };
}
