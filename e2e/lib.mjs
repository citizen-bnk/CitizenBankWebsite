/** Small helpers for the demo smoke test. No dependencies: Node 22 has fetch and node:test. */

export const STACK_API = process.env.STACK_API_BASE || "https://api.stack-auth.com/api/v1";
export const HUB_ROLES = ["investor", "shareholder", "board_member", "staff", "back_office", "admin", "super_admin"];
export const FINANCE_ROLES = ["super_admin", "back_office"];

export const trim = (u) => (u || "").trim().replace(/\/+$/, "");

export class ProtectedDeployment extends Error {}

/** fetch with the optional Vercel protection-bypass header; explains a protected deployment instead of failing obscurely. */
export async function http(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const bypass = process.env.VERCEL_PROTECTION_BYPASS;
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;
  const res = await fetch(url, { redirect: "manual", ...opts, headers });
  if (res.status === 401 && (res.headers.get("set-cookie") || "").includes("_vercel_sso_nonce")) throw protectedError(url);
  if (res.status === 401 || res.status === 403) {
    const server = res.headers.get("server") || "";
    const ctype = res.headers.get("content-type") || "";
    if (/vercel/i.test(server) && ctype.includes("text/html")) {
      const text = await res.clone().text();
      if (/Authentication Required|vercel\.com\/sso-api|Vercel Authentication/i.test(text)) throw protectedError(url);
    }
  }
  return res;
}

function protectedError(url) {
  return new ProtectedDeployment(
    `${new URL(url).host} is behind Vercel Deployment Protection, so nobody outside the team can reach it. ` +
      "Either turn protection off for the demo projects (Settings, Deployment Protection) or create a " +
      "'Protection Bypass for Automation' secret and pass it as VERCEL_PROTECTION_BYPASS.",
  );
}

export async function json(url, opts) {
  const res = await http(url, opts);
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, body, headers: res.headers };
}

/** The public Stack project settings baked into the website's JavaScript (override with STACK_PROJECT_ID / STACK_PUBLISHABLE_KEY). */
export function findStackConfig(source) {
  const id = /projectId["']?\s*:\s*["']([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["']/.exec(source);
  const key = /publishableClientKey["']?\s*:\s*["'](pck_[A-Za-z0-9_-]+)["']/.exec(source);
  return id && key ? { projectId: id[1], publishableKey: key[1] } : null;
}

export async function stackConfig(websiteUrl) {
  if (process.env.STACK_PROJECT_ID && process.env.STACK_PUBLISHABLE_KEY) {
    return { projectId: process.env.STACK_PROJECT_ID, publishableKey: process.env.STACK_PUBLISHABLE_KEY };
  }
  const html = await (await http(websiteUrl + "/")).text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => new URL(m[1], websiteUrl + "/").href);
  for (const src of scripts) {
    const found = findStackConfig(await (await http(src)).text());
    if (found) return found;
  }
  throw new Error("Could not find the Stack Auth project in the website's JavaScript. Set STACK_PROJECT_ID and STACK_PUBLISHABLE_KEY.");
}

export async function signIn(cfg, email, password) {
  const res = await http(`${STACK_API}/auth/password/sign-in`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-stack-project-id": cfg.projectId,
      "x-stack-publishable-client-key": cfg.publishableKey,
      "x-stack-access-type": "client",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`Stack Auth refused the sign-in for ${email} (HTTP ${res.status}${body.code ? ", " + body.code : ""}). ` +
      "The demo user may not exist in this Stack project, or the password differs from DEMO_PASSWORD_DISPLAY.");
  }
  return body.access_token;
}

/** What an account should be able to do, derived from the roles the demo itself lists. */
export function expectations(roles) {
  const has = (r) => roles.includes(r);
  return {
    hub: roles.some((r) => HUB_ROLES.includes(r)),
    banking: has("customer"),
    app: has("customer"),
    finance: roles.some((r) => FINANCE_ROLES.includes(r)),
  };
}

export function cookiesFrom(res) {
  return (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
}
