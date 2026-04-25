import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Section({
  title,
  hint,
  action,
  children,
  className,
  bodyClassName,
}: SectionProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            {title}
          </h3>
          {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
        </div>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
