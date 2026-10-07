import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Deny-list of claims that must not appear in public pages or shared components. Each pattern is something that
 * was found hard-coded and removed (see the truth notes). Legal and contact text comes from utils/policy.ts.
 *
 * Not scanned: back-office/admin screens (staff only), ui primitives, and the pages owned by the content/timeline
 * work (Media, NewsCarousel, AchievementsTimeline), whose data comes from the API.
 */
const root = path.resolve(__dirname, "../..");
const EXCLUDED = /^(Admin|BackOffice)|^(Media|NewsCarousel|AchievementsTimeline)\.tsx$/;

const files = ["pages", "components"].flatMap((dir) =>
  readdirSync(path.join(root, dir), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx") && !EXCLUDED.test(e.name))
    .map((e) => path.join(dir, e.name)),
);

export const DENY: [string, RegExp][] = [
  ["award-winning", /award[- ]winning/i],
  ["recognised for excellence", /recogni[sz]ed for excellence/i],
  ["customer/client/user counts", /\b\d{1,3}(,\d{3})+\+?\s*(customers|clients|users)/i],
  ["active customers metric", /Active Customers|Customer Satisfaction/],
  ["licensed by / licensed bank", /licensed (by|bank)/i],
  ["regulated by", /regulated by/i],
  ["banking regulations compliance", /comply with all applicable banking regulations/i],
  ["bank-level", /bank-level/i],
  ["industry-leading", /industry-leading/i],
  ["trusted partner", /trusted financial partner/i],
  ["branch counts", /\b\d+\+?\s+(branches|ATMs?|ATM locations)\b/i],
  ["branches in a sentence", /(visit|find|nearest|any of our) (any of our |your nearest )?branch/i],
  ["24/7 claims", /24\/7/],
  ["hotline", /hotline/i],
  ["invented phone numbers", /\+266\s?2\d{3}\s?\d{4}/],
  ["invented company emails", /@citizenbank\.co\.ls/i],
  ["invented address", /Kingsway/i],
  ["invented impact figures", /Our Impact in 20\d\d|Students Supported|Lives Impacted/],
  ["Basel report", /Basel III/i],
];

describe("public pages and components contain no invented claims", () => {
  it("finds files to scan", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(path.join("pages", "App.tsx"));
    expect(files).toContain(path.join("components", "Footer.tsx"));
  });

  for (const [name, pattern] of DENY) {
    it(`no "${name}"`, () => {
      const hits = files.flatMap((f) =>
        readFileSync(path.join(root, f), "utf8")
          .split("\n")
          .map((line, i) => ({ f, line: i + 1, text: line.trim() }))
          .filter((l) => pattern.test(l.text))
          .map((l) => `${l.f}:${l.line}: ${l.text.slice(0, 100)}`),
      );
      expect(hits).toEqual([]);
    });
  }

  it("the footer reads the licence status from the policy layer", () => {
    const footer = readFileSync(path.join(root, "components/Footer.tsx"), "utf8");
    expect(footer).toContain("policy.legal.licence_status");
    expect(footer).not.toMatch(/applicant for a Central Bank/);
  });
});
