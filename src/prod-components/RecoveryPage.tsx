import type { ReactNode } from "react";

type Recovery = {
  title: string;
  message: string;
  code: string;
  retry?: () => void;
  children?: ReactNode;
};

export function recoveryFor(error: unknown): Pick<Recovery, "title" | "message" | "code"> {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (/dynamically imported module|loading chunk|chunkloaderror|failed to fetch module/i.test(text)) {
    return { title: "This page has been updated", message: "Reload to get the latest version of this page. Your saved information remains available.", code: "PAGE_VERSION_CHANGED" };
  }
  if (/timeout|timed out|aborted/i.test(text)) {
    return { title: "The request took too long", message: "Check your connection, then retry. If you were submitting a form or payment, check its status before trying again.", code: "REQUEST_TIMEOUT" };
  }
  if (/failed to fetch|networkerror|connection interrupted/i.test(text)) {
    return { title: "Connection interrupted", message: "Check your connection and retry. Your saved records have not been removed.", code: "CONNECTION_INTERRUPTED" };
  }
  return { title: "This page could not be opened", message: "Retry the page. If it still fails, return to the website and share the issue code with support.", code: "PAGE_UNAVAILABLE" };
}

export function RecoveryPage({ title, message, code, retry, children }: Recovery) {
  return <main role="alert" style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "24px", background: "#f8f9fc", color: "#172033" }}>
    <section style={{ maxWidth: 580, width: "100%", padding: "clamp(24px,5vw,44px)", background: "white", border: "1px solid #d9deea", borderRadius: 16, boxShadow: "0 12px 38px #24314a14" }}>
      <div aria-hidden style={{ width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: 13, background: "#efe9f8", color: "#6d52a2", fontSize: 26 }}>!</div>
      <h1 style={{ margin: "20px 0 10px", fontSize: 28 }}>{title}</h1>
      <p style={{ lineHeight: 1.6, color: "#475569" }}>{message}</p>
      {children}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        {retry && <button type="button" onClick={retry} style={{ minHeight: 44, padding: "10px 20px", color: "white", background: "#6d52a2", border: 0, borderRadius: 8 }}>Retry</button>}
        <button type="button" onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.assign("/"); }} style={{ minHeight: 44, padding: "10px 20px", background: "white", color: "#5a4289", border: "1px solid #6d52a2", borderRadius: 8 }}>Go back</button>
        <a href="/" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "10px 20px", color: "#5a4289" }}>Website home</a>
      </div>
      <small style={{ display: "block", marginTop: 24, color: "#64748b" }}>Issue: {code}</small>
    </section>
  </main>;
}
