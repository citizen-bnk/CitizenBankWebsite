/**
 * Signs in as each of the seven demo accounts against the deployed demo and checks what each can and cannot do.
 *
 *   WEBSITE_URL=https://... [HUB_URL=...] [BANKING_URL=...] [APP_URL=...] node --test e2e/
 *
 * The accounts and the shared password come from the demo's own public /api/platform/demo-accounts page.
 * Every check is read-only except the sign-in itself and the one-time banking handoff.
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { cookiesFrom, expectations, http, json, signIn, stackConfig, trim } from "./lib.mjs";

const WEBSITE = trim(process.env.WEBSITE_URL);
if (!WEBSITE) throw new Error("Set WEBSITE_URL to the demo website's address.");

const demo = await json(`${WEBSITE}/api/platform/demo-accounts`);
assert.equal(demo.status, 200, `the demo accounts page must be public in demo mode (HTTP ${demo.status})`);
const accounts = demo.body.accounts;
const password = demo.body.password;
const stack = await stackConfig(WEBSITE);

// The website's launcher says where banking is. Use that unless an address was given, so only WEBSITE_URL is needed.
let HUB = trim(process.env.HUB_URL), BANKING = trim(process.env.BANKING_URL), APP = trim(process.env.APP_URL);
const discovered = {};
{
  const customer = accounts.find((a) => a.key === "customer");
  const token = await signIn(stack, customer.email, password);
  const services = await json(`${WEBSITE}/api/platform/services`, { headers: { authorization: `Bearer ${token}` } });
  for (const svc of services.body || []) if (svc.url && svc.url.startsWith("http")) discovered[svc.id] = trim(svc.url);
  BANKING ||= discovered.banking || "";
  APP ||= discovered.app || "";
}
console.log(`# demo website: ${WEBSITE}\n# internet banking: ${BANKING || "(not configured)"}\n# mobile app: ${APP || "(not configured)"}\n# hub: ${HUB || "(none given)"}`);

describe("the website is a demo and publishes what other hosts need", () => {
  test("config says demo mode; keys are published; the account list is complete; unauthenticated calls are refused", async () => {
    assert.equal((await json(`${WEBSITE}/api/platform/config`)).body?.demo_mode, true);
    const jwks = await json(`${WEBSITE}/api/platform/jwks.json`);
    assert.equal(jwks.status, 200, "handoff keys are not published (is PLATFORM_SIGNING_KEY set?)");
    assert.ok(jwks.body.keys.length >= 1 && jwks.body.keys.every((k) => k.kty === "EC" && !("d" in k)), "keys must be public EC keys only");
    assert.equal(accounts.length, 7);
    assert.ok(password && password.length >= 8, "DEMO_PASSWORD_DISPLAY is not set");
    assert.equal((await json(`${WEBSITE}/api/platform/me`)).status, 401);
    assert.equal((await json(`${WEBSITE}/api/platform/services`)).status, 401);
    assert.equal((await json(`${WEBSITE}/api/platform/handoff`, { method: "POST", headers: { "content-type": "application/json" }, body: '{"audience":"banking"}' })).status, 401);
  });
});

describe("the other hosts are up and send signed-out visitors to sign in", { skip: !HUB && !BANKING && !APP }, () => {
  test("hub shows its page and reaches the demo website API through its own address", { skip: !HUB }, async () => {
    assert.equal((await http(HUB + "/")).status, 200);
    const cfg = await json(`${HUB}/api/platform/config`);
    assert.equal(cfg.body?.demo_mode, true, "the hub's /api must be forwarded to the DEMO website, not the live one");
  });
  for (const [name, url] of [["internet banking", BANKING], ["mobile app", APP]]) {
    test(`${name}: signed out goes to /login, and /login offers a way in`, { skip: !url }, async () => {
      const first = await http(url + "/");
      assert.ok([302, 303, 307, 308].includes(first.status), `signed-out home should redirect, got ${first.status}`);
      assert.match(first.headers.get("location") || "", /\/login/);
      const login = await http(url + "/login");
      assert.equal(login.status, 200);
      assert.match(await login.text(), /Citizen/);
    });
  }
});

describe("each demo account sees exactly what its roles allow", () => {
  const keys = ["customer", "investor", "shareholder", "board", "staff", "admin", "combined"];
  for (const key of keys) {
    test(key, async (t) => {
      const account = accounts.find((a) => a.key === key);
      assert.ok(account, `${key} is missing from the demo account list`);
      const want = expectations(account.roles);
      const token = await signIn(stack, account.email, password);
      const auth = { authorization: `Bearer ${token}` };

      await t.test("the platform knows who they are and what they hold", async () => {
        const me = await json(`${WEBSITE}/api/platform/me`, { headers: auth });
        assert.equal(me.status, 200, `/me returned ${me.status}: ${JSON.stringify(me.body)}`);
        assert.deepEqual([...me.body.roles].sort(), [...account.roles].sort(), "roles in the database differ from the demo definition (run the seeder)");
      });

      await t.test("the launcher offers exactly the right services", async () => {
        const services = await json(`${WEBSITE}/api/platform/services`, { headers: auth });
        assert.equal(services.status, 200);
        const eligible = Object.fromEntries(services.body.map((s) => [s.id, s.eligible]));
        for (const [id, url] of [["banking", BANKING], ["app", APP]]) {
          if (url) assert.equal(eligible[id], want[id], `${key}: ${id} eligible should be ${want[id]}`);
        }
        assert.equal(eligible.hub, want.hub, `${key}: hub eligible should be ${want.hub}`);
      });

      await t.test("only finance roles can record payments (probe against a subscription that does not exist)", async () => {
        const res = await json(`${WEBSITE}/api/subscriptions/payments/record-payment`, {
          method: "POST", headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ subscription_id: "e2e-no-such-subscription", amount: "1", payment_reference: "e2e-probe" }),
        });
        if (want.finance) assert.equal(res.status, 404, `finance user should pass the role check (got ${res.status})`);
        else assert.equal(res.status, 403, `a non-finance user must be refused (got ${res.status}): this is a security failure`);
      });

      for (const [audience, base] of [["banking", BANKING], ["app", APP]]) {
        await t.test(`${audience}: handoff is ${want[audience] ? "issued and works exactly once" : "refused"}`, { skip: !base }, async () => {
          const res = await json(`${WEBSITE}/api/platform/handoff`, {
            method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ audience, next: "/" }),
          });
          if (!want[audience]) return assert.equal(res.status, 403, `${key} must not get a ${audience} token (got ${res.status})`);
          assert.equal(res.status, 200, `handoff failed: ${JSON.stringify(res.body)}`);
          assert.ok(res.body.url.startsWith(`${base}/sso?code=`), `handoff points to the wrong host: ${res.body.url.split("?")[0]}`);

          const landed = await http(res.body.url);
          assert.equal(landed.status, 303, `the banking host did not accept the token (HTTP ${landed.status}); check PLATFORM_JWKS_URL and PLATFORM_ISSUER on Core`);
          const location = landed.headers.get("location");
          assert.ok(location.startsWith("/") && !location.startsWith("//"), `unexpected redirect target ${location}`);
          assert.ok(!location.includes("/login?reason="), `sign-in was refused: ${location}`);
          const cookie = cookiesFrom(landed);
          assert.match(cookie, /cb_session=/, "no session cookie was set");

          const home = await http(base + "/", { headers: { cookie } });
          assert.equal(home.status, 200, `signed in but the home page returned ${home.status}`);

          const replay = await http(res.body.url);
          assert.equal(replay.status, 303);
          assert.match(replay.headers.get("location"), /\/login\?reason=sso/, "the one-time code was accepted a second time");
        });
      }
    });
  }
});
