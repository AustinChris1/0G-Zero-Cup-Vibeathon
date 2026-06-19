import type { Team } from "../types";

/**
 * API-Football returns team names, not 3-letter codes or flag emoji. Map the
 * names we care about; anything unmapped falls back to a derived code and a
 * neutral globe so the UI never breaks on an unexpected nation.
 */
const NATIONS: Record<string, { code: string; flag: string }> = {
  Argentina: { code: "ARG", flag: "🇦🇷" },
  France: { code: "FRA", flag: "🇫🇷" },
  Brazil: { code: "BRA", flag: "🇧🇷" },
  Spain: { code: "ESP", flag: "🇪🇸" },
  Portugal: { code: "POR", flag: "🇵🇹" },
  Netherlands: { code: "NED", flag: "🇳🇱" },
  Germany: { code: "GER", flag: "🇩🇪" },
  England: { code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "USA": { code: "USA", flag: "🇺🇸" },
  "United States": { code: "USA", flag: "🇺🇸" },
  Mexico: { code: "MEX", flag: "🇲🇽" },
  Canada: { code: "CAN", flag: "🇨🇦" },
  Morocco: { code: "MAR", flag: "🇲🇦" },
  Japan: { code: "JPN", flag: "🇯🇵" },
  Croatia: { code: "CRO", flag: "🇭🇷" },
  Uruguay: { code: "URU", flag: "🇺🇾" },
  Belgium: { code: "BEL", flag: "🇧🇪" },
  Colombia: { code: "COL", flag: "🇨🇴" },
  Switzerland: { code: "SUI", flag: "🇨🇭" },
  "South Korea": { code: "KOR", flag: "🇰🇷" },
  "Korea Republic": { code: "KOR", flag: "🇰🇷" },
  Denmark: { code: "DEN", flag: "🇩🇰" },
  Senegal: { code: "SEN", flag: "🇸🇳" },
  Italy: { code: "ITA", flag: "🇮🇹" },
  Poland: { code: "POL", flag: "🇵🇱" },
  Serbia: { code: "SRB", flag: "🇷🇸" },
  Ecuador: { code: "ECU", flag: "🇪🇨" },
  Australia: { code: "AUS", flag: "🇦🇺" },
  Ghana: { code: "GHA", flag: "🇬🇭" },
  Nigeria: { code: "NGA", flag: "🇳🇬" },
  "Ivory Coast": { code: "CIV", flag: "🇨🇮" },
  Cameroon: { code: "CMR", flag: "🇨🇲" },
  Tunisia: { code: "TUN", flag: "🇹🇳" },
  Egypt: { code: "EGY", flag: "🇪🇬" },
  Algeria: { code: "ALG", flag: "🇩🇿" },
  "Saudi Arabia": { code: "KSA", flag: "🇸🇦" },
  Qatar: { code: "QAT", flag: "🇶🇦" },
  Iran: { code: "IRN", flag: "🇮🇷" },
  "IR Iran": { code: "IRN", flag: "🇮🇷" },
  Wales: { code: "WAL", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  Scotland: { code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  Austria: { code: "AUT", flag: "🇦🇹" },
  Turkey: { code: "TUR", flag: "🇹🇷" },
  "Türkiye": { code: "TUR", flag: "🇹🇷" },
  Ukraine: { code: "UKR", flag: "🇺🇦" },
  Norway: { code: "NOR", flag: "🇳🇴" },
  Sweden: { code: "SWE", flag: "🇸🇪" },
  Peru: { code: "PER", flag: "🇵🇪" },
  Chile: { code: "CHI", flag: "🇨🇱" },
  Paraguay: { code: "PAR", flag: "🇵🇾" },
  "Costa Rica": { code: "CRC", flag: "🇨🇷" },
  Panama: { code: "PAN", flag: "🇵🇦" },
  Jamaica: { code: "JAM", flag: "🇯🇲" },
  "New Zealand": { code: "NZL", flag: "🇳🇿" },
};

export function teamFromName(name: string, code?: string, crest?: string): Team {
  const hit = NATIONS[name];
  const derived = (code || name.replace(/[^A-Za-z]/g, "").slice(0, 3) || "TBD").toUpperCase();
  if (hit) return { name, code: code?.toUpperCase() || hit.code, flag: hit.flag, crest };
  return { name, code: derived, flag: "🏳️", crest };
}
