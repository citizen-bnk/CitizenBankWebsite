import type { DemoAccount } from "utils/platform";
import { hubDestinations } from "utils/platform";
import { hubBase } from "utils/hub";

export const MANUAL_PARAM = "manual";
export const DEFAULT_AFTER_SIGN_IN = "/demo/launch";

/**
 * Where to go after a quick demo sign-in: the address the visitor was heading to (`after_auth_return_to`), but only a path on
 * this site or an address on the Citizen Hub; anything else (another site, a script address) falls back to the launcher.
 */
export function afterSignInTarget(
  raw: string | null | undefined,
  ownOrigin: string,
  hub: string | null = hubBase(),
): string {
  if (!raw) return DEFAULT_AFTER_SIGN_IN;
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) return raw;
  try {
    const url = new URL(raw);
    const allowed = [ownOrigin, hub ? new URL(hub).origin : null];
    if ((url.protocol === "https:" || url.protocol === "http:") && allowed.includes(url.origin)) return url.href;
  } catch {
    /* not an address */
  }
  return DEFAULT_AFTER_SIGN_IN;
}

/** What this demo account can open, for the label on its card. */
export function opensLabels(account: Pick<DemoAccount, "roles">): string[] {
  const out = hubDestinations(account.roles).map((d) => d.label);
  if (account.roles.includes("customer")) out.push("Internet Banking", "Citizen Bank App");
  return out;
}

/** Whether the visitor asked for the ordinary email-and-password form instead of the demo picker. */
export function wantsManualSignIn(search: string): boolean {
  return new URLSearchParams(search).has(MANUAL_PARAM);
}

/** True for the sign-in screen of the Stack handler, wherever the app is mounted. */
export function isSignInPath(pathname: string): boolean {
  return /\/auth\/sign-in\/?$/.test(pathname);
}
