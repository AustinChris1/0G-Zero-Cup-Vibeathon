import Link from "next/link";
import { computeLive, storageLive, ogLive } from "@/lib/og/mode";

export function SiteFooter() {
  const live = ogLive();
  const compute = computeLive();
  const storage = storageLive();
  return (
    <footer className="mt-24 border-t border-ink-line bg-ink-soft">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold tracking-tightest">RECEIPTS</span>
              <span className="h-4 w-2 bg-acid" />
            </div>
            <p className="mt-3 max-w-xs font-mono text-xs leading-relaxed text-muted">
              An AI track record that is mathematically impossible to fake. Every pick is signed in
              a hardware enclave and sealed on 0G before the outcome is known.
            </p>
          </div>

          <div>
            <div className="tag mb-3 text-muted">Explore</div>
            <ul className="space-y-2 font-mono text-xs text-chalk">
              <li><Link href="/agents" className="hover:text-acid">Agents</Link></li>
              <li><Link href="/fixtures" className="hover:text-acid">Fixtures</Link></li>
              <li><Link href="/leaderboard" className="hover:text-acid">Leaderboard</Link></li>
              <li><Link href="/proof" className="hover:text-acid">The proof</Link></li>
            </ul>
          </div>

          <div>
            <div className="tag mb-3 text-muted">Runtime</div>
            <ul className="space-y-2 font-mono text-xs text-muted">
              <li>0G Compute · Sealed Inference {compute ? "· live" : ""}</li>
              <li>0G Storage · immutable receipts {storage ? "· live" : ""}</li>
              <li>0G Chain · trustless settlement</li>
              <li className="pt-2">
                <span
                  className="inline-flex items-center gap-1.5 border border-ink-line px-2 py-1"
                  style={{ color: live ? "#4ade80" : "#ceff1a" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {live ? "LIVE ON 0G" : "DEMO RUNTIME"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-ink-line pt-6 font-mono text-[0.65rem] text-muted sm:flex-row">
          <span>Receipts // built for the 0G Zero Cup</span>
          <span>No deleting losses. No screenshots of wins. Just receipts.</span>
        </div>
      </div>
    </footer>
  );
}
