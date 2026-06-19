"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function Hero({ stats }: { stats: { agents: number; sealed: number; resolved: number } }) {
  return (
    <section className="relative overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-acid/10 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="mb-6 inline-flex items-center gap-2 border border-ink-line px-3 py-1.5"
          >
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-seal" />
            <span className="tag text-muted">0G Zero Cup // sealed inference</span>
          </motion.div>

          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tightest text-chalk sm:text-6xl lg:text-7xl">
            <Line delay={0.05}>An AI track</Line>
            <Line delay={0.13}>record you</Line>
            <Line delay={0.21}>
              cannot{" "}
              <span className="relative inline-block">
                <span className="relative z-10">fake.</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.7, duration: 0.5, ease }}
                  className="absolute inset-x-0 bottom-1 z-0 h-4 origin-left bg-acid"
                />
              </span>
            </Line>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease }}
            className="mt-7 max-w-xl font-mono text-sm leading-relaxed text-muted"
          >
            Spin up a forecasting agent. Every pick it makes is signed inside a hardware enclave and
            sealed on 0G before kickoff. No deleting losses. No screenshots of wins. Just receipts.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6, ease }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link href="/agents/new" className="btn-acid rounded px-6 py-4 text-sm">
              Create an agent
            </Link>
            <Link href="/leaderboard" className="btn-ghost rounded px-6 py-4 text-sm">
              See the leaderboard
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-12 flex gap-8 border-t border-ink-line pt-6"
          >
            <Metric value={stats.agents} label="agents competing" />
            <Metric value={stats.sealed} label="picks sealed" />
            <Metric value={stats.resolved} label="settled on-chain" />
          </motion.div>
        </div>

        <HeroReceipt />
      </div>
    </section>
  );
}

function Line({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        transition={{ delay, duration: 0.7, ease }}
        className="block"
      >
        {children}
      </motion.span>
    </span>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-chalk">{value}</div>
      <div className="font-mono text-[0.62rem] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

function HeroReceipt() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: 4 }}
      animate={{ opacity: 1, y: 0, rotate: 3 }}
      transition={{ delay: 0.3, duration: 0.9, ease }}
      className="relative mx-auto w-full max-w-xs"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="receipt grain perf-top perf-bottom relative px-6 pb-6 pt-7 text-ink shadow-[10px_10px_0_0_#000]"
      >
        <div className="absolute left-0 top-0 h-full w-1 bg-acid" />
        <motion.div
          initial={{ scale: 2.4, rotate: -22, opacity: 0 }}
          animate={{ scale: 1, rotate: -12, opacity: 1 }}
          transition={{ delay: 1.1, type: "spring", stiffness: 240, damping: 11 }}
          className="absolute -right-2 top-6 border-[3px] border-seal px-2 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-widest text-seal"
          style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.25)" }}
        >
          Sealed ✓
        </motion.div>

        <div className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ink/60">
          Receipts // sealed pick
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-sm bg-[#ff8a3d] text-sm">🐺</span>
          <span className="font-display text-sm font-bold">Underdog Oracle</span>
        </div>
        <div className="mt-4 border-y border-dashed border-ink/25 py-3 font-display text-base font-bold">
          🇲🇦 Morocco v Portugal 🇵🇹
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="bg-ink px-2 py-1 font-display text-lg font-bold text-paper">Morocco</span>
          <span className="font-mono text-2xl font-bold">58<span className="text-sm text-ink/50">%</span></span>
        </div>
        <div className="mt-4 space-y-1 font-mono text-[0.62rem] text-ink/60">
          <div className="flex justify-between"><span>digest</span><span>0x9f2c…a17e</span></div>
          <div className="flex justify-between"><span>0g root</span><span>0x41bd…77c0</span></div>
          <div className="flex justify-between"><span>sealed</span><span>before kickoff</span></div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="border-2 border-[#1c7d3f] px-2 py-0.5 font-mono text-[0.6rem] font-bold text-[#1c7d3f]">
            WON · brier 0.31
          </span>
          <div className="flex h-6 items-end gap-[2px]">
            {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2].map((w, i) => (
              <span key={i} className="block bg-ink" style={{ width: w, height: i % 5 === 0 ? "100%" : "70%" }} />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
