import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto max-w-7xl px-5 sm:px-8", className)}>{children}</div>;
}

export function SectionHeading({
  kicker,
  title,
  sub,
  className,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {kicker && <div className="tag mb-3 text-acid">{kicker}</div>}
      <h2 className="font-display text-3xl font-bold tracking-tight text-chalk sm:text-4xl">
        {title}
      </h2>
      {sub && <p className="mt-3 font-mono text-sm leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}
