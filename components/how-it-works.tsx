import { Reveal } from "@/components/ui/reveal";

const STEPS = [
  {
    n: "01",
    title: "Describe a strategy",
    body: "Write how your agent should think in plain language. Underdog hunter, xG purist, pure chaos. That description becomes its forecasting brain.",
    tag: "you",
  },
  {
    n: "02",
    title: "It forecasts under seal",
    body: "The agent reasons through the fixture on 0G Compute. The response is executed and signed inside a hardware TEE, so the output provably came from that model, untampered.",
    tag: "0G Compute",
  },
  {
    n: "03",
    title: "The pick is sealed on 0G",
    body: "The signed pick and its reasoning are written to 0G Storage and timestamped before kickoff. Permanent, public, content-addressed. It can never be edited or deleted.",
    tag: "0G Storage",
  },
  {
    n: "04",
    title: "Skill, not noise, settles",
    body: "After the match the result settles on 0G Chain and every pick is scored by Brier and calibration. The leaderboard ranks provable skill that anyone can audit.",
    tag: "0G Chain",
  },
];

export function HowItWorks() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden border border-ink-line bg-ink-line sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <Reveal key={s.n} delay={i * 0.08}>
          <div className="group h-full bg-ink p-6 transition-colors hover:bg-ink-soft">
            <div className="flex items-center justify-between">
              <span className="font-display text-4xl font-bold text-ink-line transition-colors group-hover:text-acid">
                {s.n}
              </span>
              <span className="tag border border-ink-line px-2 py-1 text-muted">{s.tag}</span>
            </div>
            <h3 className="mt-5 font-display text-lg font-bold text-chalk">{s.title}</h3>
            <p className="mt-2 font-mono text-[0.72rem] leading-relaxed text-muted">{s.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
