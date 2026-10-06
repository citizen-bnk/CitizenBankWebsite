/** Proves the smoke test passes on a correct demo and FAILS on each kind of mistake. Run: node e2e/selftest.mjs */
import { spawn } from "node:child_process";
import { start } from "./mock.mjs";

// Async on purpose: the mock servers live in this process and must keep answering while the child runs.
const run = (urls, onlyWebsite = false) => new Promise((resolve) => {
  const child = spawn(process.execPath, ["--test", "e2e/demo-smoke.test.mjs"], {
    env: { ...process.env, WEBSITE_URL: urls.website, BANKING_URL: onlyWebsite ? "" : urls.banking, APP_URL: onlyWebsite ? "" : urls.app, STACK_API_BASE: urls.website + "/stack" },
  });
  let out = "";
  child.stdout.on("data", (c) => (out += c));
  child.stderr.on("data", (c) => (out += c));
  const timer = setTimeout(() => child.kill(), 60000);
  child.on("close", (status) => { clearTimeout(timer); resolve({ status, out }); });
});

let bad = 0;
{ // given only the website address, the test finds the banking hosts itself and still checks them
  const mock = await start("good");
  const r = await run(mock.urls, true);
  const found = r.out.includes(`# internet banking: ${mock.urls.banking}`) && r.out.includes(`# mobile app: ${mock.urls.app}`);
  mock.close();
  const ok = r.status === 0 && found;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "BAD "} discovery: only WEBSITE_URL given, banking hosts found and checked`);
  const broken = await start("replayable");
  const r2 = await run(broken.urls, true);
  broken.close();
  const ok2 = r2.status !== 0;
  if (!ok2) bad++;
  console.log(`${ok2 ? "ok  " : "BAD "} discovery: a replayable code is still caught through discovered hosts`);
}
for (const [mode, shouldPass, mustSay] of [["good", true], ["not-demo", false], ["leaks-private-key", false], ["wrong-roles", false],
  ["investor-gets-banking", false], ["payments-open", false], ["replayable", false], ["no-cookie", false],
  ["protected", false, /Deployment Protection/],
  ["split-ledger", false, /different bank profiles|different accounts or balances/], ["privilege-leak", false, /staff or admin rights/],
  ["lost-subscription", false, /no investment on the website/]]) {
  const mock = await start(mode);
  const r = await run(mock.urls);
  mock.close();
  const passed = r.status === 0;
  const ok = passed === shouldPass && (!mustSay || mustSay.test(r.out));
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "BAD "} mode=${mode}: smoke test ${passed ? "passed" : "failed"}${shouldPass ? " (expected pass)" : " (expected failure)"}${mustSay && !mustSay.test(r.out) ? ` BUT the message does not mention ${mustSay}` : ""}`);
  if (!ok) console.log(r.out.split("\n").filter((l) => /not ok|error|expected/i.test(l)).slice(0, 8).join("\n"));
}
process.exit(bad ? 1 : 0);
