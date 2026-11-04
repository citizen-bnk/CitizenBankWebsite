const KEY = "citizen_login_destination";
const MAX_AGE = 15 * 60 * 1000;

export function safeDestination(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return null;
  // Encoded separators must not turn a local path into an external destination.
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) return null;
  } catch { return null; }
  return value;
}

export function rememberLoginDestination(value: string | null) {
  try {
    localStorage.removeItem("dtbn-login-next");
    const next = safeDestination(value);
    if (next) sessionStorage.setItem(KEY, JSON.stringify({ next, at: Date.now() }));
    else sessionStorage.removeItem(KEY);
  } catch { /* The explicit next query still works when storage is unavailable. */ }
}

export function readLoginDestination(search: string): string {
  let saved: { next?: unknown; at?: number } | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch { /* Default to the website. */ }
  const explicit = safeDestination(new URLSearchParams(search).get("next"));
  if (explicit) return explicit;
  return saved && typeof saved.at === "number" && Date.now() >= saved.at && Date.now() - saved.at < MAX_AGE
    ? safeDestination(saved.next) || "/" : "/";
}
