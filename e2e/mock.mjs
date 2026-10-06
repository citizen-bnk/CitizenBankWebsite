/** Stand-ins for the website (with Stack Auth) and the two banking hosts, to test the smoke test itself. */
import http from "node:http";

export const PASSWORD = "Mock-Password-1";
const ACCOUNTS = [
  ["customer", ["customer"]], ["investor", ["investor"]], ["shareholder", ["investor", "shareholder"]],
  ["board", ["board_member", "investor"]], ["staff", ["staff", "back_office"]], ["admin", ["admin", "super_admin"]],
  ["combined", ["customer", "investor", "shareholder", "board_member"]],
].map(([key, roles]) => ({ key, email: `${key}@demo.citizenbank.test`, roles, description: key }));
const HUB = ["investor", "shareholder", "board_member", "staff", "back_office", "admin", "super_admin"];

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
const url = (s) => `http://127.0.0.1:${s.address().port}`;
const send = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "application/json", ...headers }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let raw = ""; req.on("data", (c) => (raw += c)); req.on("end", () => r(raw ? JSON.parse(raw) : {})); });

/** A banking host: redeems each code once, then has a session; signed-out visitors go to /login. */
const BANK = { customer: { id: "u-customer", cents: 500000 }, combined: { id: "u-combined", cents: 500000 } };
function banking(mode, channel) {
  const used = new Set();
  return listen(http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/sso") {
      const code = u.searchParams.get("code"), who = (code || "").split("-")[1] || "customer";
      if (used.has(code) && mode !== "replayable") { res.writeHead(303, { location: "/login?reason=sso" }); return res.end(); }
      used.add(code);
      res.writeHead(303, { location: "/", "set-cookie": mode === "no-cookie" ? "x=1" : `cb_session=${who}; Path=/; HttpOnly` });
      return res.end();
    }
    if (u.pathname === "/api/health") { res.writeHead(200, { "content-type": "application/json" }); return res.end('{"ok":true,"db":"up"}'); }
    if (u.pathname === "/api/kyc") {
      if (mode === "old-core") { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": "application/json" }); return res.end('{"profile":null,"policy":{"version":"x"},"demoOnly":true}');
    }
    if (u.pathname === "/api/me") {
      const who = /cb_session=([a-z]+)/.exec(req.headers.cookie || "")?.[1];
      const b = BANK[who];
      if (!b) { res.writeHead(401, { "content-type": "application/json" }); return res.end("{}"); }
      const split = mode === "split-ledger" && channel === "app";
      const roles = mode === "privilege-leak" ? ["CUSTOMER", "SUPER_ADMIN"] : ["CUSTOMER"];
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ user: { id: split ? "u-other" : b.id, email: `${who}@demo.citizenbank.test`, roles },
        accounts: [{ number: "1000" + who.length, type: "CURRENT", balance: split ? 1 : b.cents }] }));
    }
    if (u.pathname === "/login") { res.writeHead(200, { "content-type": "text/html" }); return res.end("<main>Citizen Bank</main>"); }
    if (u.pathname === "/") {
      if (!(req.headers.cookie || "").includes("cb_session=")) { res.writeHead(307, { location: "/login" }); return res.end(); }
      res.writeHead(200); return res.end("home");
    }
    res.writeHead(404); res.end();
  }));
}

export async function start(mode = "good") {
  const bank = await banking(mode, "banking"), app = await banking(mode, "app");
  const site = await listen(http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://x"), p = u.pathname, body = await readBody(req);
    if (mode === "protected") { res.writeHead(302, { location: "https://vercel.com/sso-api?url=" + encodeURIComponent(req.url) }); return res.end(); }
    const who = ACCOUNTS.find((a) => `Bearer tok-${a.key}` === req.headers.authorization);
    if (p === "/") { res.writeHead(200, { "content-type": "text/html" }); return res.end('<script src="/a.js"></script>'); }
    if (p === "/a.js") return res.end('x={projectId:"11111111-1111-4111-8111-111111111111",publishableClientKey:"pck_mock"}');
    if (p === "/stack/auth/password/sign-in") {
      const a = ACCOUNTS.find((x) => x.email === body.email);
      return a && body.password === PASSWORD ? send(res, 200, { access_token: `tok-${a.key}` }) : send(res, 400, { code: "WRONG_PASSWORD" });
    }
    if (p === "/api/platform/config") return send(res, 200, { demo_mode: mode !== "not-demo" });
    if (p === "/api/platform/jwks.json") return send(res, 200, { keys: [{ kty: "EC", crv: "P-256", x: "a", y: "b", kid: "k", ...(mode === "leaks-private-key" ? { d: "secret" } : {}) }] });
    if (p === "/api/platform/demo-accounts") return send(res, 200, { accounts: ACCOUNTS, password: PASSWORD });
    if (!who) return send(res, 401, { detail: "Not authenticated" });
    const roles = who.key === "investor" && mode === "wrong-roles" ? ["investor", "board_member"] : who.roles;
    if (p === "/api/platform/me") return send(res, 200, { person_id: "p", roles });
    if (p === "/api/platform/services") return send(res, 200, [
      { id: "hub", eligible: roles.some((r) => HUB.includes(r)) },
      { id: "banking", url: url(bank), eligible: roles.includes("customer") || (mode === "investor-gets-banking" && who.key === "investor") },
      { id: "app", url: url(app), eligible: roles.includes("customer") }]);
    if (p === "/api/subscriptions/payments/record-payment") {
      const finance = roles.some((r) => ["super_admin", "back_office"].includes(r));
      return finance || (mode === "payments-open" && who.key === "investor") ? send(res, 404, { detail: "unknown" }) : send(res, 403, { detail: "no" });
    }
    if (p === "/api/subscriptions/core/my-public-subscriptions") {
      const has = ["investor", "shareholder", "combined"].includes(who.key) && !(mode === "lost-subscription" && who.key === "combined");
      return send(res, 200, { summary: {}, subscriptions: has ? [{ subscription_id: "S1" }] : [] });
    }
    if (p === "/api/platform/handoff") {
      if (!roles.includes("customer")) return send(res, 403, { detail: "no" });
      const target = body.audience === "app" ? app : bank;
      return send(res, 200, { url: `${url(target)}/sso?code=c${Math.random().toString(36).slice(2)}-${who.key}&next=/`, expires_in: 60 });
    }
    res.writeHead(404); res.end();
  }));
  return { site, bank, app, urls: { website: url(site), banking: url(bank), app: url(app) }, close: () => [site, bank, app].forEach((s) => s.close()) };
}
