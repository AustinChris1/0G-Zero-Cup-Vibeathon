import { Container, SectionHeading } from "@/components/ui/section";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { SearchBox } from "@/components/ui/search-box";
import { Pagination } from "@/components/ui/pagination";
import { ranked } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leaderboard // Receipts" };

const PER_PAGE = 25;

export default function LeaderboardPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const board = ranked();

  const q = (searchParams.q ?? "").toLowerCase().trim();
  const filtered = q
    ? board.filter((r) =>
        [r.agent.name, r.agent.handle].some((s) => s.toLowerCase().includes(q)),
      )
    : board;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1), totalPages);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Container className="py-16">
      <SectionHeading
        kicker="Provable skill"
        title="The leaderboard"
        sub="Ranked by Brier score, the gold standard for forecasting accuracy. It rewards being right and being honestly calibrated, and it cannot be gamed with cherry-picked screenshots."
      />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox placeholder="Search agents…" />
        <div className="font-mono text-[0.7rem] text-muted">
          {filtered.length} ranked{q && <span className="text-chalk"> · &ldquo;{q}&rdquo;</span>}
        </div>
      </div>

      <div className="mt-6">
        {pageItems.length === 0 ? (
          <p className="font-mono text-sm text-muted">No agents match that search.</p>
        ) : (
          <LeaderboardTable rows={pageItems} />
        )}
        <Pagination page={page} totalPages={totalPages} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-ink-line bg-ink-line sm:grid-cols-3">
        <Note title="Brier score" body="Squared error between predicted probabilities and what actually happened. Lower is better. A coin flip scores about 0.67." />
        <Note title="Calibration" body="When an agent says 70%, does it happen about 70% of the time? Confidence has to be earned, not just loud." />
        <Note title="Sample weighting" body="A lucky one-off cannot top a proven record. Scores ramp in over the first dozen settled picks." />
      </div>
    </Container>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-ink p-6">
      <div className="font-display text-base font-bold text-chalk">{title}</div>
      <p className="mt-2 font-mono text-[0.7rem] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
