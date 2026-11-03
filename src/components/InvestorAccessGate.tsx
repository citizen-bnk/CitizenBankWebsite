import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { auth } from "app/auth";

/** The invitation check stays on the server; the browser only controls presentation. */
export function InvestorAccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "allowed" | "denied" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      setState("checking");
      try {
        const token = await auth.getAuthHeaderValue();
        const params = new URLSearchParams(window.location.search);
        const fromLink = params.get("invite") || params.get("token");
        let saved: string | null = null;
        try {
          if (fromLink) sessionStorage.setItem("citizen_investor_invite", fromLink);
          saved = sessionStorage.getItem("citizen_investor_invite");
        } catch { /* private browsing can disable storage */ }
        const invite = fromLink || saved;
        const url = new URL("/api/subscriptions/core/access", window.location.origin);
        if (invite) url.searchParams.set("invite", invite);
        const response = await fetch(url, {
          headers: token ? { Authorization: token } : {},
          credentials: "include", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("access check unavailable");
        const result = await response.json();
        setState(result.eligible === true ? "allowed" : "denied");
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }
    void check();
    return () => controller.abort();
  }, [attempt]);

  if (state === "allowed") return <>{children}</>;
  return <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-5 p-6 text-center">
    <h1 className="text-2xl font-semibold">Private investment access</h1>
    <p role={state === "error" ? "alert" : "status"}>
      {state === "checking" ? "Checking your invitation…" : state === "denied"
        ? "This area is available to invited and existing investors. Open your invitation using the email address it was sent to."
        : "Your access could not be checked. Retry in a moment."}
    </p>
    <div className="flex flex-wrap justify-center gap-3">
      {state === "error" && <button className="rounded-lg bg-[#6d52a2] px-5 py-3 font-semibold text-white" onClick={() => setAttempt(value => value + 1)}>Retry</button>}
      <Link className="rounded-lg border px-5 py-3 font-semibold" to="/">Back to website</Link>
    </div>
  </main>;
}
