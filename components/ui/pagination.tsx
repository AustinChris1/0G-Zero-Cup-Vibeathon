"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** URL-driven pagination that preserves the other query params (tab, search). */
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="mt-10 flex items-center justify-center gap-3 font-mono text-xs">
      <PageLink href={href(page - 1)} disabled={page <= 1}>
        ‹ prev
      </PageLink>
      <span className="text-muted">
        page <span className="text-chalk">{page}</span> of {totalPages}
      </span>
      <PageLink href={href(page + 1)} disabled={page >= totalPages}>
        next ›
      </PageLink>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed border border-ink-line/50 px-3 py-1.5 uppercase tracking-widest text-muted/40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "border border-ink-line px-3 py-1.5 uppercase tracking-widest text-muted transition hover:border-acid hover:text-acid",
      )}
    >
      {children}
    </Link>
  );
}
