/** Prints e2e/demo-urls.json as one line, for the workflow to read. */
import { readFileSync } from "node:fs";
process.stdout.write(JSON.stringify(JSON.parse(readFileSync(new URL("./demo-urls.json", import.meta.url), "utf8"))));
