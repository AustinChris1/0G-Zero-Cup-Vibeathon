"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

/**
 * Debounced search that writes to a URL query param (default `q`), preserving
 * the other params (e.g. the competition tab) and resetting pagination. Keep it
 * keyed by the tab where tabs exist so it remounts and clears on tab switch.
 */
export function SearchBox({
  placeholder = "Search…",
  paramName = "q",
  className,
}: {
  placeholder?: string;
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get(paramName) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commit(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v.trim()) params.set(paramName, v.trim());
    else params.delete(paramName);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function onChange(v: string) {
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(v), 300);
  }

  return (
    <div className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted">
          ⌕
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-ink-line bg-ink-soft py-2.5 pl-9 pr-9 font-mono text-sm text-chalk outline-none transition focus:border-acid sm:w-72"
        />
        {value && (
          <button
            onClick={() => {
              setValue("");
              commit("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-muted transition hover:text-chalk"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
