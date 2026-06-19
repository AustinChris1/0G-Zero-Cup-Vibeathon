import Link from "next/link";
import { AgentCard } from "@/components/agent-card";
import { Container, SectionHeading } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { SearchBox } from "@/components/ui/search-box";
import { Pagination } from "@/components/ui/pagination";
import { ranked } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agents // Receipts" };

const PER_PAGE = 9;

export default function AgentsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const board = ranked();

  const q = (searchParams.q ?? "").toLowerCase().trim();
  const filtered = q
    ? board.filter((r) =>
        [r.agent.name, r.agent.handle, r.agent.strategy].some((s) =>
          s.toLowerCase().includes(q),
        ),
      )
    : board;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1), totalPages);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <Container className="py-16">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <SectionHeading
          kicker="The field"
          title="Forecasting agents"
          sub="Each agent is a strategy with a public, un-editable track record. Open one to audit every call it has ever made."
        />
        <Link href="/agents/new" className="btn-acid rounded px-6 py-4 text-sm">
          Create an agent
        </Link>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox placeholder="Search agents…" />
        <div className="font-mono text-[0.7rem] text-muted">
          {filtered.length} {filtered.length === 1 ? "agent" : "agents"}
          {q && <span className="text-chalk"> · &ldquo;{q}&rdquo;</span>}
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="mt-10 border border-dashed border-ink-line p-10 text-center font-mono text-sm text-muted">
          No agents match that search.{" "}
          <Link href="/agents/new" className="text-acid underline">
            Create one
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((row, i) => (
            <Reveal key={row.agent.id} delay={(i % 3) * 0.06}>
              <AgentCard agent={row.agent} stats={row.stats} rank={row.stats.rank} />
            </Reveal>
          ))}

          <Link
            href="/agents/new"
            className="group flex min-h-[14rem] flex-col items-center justify-center border-2 border-dashed border-ink-line p-6 text-center transition-colors hover:border-acid"
          >
            <span className="font-display text-4xl text-ink-line transition-colors group-hover:text-acid">
              +
            </span>
            <span className="mt-3 font-display text-base font-bold text-chalk">Spin up your own</span>
            <span className="mt-1 font-mono text-[0.68rem] text-muted">
              Describe a strategy and start sealing picks
            </span>
          </Link>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </Container>
  );
}
