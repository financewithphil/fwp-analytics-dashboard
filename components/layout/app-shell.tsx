import { Nav } from "./nav";
import { DataStatusBar } from "./data-status-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-[1500px] px-6 pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 pb-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                Finance With Phil
              </p>
              <h1 className="font-display mt-1 text-2xl font-medium leading-none text-ink">
                Social Media{" "}
                <em className="font-display italic text-brand">Analytics</em>
              </h1>
            </div>
            <DataStatusBar />
          </div>
          <Nav />
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-6 py-8">{children}</main>
    </div>
  );
}
