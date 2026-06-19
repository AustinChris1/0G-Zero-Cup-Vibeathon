import type { Match, MatchResult, Outcome } from "../types";
import { teamFromName } from "./nations";
import { activeCompetitions, type Competition } from "./competitions";

/**
 * Pluggable, multi-competition football data layer. football-data.org (default)
 * covers the World Cup and the major leagues on its free tier. Each adapter
 * normalizes to our Match shape and returns { matches, error } so the sync can
 * surface the real reason and the app can fall back gracefully.
 *
 *   FOOTBALL_PROVIDER = football-data | thesportsdb | api-football
 */
export interface FixturesResponse {
  matches: Match[];
  error?: string;
}

const PROVIDER = (process.env.FOOTBALL_PROVIDER || "football-data").toLowerCase();
const SEASON = process.env.FOOTBALL_SEASON || process.env.API_FOOTBALL_SEASON || "2026";

// Only keep recent results + near-future fixtures so the store stays focused.
const PAST_MS = 12 * 24 * 60 * 60 * 1000;
const FUTURE_MS = 120 * 24 * 60 * 60 * 1000;
function inWindow(m: Match): boolean {
  const t = new Date(m.kickoff).getTime();
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  return t > now - PAST_MS && t < now + FUTURE_MS;
}

export function hasFootballKey(): boolean {
  if (PROVIDER === "thesportsdb") return true;
  if (PROVIDER === "api-football") return Boolean(process.env.API_FOOTBALL_KEY);
  return Boolean(process.env.FOOTBALL_DATA_TOKEN);
}

export async function fetchAllFixtures(): Promise<FixturesResponse> {
  try {
    if (PROVIDER === "thesportsdb") return await fromTheSportsDb();
    if (PROVIDER === "api-football") return await fromApiFootball();
    return await fromFootballData();
  } catch (err) {
    console.error("[football] fetch failed:", err);
    return { matches: [], error: "Network error reaching the football data provider." };
  }
}

/* ---------------------- football-data.org (default) ---------------------- */
async function fromFootballData(): Promise<FixturesResponse> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return { matches: [], error: "No FOOTBALL_DATA_TOKEN set. Get a free one at football-data.org." };
  }
  const comps = activeCompetitions();
  const all: Match[] = [];
  const errors: string[] = [];

  for (const comp of comps) {
    try {
      const { matches, error } = await fetchFootballDataComp(comp, token);
      if (error) errors.push(error);
      all.push(...matches);
    } catch (e) {
      errors.push(`${comp.code}: ${(e as Error).message?.slice(0, 60)}`);
    }
  }

  if (all.length === 0) {
    return { matches: [], error: errors.join(" · ") || "No fixtures returned." };
  }
  return { matches: all };
}

async function fetchFootballDataComp(
  comp: Competition,
  token: string,
): Promise<FixturesResponse> {
  const seasonParam = comp.season ? `?season=${comp.season}` : "";
  const url = `https://api.football-data.org/v4/competitions/${comp.code}/matches${seasonParam}`;
  const res = await fetch(url, { headers: { "X-Auth-Token": token }, cache: "no-store" });
  if (res.status === 403) return { matches: [], error: `${comp.code}: not in your plan` };
  if (res.status === 429) return { matches: [], error: `${comp.code}: rate limited` };
  if (!res.ok) return { matches: [], error: `${comp.code}: HTTP ${res.status}` };
  const data = await res.json();
  if (!Array.isArray(data?.matches)) {
    return { matches: [], error: `${comp.code}: ${data?.message || "no matches"}` };
  }
  const matches = data.matches
    .map((m: any) => normalizeFootballData(m, comp))
    .filter(inWindow);
  return { matches };
}

const FD_LIVE = ["IN_PLAY", "PAUSED", "SUSPENDED"];
function normalizeFootballData(m: any, comp: Competition): Match {
  const status: Match["status"] =
    m.status === "FINISHED" ? "RESOLVED" : FD_LIVE.includes(m.status) ? "LIVE" : "UPCOMING";
  let result: MatchResult | undefined;
  const ft = m.score?.fullTime;
  if (status === "RESOLVED" && typeof ft?.home === "number" && typeof ft?.away === "number") {
    const outcome: Outcome =
      m.score?.winner === "HOME_TEAM"
        ? "HOME"
        : m.score?.winner === "AWAY_TEAM"
          ? "AWAY"
          : ft.home > ft.away
            ? "HOME"
            : ft.away > ft.home
              ? "AWAY"
              : "DRAW";
    result = { home: ft.home, away: ft.away, outcome };
  }
  return {
    id: `${comp.code.toLowerCase()}_${m.id}`,
    competition: { code: comp.code, name: comp.name },
    stage: prettyStage(m.stage) + (m.matchday ? ` · MD ${m.matchday}` : m.group ? ` · ${m.group}` : ""),
    home: teamFromName(m.homeTeam?.name || "TBD", m.homeTeam?.tla, m.homeTeam?.crest),
    away: teamFromName(m.awayTeam?.name || "TBD", m.awayTeam?.tla, m.awayTeam?.crest),
    kickoff: m.utcDate,
    venue: m.venue || "",
    status,
    result,
    source: "live",
  };
}
function prettyStage(s?: string): string {
  if (!s) return "Match";
  const map: Record<string, string> = {
    GROUP_STAGE: "Group Stage",
    LEAGUE_STAGE: "League Stage",
    LAST_32: "Round of 32",
    LAST_16: "Round of 16",
    QUARTER_FINALS: "Quarter-final",
    SEMI_FINALS: "Semi-final",
    THIRD_PLACE: "Third place",
    FINAL: "Final",
    REGULAR_SEASON: "League",
  };
  return map[s] || s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ----------------------------- TheSportsDB ----------------------------- */
async function fromTheSportsDb(): Promise<FixturesResponse> {
  const key = process.env.THESPORTSDB_KEY || "3";
  const league = process.env.THESPORTSDB_WC_ID || "4429";
  const url = `https://www.thesportsdb.com/api/v1/json/${key}/eventsseason.php?id=${league}&s=${SEASON}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { matches: [], error: `TheSportsDB responded ${res.status}.` };
  const data = await res.json();
  if (!Array.isArray(data?.events)) {
    return { matches: [], error: "TheSportsDB returned no events (the free key is limited)." };
  }
  return { matches: data.events.map(normalizeTheSportsDb) };
}
function normalizeTheSportsDb(e: any): Match {
  const hg = e.intHomeScore != null ? Number(e.intHomeScore) : null;
  const ag = e.intAwayScore != null ? Number(e.intAwayScore) : null;
  const finished = /finish|ft|aet|pen/i.test(e.strStatus || "") || (hg != null && ag != null);
  let result: MatchResult | undefined;
  if (finished && hg != null && ag != null) {
    const outcome: Outcome = hg > ag ? "HOME" : ag > hg ? "AWAY" : "DRAW";
    result = { home: hg, away: ag, outcome };
  }
  return {
    id: "wc_" + e.idEvent,
    competition: { code: "WC", name: "World Cup" },
    stage: e.strRound && e.strRound !== "0" ? `World Cup · Round ${e.strRound}` : "World Cup",
    home: teamFromName(e.strHomeTeam || "TBD", undefined, e.strHomeTeamBadge),
    away: teamFromName(e.strAwayTeam || "TBD", undefined, e.strAwayTeamBadge),
    kickoff: e.strTimestamp || `${e.dateEvent}T${(e.strTime || "18:00:00").slice(0, 8)}Z`,
    venue: e.strVenue || "",
    status: finished ? "RESOLVED" : "UPCOMING",
    result,
    source: "live",
  };
}

/* ----------------------------- API-Football ----------------------------- */
async function fromApiFootball(): Promise<FixturesResponse> {
  const key = process.env.API_FOOTBALL_KEY || "";
  if (!key) return { matches: [], error: "No API_FOOTBALL_KEY set." };
  const host = process.env.API_FOOTBALL_HOST || "v3.football.api-sports.io";
  const league = process.env.API_FOOTBALL_LEAGUE || "1";
  const url = `https://${host}/fixtures?league=${league}&season=${SEASON}`;
  const headers: Record<string, string> = host.includes("rapidapi")
    ? { "x-rapidapi-key": key, "x-rapidapi-host": host }
    : { "x-apisports-key": key };
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) return { matches: [], error: `API-Football responded ${res.status}.` };
  const data = await res.json();
  const errs = data?.errors;
  const errMsg = Array.isArray(errs)
    ? errs.join("; ")
    : errs && typeof errs === "object" && Object.keys(errs).length
      ? Object.values(errs).join("; ")
      : "";
  if (errMsg) return { matches: [], error: errMsg };
  if (!Array.isArray(data?.response)) return { matches: [], error: "Unexpected API-Football response." };
  return {
    matches: data.response
      .map(normalizeApiFootball)
      .filter((m: Match | null): m is Match => m !== null),
  };
}
const AF_FINAL = ["FT", "AET", "PEN"];
const AF_LIVE = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT", "SUSP"];
function normalizeApiFootball(f: any): Match | null {
  const fx = f?.fixture;
  const t = f?.teams;
  const g = f?.goals;
  const lg = f?.league;
  if (!fx?.id || !t?.home?.name || !t?.away?.name) return null;
  const short: string = fx.status?.short ?? "NS";
  const status: Match["status"] = AF_FINAL.includes(short)
    ? "RESOLVED"
    : AF_LIVE.includes(short)
      ? "LIVE"
      : "UPCOMING";
  let result: MatchResult | undefined;
  if (status === "RESOLVED" && typeof g?.home === "number" && typeof g?.away === "number") {
    const outcome: Outcome = g.home > g.away ? "HOME" : g.away > g.home ? "AWAY" : "DRAW";
    result = { home: g.home, away: g.away, outcome };
  }
  return {
    id: "wc_" + fx.id,
    competition: { code: "WC", name: "World Cup" },
    stage: lg?.round || "World Cup",
    home: teamFromName(t.home.name),
    away: teamFromName(t.away.name),
    kickoff: fx.date,
    venue: [fx.venue?.name, fx.venue?.city].filter(Boolean).join(", ") || "",
    status,
    result,
    source: "live",
  };
}
