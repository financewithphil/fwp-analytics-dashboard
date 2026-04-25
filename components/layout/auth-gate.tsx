"use client";

import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import { PinWall } from "./pin-wall";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-background">
        <div className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          Loading
        </div>
      </div>
    );
  }

  if (!authed) return <PinWall onSuccess={() => setAuthed(true)} />;

  return <>{children}</>;
}
