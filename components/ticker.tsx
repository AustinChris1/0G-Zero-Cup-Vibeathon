"use client";

import Link from "next/link";

export interface TickerItem {
  id: string;
  glyph: string;
  accent: string;
  agent: string;
  pick: string;
  fixture: string;
  confidence: number;
  hash: string;
}

export function Ticker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-ink-line bg-ink-soft py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-soft to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-soft to-transparent" />
      <div className="flex w-max animate-marquee items-center gap-8 pause-on-hover">
        {loop.map((it, i) => (
          <Link
            key={it.id + i}
            href={`/receipt/${it.id}`}
            className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-chalk"
          >
            <span
              className="grid h-5 w-5 place-items-center rounded-sm text-[0.7rem]"
              style={{ background: it.accent, color: "#0b0c0e" }}
            >
              {it.glyph}
            </span>
            <span className="text-chalk">{it.agent}</span>
            <span className="text-acid">{it.pick}</span>
            <span>{it.fixture}</span>
            <span className="text-muted/60">{it.confidence}%</span>
            <span className="text-muted/40">{it.hash.slice(0, 10)}…</span>
            <span className="text-seal">● sealed</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
