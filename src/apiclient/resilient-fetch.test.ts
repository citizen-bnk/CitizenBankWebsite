import { test } from "node:test";
import assert from "node:assert/strict";
import { resilientFetch } from "./resilient-fetch";

test("safe reads recover from one gateway failure", async () => {
  let calls = 0;
  const fakeFetch = (async () => {
    calls++;
    return new Response(JSON.stringify({ ok: true }), { status: calls === 1 ? 503 : 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const result = await resilientFetch("/api/status", {}, fakeFetch);
  assert.equal(result.status, 200);
  assert.equal(calls, 2);
});

test("a failed share subscription is never automatically resubmitted", async () => {
  let calls = 0;
  const fakeFetch = (async () => {
    calls++;
    return new Response("Gateway failed", { status: 503, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  const result = await resilientFetch("/api/subscriptions", { method: "POST" }, fakeFetch);
  assert.equal(calls, 1);
  assert.equal(result.status, 503);
  assert.equal((await result.json()).code, "SERVICE_UNAVAILABLE");
});

test("a Request object retains its unsafe method", async () => {
  let calls = 0;
  const fakeFetch = (async () => {
    calls++;
    return new Response(null, { status: 502 });
  }) as typeof fetch;
  await resilientFetch(new Request("https://example.test/api/payment", { method: "POST" }), {}, fakeFetch);
  assert.equal(calls, 1);
});
