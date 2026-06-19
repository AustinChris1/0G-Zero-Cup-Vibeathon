"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Agent, AgentStats } from "@/lib/types";
import { cn, formatPct } from "@/lib/utils";

export interface Row {
  agent: Agent;
  stats: AgentStats;
  score: number;
}

export function LeaderboardTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-hidden border border-ink-line">
      <div className="hidden grid-cols-[3rem_1fr_5rem_5rem_5rem_4rem_7rem] gap-3 border-b border-ink-line bg-ink-soft px-4 py-3 font-mono text-[0.6rem] uppercase tracking-widest text-muted md:grid">
        <span>Rank</span>
        <span>Agent</span>
        <span className="text-right">Acc</span>
        <span className="text-right">Brier</span>
        <span className="text-right">Calib</span>
        <span className="text-right">Run</span>
        <span className="text-right">Score</span>
      </div>

      {rows.map((row, i) => (
        <motion.div
          key={row.agent.id}
          layout
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href={`/agents/${row.agent.handle}`}
            className={cn(
              "grid grid-cols-2 items-center gap-3 border-b border-ink-line px-4 py-4 transition-colors hover:bg-ink-soft md:grid-cols-[3rem_1fr_5rem_5rem_5rem_4rem_7rem]",
              i === 0 && "bg-acid/[0.04]",
            )}
          >
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <span className={cn(i === 0 ? "text-acid" : "text-muted")}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded text-base"
                style={{ background: row.agent.accent, color: "#0b0c0e" }}
              >
                {row.agent.glyph}
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold text-chalk">
                  {row.agent.name}
                </div>
                <div className="font-mono text-[0.6rem] text-muted">
                  {row.stats.resolved} settled picks
                </div>
              </div>
            </div>

            <Cell className="text-right md:block hidden">{formatPct(row.stats.accuracy)}</Cell>
            <Cell className="text-right text-acid md:block hidden">
              {row.stats.brier.toFixed(3)}
            </Cell>
            <Cell className="text-right md:block hidden">
              {formatPct(row.stats.calibration)}
            </Cell>
            <Cell className="text-right md:block hidden">
              <span className={row.stats.streak >= 0 ? "text-[#4ade80]" : "text-seal"}>
                {row.stats.streak > 0 ? `W${row.stats.streak}` : row.stats.streak < 0 ? `L${-row.stats.streak}` : "–"}
              </span>
            </Cell>

            <div className="col-span-2 mt-2 md:col-span-1 md:mt-0">
              <div className="flex items-center justify-between gap-2 md:justify-end">
                <span className="font-mono text-[0.6rem] text-muted md:hidden">Score</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-line md:w-12">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round(row.score * 100)}%`, background: row.agent.accent }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-xs font-bold text-chalk">
                    {(row.score * 100).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("font-mono text-sm text-chalk", className)}>{children}</div>;
}
