import type { PropsWithChildren } from "react";
import { useStore } from "@nanostores/react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { $session, clearSession, isSessionExpired } from "@/lib/stores";
import { AUTH_REQUIRED } from "@/lib/featureFlags";

export function ProtectedGate({ children }: PropsWithChildren) {
  if (!AUTH_REQUIRED) {
    return <>{children}</>;
  }

  const session = useStore($session);
  const nextPath = typeof window !== "undefined" ? window.location.pathname : "/";

  const sessionQuery = useQuery({
    queryKey: ["auth-session", session?.token],
    queryFn: () => api.session(session!.token),
    enabled: Boolean(session?.token),
    retry: false
  });

  if (session && isSessionExpired(session)) {
    clearSession();
  }

  if (!session || sessionQuery.isError) {
    return (
      <section className="card" style={{ marginTop: "1rem" }}>
        <p className="pill">Protected</p>
        <h3>Authentication required</h3>
        <p>Sign in on the auth page to unlock this route.</p>
        <a className="btn btn-primary" href={`/auth?next=${encodeURIComponent(nextPath)}`}>
          Go to Sign In
        </a>
      </section>
    );
  }

  if (sessionQuery.isPending) {
    return (
      <section className="card" style={{ marginTop: "1rem" }}>
        <p>Validating session...</p>
      </section>
    );
  }

  return <>{children}</>;
}
