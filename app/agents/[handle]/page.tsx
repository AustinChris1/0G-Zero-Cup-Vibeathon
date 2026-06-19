import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/section";
import { ReceiptCard } from "@/components/receipt-card";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { agentBundle } from "@/lib/queries";
import { shortHash } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function AgentPage({
  params,
  searchParams,
}: {
  params: { handle: string };
  searchParams: { new?: string };
}) {
  const bundle = agentBundle(params.handle);
  if (!bundle) notFound();
  const { agent, stats, rank, rows } = bundle;
  const isNew = searchParams.new === "1";

  return (
    <Container className="py-12">
      {isNew && (
        <div className="mb-8 border border-acid/40 bg-acid/5 px-4 py-3 font-mono text-xs text-acid">
          ✓ {agent.name} is live. Take it to the{" "}
          <Link href="/fixtures" className="underline">fixtures</Link> and seal its first pick.
        </div>
      )}

      {/* header */}
      <div className="relative overflow-hidden border border-ink-line bg-ink-soft p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full opacity-25 blur-[90px]"
          style={{ background: agent.accent }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className="grid h-16 w-16 shrink-0 place-items-center rounded-lg text-3xl"
              style={{ background: agent.accent, color: "#0b0c0e" }}
            >
              {agent.glyph}
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-chalk">
                {agent.name}
              </h1>
              <div className="mt-1 font-mono text-xs text-muted">@{agent.handle}</div>
              <p className="mt-3 max-w-xl font-mono text-[0.78rem] leading-relaxed text-muted">
                {agent.strategy}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.62rem] text-muted">
                <span>model · {agent.model}</span>
                <span>owner · {shortHash(agent.owner, 6, 4)}</span>
              </div>
            </div>
          </div>
          {rank > 0 && (
            <div className="shrink-0 border border-ink-line px-4 py-3 text-center">
              <div className="font-mono text-[0.58rem] uppercase tracking-widest text-muted">Rank</div>
              <div className="font-display text-3xl font-bold text-acid">#{rank}</div>
            </div>
          )}
        </div>
      </div>

      {/* stats */}
      <div className="mt-px grid grid-cols-2 gap-px overflow-hidden border border-ink-line bg-ink-line sm:grid-cols-3 lg:grid-cols-6">
        <StatCell label="Accuracy">
          {stats.resolved ? <CountUp value={stats.accuracy * 100} suffix="%" /> : "–"}
        </StatCell>
        <StatCell label="Brier" accent>
          {stats.resolved ? <CountUp value={stats.brier} decimals={3} /> : "–"}
        </StatCell>
        <StatCell label="Calibration">
          {stats.resolved ? <CountUp value={stats.calibration * 100} suffix="%" /> : "–"}
        </StatCell>
        <StatCell label="Sealed">
          <CountUp value={stats.picks} />
        </StatCell>
        <StatCell label="Settled">
          <CountUp value={stats.resolved} />
        </StatCell>
        <StatCell label="Streak">
          <span className={stats.streak >= 0 ? "text-[#4ade80]" : "text-seal"}>
            {stats.streak > 0 ? `W${stats.streak}` : stats.streak < 0 ? `L${-stats.streak}` : "–"}
          </span>
        </StatCell>
      </div>

      {/* audit feed */}
      <div className="mt-16">
        <div className="mb-2 flex items-baseline gap-3">
          <h2 className="font-display text-2xl font-bold text-chalk">Every call, on the record</h2>
          <span className="font-mono text-xs text-muted">{rows.length} sealed</span>
        </div>
        <p className="mb-8 max-w-2xl font-mono text-[0.72rem] leading-relaxed text-muted">
          This is the whole history, newest first. Wins and losses, nothing hidden. Hit verify on any
          receipt to independently recompute its proof. There is no edit button. That is the point.
        </p>

        {rows.length === 0 ? (
          <div className="border border-dashed border-ink-line p-10 text-center font-mono text-sm text-muted">
            No picks sealed yet. Take this agent to the{" "}
            <Link href="/fixtures" className="text-acid underline">fixtures</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ prediction, match }, i) => (
              <Reveal key={prediction.id} delay={(i % 3) * 0.06}>
                <ReceiptCard prediction={prediction} agent={agent} match={match} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}

function StatCell({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="bg-ink p-5">
      <div
        className={`font-display text-2xl font-bold sm:text-3xl ${accent ? "text-acid" : "text-chalk"}`}
      >
        {children}
      </div>
      <div className="mt-1 font-mono text-[0.58rem] uppercase tracking-widest text-muted">
        {label}
      </div>
    </div>
  );
}
