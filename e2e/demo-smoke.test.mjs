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
      // Either a login page of its own (passkey / explore / website sign-in), or a hand-over to the website's sign-in.
      const login = await http(url + "/login");
      if (login.status === 200) assert.match(await login.text(), /Citizen/);
      else {
        assert.ok([302, 303, 307, 308].includes(login.status), `/login returned ${login.status}`);
        assert.ok((login.headers.get("location") || "").startsWith(WEBSITE), `/login redirects somewhere other than the website: ${login.headers.get("location")}`);
      }
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

/**
 * USE CASE: one person, one sign-in, two systems of record, two channels.
 *
 * A demo customer signs in once on the website and opens Internet Banking and the mobile App from there. Both banking
 * channels must put them in the SAME bank profile (one user, the same accounts and balances in the one ledger), with
 * customer rights only. The combined account also holds an investment on the website side under the same identity.
 * Nothing is changed in the demo: every call here only reads.
 */
describe("use case: one sign-in reaches the same person's bank accounts on both channels, and their investment", () => {
  const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "BACK_OFFICE", "STAFF"];

  async function enter(auth, audience, base) {
    const handoff = await json(`${WEBSITE}/api/platform/handoff`, {
      method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ audience, next: "/" }),
    });
    assert.equal(handoff.status, 200, `no ${audience} handoff: ${JSON.stringify(handoff.body)}`);
    const landed = await http(handoff.body.url);
    assert.equal(landed.status, 303, `${audience} refused the handoff (HTTP ${landed.status})`);
    const cookie = cookiesFrom(landed);
    assert.match(cookie, /cb_session=/, `${audience} set no session`);
    const me = await json(`${base}/api/me`, { headers: { cookie } });
    assert.equal(me.status, 200, `${audience} /api/me returned ${me.status}: ${JSON.stringify(me.body).slice(0, 200)}`);
    // Core is healthy and is the release that has progressive KYC (the integration), not an older one
    const health = await json(`${base}/api/health`);
    assert.equal(health.body?.ok, true, `${audience}: Core health check failed (${health.status})`);
    const kyc = await json(`${base}/api/kyc`, { headers: { cookie } });
    assert.equal(kyc.status, 200, `${audience}: Core has no /api/kyc (HTTP ${kyc.status}): it is not the integrated release yet`);
    assert.equal(kyc.body?.demoOnly, true, "Core's verification policy must be marked demonstration-only");
    return { cookie, me: me.body };
  }

  for (const key of ["customer", "combined"]) {
    test(`${key}: the same bank profile, accounts and balances on Internet Banking and on the App`, { skip: !BANKING || !APP }, async () => {
      const account = accounts.find((a) => a.key === key);
      const auth = { authorization: `Bearer ${await signIn(stack, account.email, password)}` };
      const [web, phone] = [await enter(auth, "banking", BANKING), await enter(auth, "app", APP)];

      // one person: the profile on both channels is the website account's, and it is one and the same user
      assert.equal(web.me.user.email.toLowerCase(), account.email.toLowerCase(), "the bank profile belongs to someone else");
      assert.equal(phone.me.user.id, web.me.user.id, "the two channels opened two different bank profiles for one person");
      // one ledger: the same accounts with the same balances
      const view = (me) => me.accounts.map((a) => `${a.number}:${a.type}:${a.balance}`).sort();
      assert.ok(web.me.accounts.length >= 1, "a new customer should have at least the demo account");
      assert.deepEqual(view(phone.me), view(web.me), "the two channels show different accounts or balances");
      assert.ok(web.me.accounts.some((a) => Number(a.balance) > 0), "the demo account has no demo money");
      // customer rights only: signing in through the website never grants banking staff or admin powers
      const roles = (web.me.user.roles || []).map((r) => String(r).toUpperCase());
      assert.ok(roles.includes("CUSTOMER"), `roles in the bank: ${roles}`);
      assert.deepEqual(roles.filter((r) => ADMIN_ROLES.includes(r)), [], "a website sign-in granted banking staff or admin rights");
    });
  }

  test("combined: the same sign-in also holds an investment on the website side", async () => {
    const account = accounts.find((a) => a.key === "combined");
    const auth = { authorization: `Bearer ${await signIn(stack, account.email, password)}` };
    const subs = await json(`${WEBSITE}/api/subscriptions/my-subscriptions`, { headers: auth });
    assert.equal(subs.status, 200, `my-subscriptions returned ${subs.status}`);
    const list = Array.isArray(subs.body) ? subs.body : subs.body?.subscriptions;
    assert.ok(Array.isArray(list) && list.length >= 1, "the combined account has no investment on the website");
  });

  test("an investor who is not a customer has an investment but no bank profile", async () => {
    const account = accounts.find((a) => a.key === "investor");
    const auth = { authorization: `Bearer ${await signIn(stack, account.email, password)}` };
    const subs = await json(`${WEBSITE}/api/subscriptions/my-subscriptions`, { headers: auth });
    const list = Array.isArray(subs.body) ? subs.body : subs.body?.subscriptions;
    assert.ok(Array.isArray(list) && list.length >= 1, "the investor has no investment");
    if (BANKING) {
      const refused = await json(`${WEBSITE}/api/platform/handoff`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: '{"audience":"banking"}' });
      assert.equal(refused.status, 403, "an investor must not be able to enter banking");
    }
  });
});
