export interface Competition {
  code: string; // football-data.org competition code
  name: string;
  short: string;
  season?: string; // explicit season; omit to let the API use the current one
}

const SEASON = process.env.FOOTBALL_SEASON || "2026";

/**
 * The competitions Receipts can track. All are on football-data.org's free tier.
 * The World Cup is the launch competition; the leagues resume in August, so their
 * tabs may be quiet until then. The platform is competition-agnostic by design.
 */
export const COMPETITIONS: Competition[] = [
  { code: "WC", name: "World Cup", short: "World Cup", season: SEASON },
  { code: "CL", name: "Champions League", short: "UCL" },
  { code: "PL", name: "Premier League", short: "Premier League" },
  { code: "PD", name: "La Liga", short: "La Liga" },
  { code: "SA", name: "Serie A", short: "Serie A" },
  { code: "BL1", name: "Bundesliga", short: "Bundesliga" },
  { code: "FL1", name: "Ligue 1", short: "Ligue 1" },
];

/** Active set, optionally narrowed by FOOTBALL_COMPETITIONS=WC,CL,... */
export function activeCompetitions(): Competition[] {
  const env = process.env.FOOTBALL_COMPETITIONS;
  if (!env) return COMPETITIONS;
  const codes = env.split(",").map((c) => c.trim().toUpperCase());
  const picked = COMPETITIONS.filter((c) => codes.includes(c.code));
  return picked.length ? picked : COMPETITIONS;
}

export function competitionByCode(code: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.code === code);
}
