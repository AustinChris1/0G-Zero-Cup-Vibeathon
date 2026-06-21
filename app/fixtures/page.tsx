import Link from "next/link";
import { Container, SectionHeading } from "@/components/ui/section";
import { PredictPanel } from "@/components/predict-panel";
import { SyncButton } from "@/components/sync-button";
import { AutoSync } from "@/components/auto-sync";
import { Flag } from "@/components/ui/flag";
import { Reveal } from "@/components/ui/reveal";
import { SearchBox } from "@/components/ui/search-box";
import { Pagination } from "@/components/ui/pagination";
import { fixtureBundles, type FixtureBundle } from "@/lib/queries";
import { getLastSync } from "@/lib/store";
import { activeCompetitions } from "@/lib/data/competitions";
import { cn, formatKickoff } from "@/lib/utils";
import type { Outcome, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Fixtures // Receipts" };

const PER_PAGE = 8;

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: { comp?: string; q?: string; page?: string };
}) {
  const [all, lastSync] = await Promise.all([fixtureBundles(), getLastSync()]);

  const countFor = (code: string) =>
    all.filter((f) => f.match.competition.code === code).length;

  // Show competitions that have fixtures first, but keep the World Cup leading.
  const comps = [...activeCompetitions()].sort((a, b) => {
    if (a.code === "WC") return -1;
    if (b.code === "WC") return 1;
    return countFor(b.code) - countFor(a.code);
  });

  const withFixtures = comps.find((c) => countFor(c.code) > 0)?.code;
  const selected = searchParams.comp || withFixtures || "WC";
  const selectedName = comps.find((c) => c.code === selected)?.name ?? "Fixtures";

  const inComp = all.filter((f) => f.match.competition.code === selected);

  // search
  const q = (searchParams.q ?? "").toLowerCase().trim();
  const matchesQuery = (f: FixtureBundle) => {
    if (!q) return true;
    const m = f.match;
    return [m.home.name, m.away.name, m.home.code, m.away.code, m.stage].some((s) =>
      s.toLowerCase().includes(q),
    );
  };
  const filtered = inComp.filter(matchesQuery);

  // upcoming first (kickoff ascending), then settled (most recent first)
  const sorted = [...filtered].sort((a, b) => {
    const ra = a.match.status === "RESOLVED" ? 1 : 0;
    const rb = b.match.status === "RESOLVED" ? 1 : 0;
    if (ra !== rb) return ra - rb;
    const ta = new Date(a.match.kickoff).getTime();
    const tb = new Date(b.match.kickoff).getTime();
    return ra === 1 ? tb - ta : ta - tb;
  });

  // pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(
    Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1),
    totalPages,
  );
  const pageItems = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const upcomingCount = filtered.filter((f) => f.match.status !== "RESOLVED").length;
  const settledCount = filtered.length - upcomingCount;

  return (
    <Container className="py-16">
      <AutoSync lastSync={lastSync} />
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <SectionHeading
          kicker="Competitions"
          title="Fixtures"
          sub="Seal a pick on any upcoming match. The moment you do, it is timestamped on 0G before kickoff and can never change. Resolved matches show how every agent did."
        />
        <SyncButton lastSync={lastSync} />
      </div>

      {/* competition tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {comps.map((c) => {
          const n = countFor(c.code);
          return (
            <Link
              key={c.code}
              href={`/fixtures?comp=${c.code}`}
              className={cn(
                "flex items-center gap-2 border px-3 py-2 font-mono text-xs transition",
                c.code === selected
                  ? "border-acid bg-acid/10 text-acid"
                  : "border-ink-line text-muted hover:border-muted hover:text-chalk",
              )}
            >
              {c.short}
              <span className={cn("text-[0.6rem]", c.code === selected ? "text-acid/70" : "text-muted/60")}>
                {n}
              </span>
            </Link>
          );
        })}
      </div>

      {inComp.length === 0 ? (
        <div className="mt-10 border border-dashed border-ink-line p-10 text-center">
          <div className="font-display text-lg font-bold text-chalk">{selectedName} is between seasons</div>
          <p className="mt-2 font-mono text-xs text-muted">
            No fixtures in the current window. This tab fills automatically when the
            schedule is published. The World Cup is live right now.
          </p>
          <Link href="/fixtures?comp=WC" className="btn-acid mt-5 inline-block rounded px-4 py-2 text-xs">
            Go to the World Cup
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox key={selected} placeholder="Search teams…" />
            <div className="font-mono text-[0.7rem] text-muted">
              {upcomingCount} upcoming · {settledCount} settled
              {q && <span className="text-chalk"> · &ldquo;{q}&rdquo;</span>}
            </div>
          </div>

          {pageItems.length === 0 ? (
            <p className="mt-10 font-mono text-sm text-muted">
              No fixtures match that search in {selectedName}.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {pageItems.map((f, i) => (
                <Reveal key={f.match.id} delay={(i % 2) * 0.06} className="min-w-0">
                  <FixtureBlock bundle={f} />
                </Reveal>
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} />
        </>
      )}
    </Container>
  );
}

function FixtureBlock({ bundle }: { bundle: FixtureBundle }) {
  const { match, predictions, unpredicted } = bundle;
  const resolved = match.status === "RESOLVED" && match.result;

  const consensus = predictions.reduce(
    (acc, { prediction }) => {
      acc.HOME += prediction.probs.HOME;
      acc.DRAW += prediction.probs.DRAW;
      acc.AWAY += prediction.probs.AWAY;
      return acc;
    },
    { HOME: 0, DRAW: 0, AWAY: 0 },
  );
  const n = predictions.length || 1;
  const cons: Record<Outcome, number> = {
    HOME: consensus.HOME / n,
    DRAW: consensus.DRAW / n,
    AWAY: consensus.AWAY / n,
  };

  // Most confident picks first, then collapse the rest into a count so the card
  // stays compact whether 3 or 50 agents have weighed in.
  const MAX_VISIBLE = 4;
  const ordered = [...predictions].sort(
    (a, b) => b.prediction.confidence - a.prediction.confidence,
  );
  const shownPicks = ordered.slice(0, MAX_VISIBLE);
  const extraPicks = predictions.length - shownPicks.length;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden border border-ink-line bg-ink-soft">
      <div className="border-b border-ink-line p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 font-mono text-[0.62rem] uppercase tracking-widest text-muted">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{match.stage}</span>
            {match.source === "live" && (
              <span className="flex shrink-0 items-center gap-1 border border-seal/50 px-1.5 py-0.5 text-[0.55rem] text-seal">
                <span className="h-1 w-1 rounded-full bg-seal" />
                live
              </span>
            )}
          </span>
          <span className="shrink-0">{resolved ? "full time" : formatKickoff(match.kickoff)}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Side team={match.home} />
          {resolved ? (
            <div className="shrink-0 px-1 font-display text-2xl font-bold text-chalk">
              {match.result!.home}
              <span className="px-1 text-muted">:</span>
              {match.result!.away}
            </div>
          ) : (
            <span className="shrink-0 px-1 font-mono text-sm text-muted">vs</span>
          )}
          <Side team={match.away} alignRight />
        </div>
        <div className="mt-2 truncate text-center font-mono text-[0.6rem] text-muted">{match.venue}</div>
      </div>

      {/* consensus */}
      {predictions.length > 0 && (
        <div className="border-b border-ink-line px-5 py-3">
          <div className="mb-2 flex items-center justify-between font-mono text-[0.58rem] uppercase tracking-widest text-muted">
            <span>field consensus</span>
            <span>{predictions.length} picks</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-ink">
            <span style={{ width: `${cons.HOME * 100}%`, background: "#ceff1a" }} />
            <span style={{ width: `${cons.DRAW * 100}%`, background: "#8aa0b4" }} />
            <span style={{ width: `${cons.AWAY * 100}%`, background: "#38e8ff" }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[0.58rem] text-muted">
            <span>{match.home.code} {Math.round(cons.HOME * 100)}%</span>
            <span>DRAW {Math.round(cons.DRAW * 100)}%</span>
            <span>{match.away.code} {Math.round(cons.AWAY * 100)}%</span>
          </div>
        </div>
      )}

      {/* agent picks: show the most confident few, then a count so it scales to many agents */}
      <div className="flex-1 divide-y divide-ink-line">
        {shownPicks.map(({ prediction, agent }) => {
          const pickCode =
            prediction.pick === "HOME"
              ? match.home.code
              : prediction.pick === "AWAY"
                ? match.away.code
                : "DRAW";
          return (
            <Link
              key={prediction.id}
              href={`/receipt/${prediction.id}`}
              className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-ink"
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-sm text-xs"
                style={{ background: agent.accent, color: "#0b0c0e" }}
              >
                {agent.glyph}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-chalk">
                {agent.name}
              </span>
              <span className="font-mono text-xs text-acid">{pickCode}</span>
              <span className="w-10 text-right font-mono text-xs text-muted">
                {Math.round(prediction.confidence * 100)}%
              </span>
              {prediction.resolved && (
                <span className={prediction.correct ? "text-[#4ade80]" : "text-seal"}>
                  {prediction.correct ? "✓" : "✕"}
                </span>
              )}
            </Link>
          );
        })}
        {extraPicks > 0 && (
          <div className="px-5 py-2 font-mono text-[0.62rem] uppercase tracking-widest text-muted">
            + {extraPicks} more sealed {extraPicks === 1 ? "pick" : "picks"}
          </div>
        )}
      </div>

      {/* controls */}
      <div className="space-y-3 border-t border-ink-line p-5">
        {!resolved && <PredictPanel match={match} agents={unpredicted} />}
        {resolved && match.result && (
          <div className="text-center font-mono text-[0.62rem] uppercase tracking-widest text-muted">
            outcome ·{" "}
            <span className="text-chalk">
              {match.result.outcome === "HOME"
                ? `${match.home.name} win`
                : match.result.outcome === "AWAY"
                  ? `${match.away.name} win`
                  : "draw"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Side({ team, alignRight }: { team: Team; alignRight?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${alignRight ? "flex-row-reverse text-right" : ""}`}
    >
      <Flag team={team} className="shrink-0 text-xl sm:text-2xl" />
      <span className="min-w-0 break-words font-display text-sm font-bold leading-tight text-chalk">
        {team.name}
      </span>
    </div>
  );
}
