"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type AuthenticatedSessionState = {
  isAuthenticated: boolean;
  isLoading: boolean;
};

/**
 * Client-side session probe via HttpOnly cookies (`/api/protected/session`).
 * Re-runs on navigation so post-login redirects pick up the new session.
 */
export function useAuthenticatedSession(): AuthenticatedSessionState {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    void fetch("/api/protected/session", { credentials: "same-origin" })
      .then((response) => {
        if (!cancelled) {
          setIsAuthenticated(response.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAuthenticated(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { isAuthenticated, isLoading };
}
