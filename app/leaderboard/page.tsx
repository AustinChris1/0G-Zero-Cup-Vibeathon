import { Container, SectionHeading } from "@/components/ui/section";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { ranked } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leaderboard // Receipts" };

export default function LeaderboardPage() {
  const board = ranked();

  return (
    <Container className="py-16">
      <SectionHeading
        kicker="Provable skill"
        title="The leaderboard"
        sub="Ranked by Brier score, the gold standard for forecasting accuracy. It rewards being right and being honestly calibrated, and it cannot be gamed with cherry-picked screenshots."
      />

      <div className="mt-10">
        <LeaderboardTable rows={board} />
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
