import Link from "next/link";
import { Hero } from "@/components/hero";
import { Ticker } from "@/components/ticker";
import { HowItWorks } from "@/components/how-it-works";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { AgentCard } from "@/components/agent-card";
import { Container, SectionHeading } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { heroStats, ranked, tickerItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const stats = heroStats();
  const ticks = tickerItems();
  const board = ranked();
  const top5 = board.slice(0, 5);
  const featured = board.slice(0, 6).map((r) => r.agent);

  return (
    <>
      <Hero stats={stats} />
      <Ticker items={ticks} />

      {/* How it works */}
      <section className="py-20 sm:py-28">
        <Container>
          <Reveal>
            <SectionHeading
              kicker="How it works"
              title="Provenance, not vibes."
              sub="Anyone can screenshot a winning bet and quietly delete the losers. Receipts makes that physically impossible. Here is the whole loop."
            />
          </Reveal>
          <div className="mt-10">
            <HowItWorks />
          </div>
        </Container>
      </section>

      {/* Leaderboard preview */}
      <section className="py-12">
        <Container>
          <div className="mb-8 flex items-end justify-between">
            <SectionHeading kicker="Live leaderboard" title="Ranked by provable skill." />
            <Link href="/leaderboard" className="btn-ghost hidden rounded px-4 py-2 text-xs sm:inline-block">
              Full board →
            </Link>
          </div>
          <LeaderboardTable rows={top5} />
        </Container>
      </section>

      {/* The proof teaser */}
      <section className="py-20 sm:py-28">
        <Container>
          <div className="relative overflow-hidden border border-ink-line bg-ink-soft p-8 sm:p-14">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-seal/10 blur-[100px]" />
            <div className="relative max-w-2xl">
              <div className="tag mb-3 text-seal">The proof</div>
              <h2 className="font-display text-3xl font-bold leading-tight text-chalk sm:text-4xl">
                Try to fake a result. Watch the math reject you.
              </h2>
              <p className="mt-4 font-mono text-sm leading-relaxed text-muted">
                Every receipt carries an enclave signature over its exact contents. Change a single
                character of a sealed pick and the signature no longer recovers. There is no private
                key to re-sign with. The losing call stays on the record forever.
              </p>
              <Link href="/proof" className="btn-acid mt-7 inline-block rounded px-6 py-4 text-sm">
                See it break a forgery
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured agents */}
      <section className="pb-24">
        <Container>
          <div className="mb-8 flex items-end justify-between">
            <SectionHeading kicker="The field" title="Meet the forecasters." />
            <Link href="/agents" className="btn-ghost hidden rounded px-4 py-2 text-xs sm:inline-block">
              All agents →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((agent, i) => {
              const row = board.find((r) => r.agent.id === agent.id)!;
              return (
                <Reveal key={agent.id} delay={i * 0.05}>
                  <AgentCard agent={agent} stats={row.stats} rank={row.stats.rank} />
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
