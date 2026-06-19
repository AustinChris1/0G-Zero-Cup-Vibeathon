export function Barcode({ seed, className }: { seed: string; className?: string }) {
  const clean = seed.replace(/^0x/, "");
  const bars = Array.from({ length: 48 }, (_, i) => {
    const code = parseInt(clean[i % clean.length] || "8", 16);
    return 1 + (code % 4);
  });
  return (
    <div className={className} aria-hidden>
      <div className="flex h-9 items-end gap-[2px]">
        {bars.map((w, i) => (
          <span
            key={i}
            className="block bg-ink"
            style={{ width: `${w}px`, height: i % 7 === 0 ? "100%" : "78%" }}
          />
        ))}
      </div>
    </div>
  );
}
