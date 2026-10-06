/** Proves the smoke test passes on a correct demo and FAILS on each kind of mistake. Run: node e2e/selftest.mjs */
import { spawn } from "node:child_process";
import { start } from "./mock.mjs";

// Async on purpose: the mock servers live in this process and must keep answering while the child runs.
const run = (urls) => new Promise((resolve) => {
  const child = spawn(process.execPath, ["--test", "e2e/demo-smoke.test.mjs"], {
    env: { ...process.env, WEBSITE_URL: urls.website, BANKING_URL: urls.banking, APP_URL: urls.app, STACK_API_BASE: urls.website + "/stack" },
  });
  let out = "";
  child.stdout.on("data", (c) => (out += c));
  child.stderr.on("data", (c) => (out += c));
  const timer = setTimeout(() => child.kill(), 60000);
  child.on("close", (status) => { clearTimeout(timer); resolve({ status, out }); });
});

let bad = 0;
for (const [mode, shouldPass] of [["good", true], ["not-demo", false], ["leaks-private-key", false], ["wrong-roles", false],
  ["investor-gets-banking", false], ["payments-open", false], ["replayable", false], ["no-cookie", false]]) {
  const mock = await start(mode);
  const r = await run(mock.urls);
  mock.close();
  const passed = r.status === 0;
  const ok = passed === shouldPass;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "BAD "} mode=${mode}: smoke test ${passed ? "passed" : "failed"}${shouldPass ? " (expected pass)" : " (expected failure)"}`);
  if (!ok) console.log(r.out.split("\n").filter((l) => /not ok|error|expected/i.test(l)).slice(0, 8).join("\n"));
}
process.exit(bad ? 1 : 0);
