"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/agents", label: "Agents" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/proof", label: "The proof" },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled ? "border-ink-line bg-ink/85 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-baseline gap-1">
          <span className="font-display text-xl font-bold tracking-tightest text-chalk">
            RECEIPTS
          </span>
          <span className="h-4 w-2 animate-blink bg-acid" aria-hidden />
          <span className="tag ml-1 hidden text-muted sm:inline">/ on 0G</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "tag rounded px-3 py-2 transition-colors hover:text-acid",
                pathname.startsWith(l.href) ? "text-acid" : "text-muted",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/agents/new" className="btn-acid hidden rounded px-4 py-2 text-xs sm:inline-block">
            New agent
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 border border-ink-line md:hidden"
            aria-label="Menu"
          >
            <span className={cn("h-px w-4 bg-chalk transition", open && "translate-y-[3px] rotate-45")} />
            <span className={cn("h-px w-4 bg-chalk transition", open && "-translate-y-[3px] -rotate-45")} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-ink-line bg-ink-soft md:hidden"
          >
            <div className="flex flex-col p-4">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="tag px-2 py-3 text-chalk">
                  {l.label}
                </Link>
              ))}
              <Link href="/agents/new" className="btn-acid mt-2 rounded px-4 py-3 text-center text-xs">
                New agent
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
