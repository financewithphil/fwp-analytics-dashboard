interface PageStubProps {
  title: string;
  subtitle?: string;
  comingIn: string;
}

export function PageStub({ title, subtitle, comingIn }: PageStubProps) {
  return (
    <section className="space-y-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          {comingIn}
        </p>
        <h2 className="font-display mt-2 text-3xl font-medium text-ink">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 max-w-prose text-ink-soft">{subtitle}</p>
        )}
      </header>

      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-muted">
          Tab in migration · v2-rebuild
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Foundation is live. Section content is being ported from v1 in the
          next session.
        </p>
      </div>
    </section>
  );
}
