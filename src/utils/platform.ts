/**
 * Client for the platform endpoints (/api/platform/*) and the small pure helpers the demo pages use.
 * Network failures never throw from the public helpers used by the banner and the demo sign-in page:
 * they return a safe default so a page always renders.
 */

export type PlatformConfig = { demo_mode: boolean };
export type DemoAccount = { key: string; email: string; roles: string[]; description: string };
export type DemoAccounts = { accounts: DemoAccount[]; password: string | null };
export type Me = {
  person_id: string;
  display_name: string | null;
  email: string | null;
  roles: string[];
  demo_mode: boolean;
};
export type ServiceInfo = { id: string; name: string; url: string | null; eligible: boolean; reason?: string | null };
export type BankingAudience = "banking" | "app";

const base = () => `${window.location.origin}/api/platform`;

async function authHeader(): Promise<Record<string, string>> {
  const { auth } = await import("app/auth");
  const value = await auth.getAuthHeaderValue();
  return value ? { Authorization: value } : {};
}

export class PlatformError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, opts: { auth?: boolean; method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth) Object.assign(headers, await authHeader());
  const res = await fetch(`${base()}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try {
      const json = await res.json();
      detail = typeof json?.detail === "string" ? json.detail : "";
    } catch {
      /* not JSON */
    }
    throw new PlatformError(detail || `Request failed (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

let configPromise: Promise<PlatformConfig> | undefined;
/** Whether this is the demonstration environment. Cached for the page's life; any failure means "not demo". */
export function getPlatformConfig(): Promise<PlatformConfig> {
  configPromise ??= request<PlatformConfig>("/config").catch(() => ({ demo_mode: false }));
  return configPromise;
}
export function resetPlatformConfigCache() {
  configPromise = undefined;
}

/** The demo accounts, or null when this is not the demonstration environment (or the call failed). */
export async function getDemoAccounts(): Promise<DemoAccounts | null> {
  try {
    return await request<DemoAccounts>("/demo-accounts");
  } catch {
    return null;
  }
}

export const getMe = () => request<Me>("/me", { auth: true });
export const getServices = () => request<ServiceInfo[]>("/services", { auth: true });

/** Asks the website for a one-time link into Internet Banking or the App. Returns the address to open. */
export async function startHandoff(audience: BankingAudience, next = "/"): Promise<string> {
  const out = await request<{ url: string; expires_in: number }>("/handoff", {
    auth: true, method: "POST", body: { audience, next },
  });
  return out.url;
}

export type Destination = { label: string; path: string; description: string };

const DESTINATIONS: (Destination & { roles: string[] })[] = [
  { roles: ["super_admin", "admin"], label: "Administration", path: "/admin-dashboard",
    description: "Users, roles, suspension and the audit trail" },
  { roles: ["staff", "back_office", "super_admin"], label: "Back office", path: "/back-office-dashboard",
    description: "Payments, documents, invitations, the data room and licensing" },
  { roles: ["board_member"], label: "Board portal", path: "/board-portal",
    description: "Board papers, meetings and votes" },
  { roles: ["investor", "shareholder"], label: "My investments", path: "/my-subscriptions",
    description: "Subscriptions, proof of payment, receipts and certificates" },
];

/** The Citizen Hub workspaces a person's roles open, in the order they should be offered. */
export function hubDestinations(roles: string[]): Destination[] {
  const held = new Set(roles);
  return DESTINATIONS.filter((d) => d.roles.some((r) => held.has(r))).map(({ label, path, description }) => ({
    label, path, description,
  }));
}

const REASONS: Record<string, string> = {
  timeout: "You were signed out after a period of inactivity.",
  sso: "That sign-in link had expired or was already used. Sign in and open banking again.",
  unavailable: "Banking is temporarily unavailable. Please try again in a moment.",
};

/** Message for the ?reason= the banking apps send back. Unknown or missing reasons show nothing. */
export function reasonMessage(reason: string | null | undefined): string | null {
  return reason && Object.prototype.hasOwnProperty.call(REASONS, reason) ? REASONS[reason] : null;
}
