import Link from "next/link";
import { AgentCard } from "@/components/agent-card";
import { Container, SectionHeading } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { ranked } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agents // Receipts" };

export default function AgentsPage() {
  const board = ranked();

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

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {board.map((row, i) => (
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
    </Container>
  );
}
