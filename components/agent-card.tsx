import Link from "next/link";
import type { Agent, AgentStats } from "@/lib/types";
import { cn, formatPct } from "@/lib/utils";

export function AgentCard({
  agent,
  stats,
  rank,
}: {
  agent: Agent;
  stats: AgentStats;
  rank?: number;
}) {
  return (
    <Link
      href={`/agents/${agent.handle}`}
      className="group relative block overflow-hidden border border-ink-line bg-ink-soft p-5 transition-all duration-200 hover:-translate-y-1"
      style={{ boxShadow: "0 0 0 0 transparent" }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
        style={{ background: agent.accent }}
      />
      <div
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
        style={{ background: agent.accent }}
      />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-md text-lg"
            style={{ background: agent.accent, color: "#0b0c0e" }}
          >
            {agent.glyph}
          </span>
          <div>
            <div className="font-display text-base font-bold leading-tight text-chalk">
              {agent.name}
            </div>
            <div className="font-mono text-[0.65rem] text-muted">@{agent.handle}</div>
          </div>
        </div>
        {rank !== undefined && (
          <span className="font-mono text-xs text-muted">#{rank}</span>
        )}
      </div>

      <p className="mt-4 line-clamp-2 font-mono text-[0.72rem] leading-relaxed text-muted">
        {agent.strategy}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-ink-line pt-4">
        <Stat label="Accuracy" value={stats.resolved ? formatPct(stats.accuracy) : "–"} />
        <Stat label="Brier" value={stats.resolved ? stats.brier.toFixed(2) : "–"} accent />
        <Stat label="Picks" value={String(stats.picks)} />
      </div>
    </Link>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={cn("font-display text-xl font-bold", accent ? "text-acid" : "text-chalk")}>
        {value}
      </div>
      <div className="font-mono text-[0.58rem] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}
