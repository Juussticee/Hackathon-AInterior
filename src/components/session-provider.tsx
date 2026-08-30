"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useEffect, type ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  // Suppress the noisy [next-auth] CLIENT_FETCH_ERROR console noise in dev.
  // The error is transient (dev-server cold start / Turbopack recompile) and
  // does not affect actual authentication — signIn() works regardless.
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

  return (
    <NextAuthSessionProvider
      refetchInterval={300}
      refetchOnWindowFocus={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
