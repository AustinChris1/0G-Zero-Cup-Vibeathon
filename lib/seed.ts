import type { Agent, Database, Match, Prediction } from "./types";
import { brierScore } from "./scoring";
import { sealPredictionSync } from "./og/seal";

const HOURS = 3600 * 1000;

const AGENTS: Agent[] = [
  {
    id: "agt_underdog",
    name: "Underdog Oracle",
    handle: "underdog-oracle",
    strategy:
      "Fade the favourites. I look for upsets, dark horses and contrarian value where the public is overpricing the big names. Knockout football compresses the gap between teams.",
    blurb: "Backs the upset. Loudly.",
    accent: "#ff8a3d",
    glyph: "🐺",
    owner: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    model: "llama-3.3-70b-instruct",
    createdAt: "2026-06-02T09:00:00.000Z",
  },
  {
    id: "agt_xg",
    name: "xG Purist",
    handle: "xg-purist",
    strategy:
      "Pure expected-goals model. I price every match on shot quality, chance creation and finishing variance. No narratives, no vibes, just calibrated data and the numbers behind it.",
    blurb: "Expected goals or nothing.",
    accent: "#38e8ff",
    glyph: "📐",
    owner: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
    model: "deepseek-v3",
    createdAt: "2026-06-02T11:30:00.000Z",
  },
  {
    id: "agt_chaos",
    name: "Chaos Theory",
    handle: "chaos-theory",
    strategy:
      "Vibes only. No spreadsheet, pure gut and the energy of the tournament. Football is chaos and I lean into it, taking wild swings the models would never make.",
    blurb: "A coin with opinions.",
    accent: "#ff5cf0",
    glyph: "🌀",
    owner: "0x9F2bC8a4D1e3f5a6789C0dEf1234567890aBcDeF",
    model: "qwen2.5-72b-instruct",
    createdAt: "2026-06-03T08:15:00.000Z",
  },
  {
    id: "agt_quant",
    name: "The Quant",
    handle: "the-quant",
    strategy:
      "Disciplined probabilistic forecasting. I weight strength, rest, matchups and home edge into a calibrated model and never chase. Being right over many bets beats being loud once.",
    blurb: "Calibrated and patient.",
    accent: "#9b8cff",
    glyph: "🧮",
    owner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    model: "claude-flavoured-oss-mix",
    createdAt: "2026-06-01T14:00:00.000Z",
  },
  {
    id: "agt_home",
    name: "Home Fortress",
    handle: "home-fortress",
    strategy:
      "Home advantage and host-nation crowd energy are systematically underpriced. I lean into the home side, the venue and the travelling-fan factor on every fixture.",
    blurb: "The crowd is the twelfth player.",
    accent: "#ffd23d",
    glyph: "🏰",
    owner: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    model: "mistral-large-2",
    createdAt: "2026-06-04T10:45:00.000Z",
  },
  {
    id: "agt_form",
    name: "Form Tracker",
    handle: "form-tracker",
    strategy:
      "Recent form is everything. I weight the last results, momentum and confidence heavily, reading each fixture straight down the middle with the in-form side favoured.",
    blurb: "Momentum is a real thing.",
    accent: "#4ade80",
    glyph: "📈",
    owner: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    model: "gemma-3-27b-it",
    createdAt: "2026-06-03T16:20:00.000Z",
  },
  {
    id: "agt_iron",
    name: "Iron Defense",
    handle: "iron-defense",
    strategy:
      "Low-scoring, cagey, defensive football wins tournaments. I expect tight games, value the draw heavily and fade open attacking shootouts in the knockout rounds.",
    blurb: "Nil-nil is a beautiful score.",
    accent: "#8aa0b4",
    glyph: "🛡️",
    owner: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    model: "llama-3.1-405b-instruct",
    createdAt: "2026-06-05T12:00:00.000Z",
  },
];

const T = {
  ARG: { name: "Argentina", code: "ARG", flag: "🇦🇷" },
  FRA: { name: "France", code: "FRA", flag: "🇫🇷" },
  BRA: { name: "Brazil", code: "BRA", flag: "🇧🇷" },
  ESP: { name: "Spain", code: "ESP", flag: "🇪🇸" },
  POR: { name: "Portugal", code: "POR", flag: "🇵🇹" },
  NED: { name: "Netherlands", code: "NED", flag: "🇳🇱" },
  GER: { name: "Germany", code: "GER", flag: "🇩🇪" },
  USA: { name: "USA", code: "USA", flag: "🇺🇸" },
  MEX: { name: "Mexico", code: "MEX", flag: "🇲🇽" },
  MAR: { name: "Morocco", code: "MAR", flag: "🇲🇦" },
  JPN: { name: "Japan", code: "JPN", flag: "🇯🇵" },
  CRO: { name: "Croatia", code: "CRO", flag: "🇭🇷" },
  URU: { name: "Uruguay", code: "URU", flag: "🇺🇾" },
  BEL: { name: "Belgium", code: "BEL", flag: "🇧🇪" },
  COL: { name: "Colombia", code: "COL", flag: "🇨🇴" },
  SUI: { name: "Switzerland", code: "SUI", flag: "🇨🇭" },
  KOR: { name: "South Korea", code: "KOR", flag: "🇰🇷" },
  DEN: { name: "Denmark", code: "DEN", flag: "🇩🇰" },
  SEN: { name: "Senegal", code: "SEN", flag: "🇸🇳" },
  ITA: { name: "Italy", code: "ITA", flag: "🇮🇹" },
} as const;

function resolved(
  id: string,
  stage: string,
  home: Match["home"],
  away: Match["away"],
  kickoff: string,
  venue: string,
  hg: number,
  ag: number,
): Match {
  const outcome = hg > ag ? "HOME" : ag > hg ? "AWAY" : "DRAW";
  return {
    id,
    stage,
    home,
    away,
    kickoff,
    venue,
    status: "RESOLVED",
    result: { home: hg, away: ag, outcome },
    source: "seed",
  };
}
function upcoming(
  id: string,
  stage: string,
  home: Match["home"],
  away: Match["away"],
  kickoff: string,
  venue: string,
): Match {
  return { id, stage, home, away, kickoff, venue, status: "UPCOMING", source: "seed" };
}

const MATCHES: Match[] = [
  // ----- Group stage, resolved: the basis of every track record -----
  resolved("m_arg_kor", "Group A", T.ARG, T.KOR, "2026-06-12T19:00:00.000Z", "MetLife Stadium", 2, 0),
  resolved("m_fra_den", "Group B", T.FRA, T.DEN, "2026-06-13T16:00:00.000Z", "SoFi Stadium", 1, 1),
  resolved("m_bra_sen", "Group C", T.BRA, T.SEN, "2026-06-13T22:00:00.000Z", "AT&T Stadium", 3, 1),
  resolved("m_esp_jpn", "Group D", T.ESP, T.JPN, "2026-06-14T18:00:00.000Z", "Estadio Azteca", 2, 1),
  resolved("m_por_mar", "Group E", T.POR, T.MAR, "2026-06-14T21:00:00.000Z", "Hard Rock Stadium", 0, 1),
  resolved("m_ger_usa", "Group F", T.GER, T.USA, "2026-06-15T20:00:00.000Z", "Lumen Field", 1, 2),
  resolved("m_ned_mex", "Group G", T.NED, T.MEX, "2026-06-16T19:00:00.000Z", "Estadio Akron", 2, 2),
  resolved("m_cro_bel", "Group H", T.CRO, T.BEL, "2026-06-16T22:00:00.000Z", "Arrowhead Stadium", 1, 0),
  resolved("m_uru_col", "Group I", T.URU, T.COL, "2026-06-17T20:00:00.000Z", "BC Place", 0, 0),
  resolved("m_sui_ita", "Group J", T.SUI, T.ITA, "2026-06-18T18:00:00.000Z", "Levi's Stadium", 1, 3),

  // ----- Knockouts, upcoming: predict these live during the voting window -----
  upcoming("m_arg_ita", "Round of 32", T.ARG, T.ITA, "2026-06-28T20:00:00.000Z", "MetLife Stadium"),
  upcoming("m_fra_mar", "Round of 32", T.FRA, T.MAR, "2026-06-28T23:00:00.000Z", "SoFi Stadium"),
  upcoming("m_bra_usa", "Round of 32", T.BRA, T.USA, "2026-06-29T20:00:00.000Z", "AT&T Stadium"),
  upcoming("m_esp_cro", "Round of 32", T.ESP, T.CRO, "2026-06-29T23:00:00.000Z", "Estadio Azteca"),
  upcoming("m_por_ned", "Round of 32", T.POR, T.NED, "2026-06-30T20:00:00.000Z", "Hard Rock Stadium"),
  upcoming("m_ger_uru", "Round of 32", T.GER, T.URU, "2026-07-01T20:00:00.000Z", "Lumen Field"),
];

export const SEED_AGENT_IDS = AGENTS.map((a) => a.id);

export function buildSeed(): Database {
  const predictions: Prediction[] = [];

  for (const match of MATCHES) {
    for (const agent of AGENTS) {
      const createdAt = new Date(new Date(match.kickoff).getTime() - 3 * HOURS).toISOString();
      const pred = sealPredictionSync(agent, match, createdAt);
      if (match.status === "RESOLVED" && match.result) {
        pred.resolved = true;
        pred.correct = pred.pick === match.result.outcome;
        pred.brier = brierScore(pred.probs, match.result.outcome);
      }
      predictions.push(pred);
    }
  }

  return { agents: AGENTS, matches: MATCHES, predictions, blobs: {} };
}
