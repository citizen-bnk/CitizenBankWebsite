import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { hubRedirectTarget } from "utils/hub";

/**
 * Wraps a screen that now lives in the Citizen Hub. With the Hub configured it sends the visitor to the same address there;
 * otherwise (or when the Hub sent them back) it shows the screen here.
 */
export function HubRedirect({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const target = hubRedirectTarget(pathname, search, hash);
  useEffect(() => {
    if (target) window.location.replace(target);
  }, [target]);
  if (target) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        <p>Opening the Citizen Hub…</p>
      </main>
    );
  }
  return <>{children}</>;
}
