import { readFileSync } from "node:fs";

const routes = new Set([...readFileSync("src/user-routes.tsx", "utf8").matchAll(/path:\s*["'](\/[\w/*-]*)["']/g)].map(match => match[1]));
const files = ["src/components/Header.tsx", "src/components/Footer.tsx", "src/pages/App.tsx", "src/pages/HelpCenter.tsx", "src/pages/Faqs.tsx"];
const missing = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/(?:to|href)=["'](\/[\w/-]*)["']/g)) {
    const resolved = match[1] === "/" || routes.has(match[1]) || [...routes].some(route => route.endsWith("/*") && match[1].startsWith(route.slice(0, -1)));
    if (!resolved) missing.push(`${file}: ${match[1]}`);
  }
}
if (missing.length) {
  console.error("Public links without routes:\n" + missing.join("\n"));
  process.exitCode = 1;
} else console.log(`Checked public navigation against ${routes.size} website routes.`);
