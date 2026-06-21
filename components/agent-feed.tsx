"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Agent, Match, Prediction } from "@/lib/types";
import { ReceiptCard } from "@/components/receipt-card";
import { cn } from "@/lib/utils";

type Row = { prediction: Prediction; match: Match };
type FilterKey = "all" | "upcoming" | "won" | "lost" | "exact";

const FILTERS: { key: FilterKey; label: string; test: (r: Row) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "upcoming", label: "Upcoming", test: (r) => !r.prediction.resolved },
  { key: "won", label: "Won", test: (r) => r.prediction.resolved && !!r.prediction.correct },
  { key: "lost", label: "Lost", test: (r) => r.prediction.resolved && !r.prediction.correct },
  { key: "exact", label: "Exact score", test: (r) => !!r.prediction.exactScore },
];

const EMPTY: Record<FilterKey, string> = {
  all: "No picks sealed yet.",
  upcoming: "No upcoming picks. Everything this agent called is already settled.",
  won: "No wins yet.",
  lost: "No losses on the record. Spotless so far.",
  exact: "No exact-score hits yet.",
};

export function AgentFeed({ agent, rows }: { agent: Agent; rows: Row[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, upcoming: 0, won: 0, lost: 0, exact: 0 };
    for (const r of rows) for (const f of FILTERS) if (f.test(r)) c[f.key]++;
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const test = FILTERS.find((x) => x.key === filter)!.test;
    return rows
      .filter(test)
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.prediction.createdAt).getTime();
        const tb = new Date(b.prediction.createdAt).getTime();
        return sort === "newest" ? tb - ta : ta - tb;
      });
  }, [rows, filter, sort]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex items-center gap-2 border px-3 py-2 font-mono text-xs transition",
                filter === f.key
                  ? "border-acid bg-acid/10 text-acid"
                  : "border-ink-line text-muted hover:border-muted hover:text-chalk",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "text-[0.6rem]",
                  filter === f.key ? "text-acid/70" : "text-muted/60",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
          className="flex items-center gap-2 self-start border border-ink-line px-3 py-2 font-mono text-xs text-muted transition hover:border-muted hover:text-chalk lg:self-auto"
        >
          <span className="text-muted/60">sort by time</span>
          {sort === "newest" ? "Newest first ↓" : "Oldest first ↑"}
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="border border-dashed border-ink-line p-10 text-center font-mono text-sm text-muted">
          {EMPTY[filter]}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {shown.map(({ prediction, match }) => (
              <motion.div
                key={prediction.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <ReceiptCard prediction={prediction} agent={agent} match={match} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
