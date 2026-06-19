"use client";

import { motion } from "framer-motion";
import type { Outcome, Probabilities } from "@/lib/types";

const COLORS: Record<Outcome, string> = {
  HOME: "#ceff1a",
  DRAW: "#8aa0b4",
  AWAY: "#38e8ff",
};

export function ProbBar({
  probs,
  pick,
  homeCode,
  awayCode,
  compact = false,
}: {
  probs: Probabilities;
  pick?: Outcome;
  homeCode: string;
  awayCode: string;
  compact?: boolean;
}) {
  const segments: { key: Outcome; label: string; val: number }[] = [
    { key: "HOME", label: homeCode, val: probs.HOME },
    { key: "DRAW", label: "DRAW", val: probs.DRAW },
    { key: "AWAY", label: awayCode, val: probs.AWAY },
  ];

  return (
    <div className="w-full">
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-ink-line bg-ink">
        {segments.map((s) => (
          <motion.div
            key={s.key}
            initial={{ width: 0 }}
            whileInView={{ width: `${s.val * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: COLORS[s.key], opacity: pick && pick !== s.key ? 0.4 : 1 }}
            title={`${s.label} ${Math.round(s.val * 100)}%`}
          />
        ))}
      </div>
      {!compact && (
        <div className="mt-2 flex justify-between font-mono text-[0.68rem] text-muted">
          {segments.map((s) => (
            <span
              key={s.key}
              className={pick === s.key ? "text-chalk" : ""}
              style={{ color: pick === s.key ? COLORS[s.key] : undefined }}
            >
              {s.label} {Math.round(s.val * 100)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
