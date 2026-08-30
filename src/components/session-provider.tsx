"use client";

import {
  SessionProvider as NextAuthSessionProvider,
  getSession,
} from "next-auth/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const retried = useRef(false);

  // Warm the session on mount with a retry loop.
  // Prevents "Failed to fetch" when the dev server is mid-compile (Turbopack)
  // or when the middleware redirect aborts the initial /api/auth/session request.
  useEffect(() => {
    let cancelled = false;

    async function warmSession() {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await getSession();
          if (!cancelled) setReady(true);
          return;
        } catch {
          // Transient network error — retry with back-off
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, attempt * 500));
          }
        }
      }
      // All retries exhausted — still render the app (user is simply unauthenticated)
      if (!cancelled) setReady(true);
    }

    if (!retried.current) {
      retried.current = true;
      warmSession();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Suppress the noisy [next-auth] CLIENT_FETCH_ERROR console noise in dev.
  // The error is transient (dev-server cold start / Turbopack recompile) and
  // is already handled by the retry loop above.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const origError = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args.map(String).join(" ");
      if (msg.includes("CLIENT_FETCH_ERROR") || msg.includes("Failed to fetch")) return;
      origError.apply(console, args);
    };
    return () => {
      console.error = origError;
    };
  }, []);

  if (!ready) return null;

  return (
    <NextAuthSessionProvider
      refetchInterval={300}
      refetchOnWindowFocus={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
