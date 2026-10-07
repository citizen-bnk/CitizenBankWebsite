import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_POLICY, LICENCE_STATUS_SENTENCE, copyrightLine, firstContact, loadPolicy, mergePolicy,
  resetPolicyCache, visibleContact,
} from "utils/policy";

describe("mergePolicy", () => {
  it("returns the defaults for garbage input", () => {
    for (const bad of [null, undefined, 5, "x", {}, { policies: null }, { policies: [] }]) {
      expect(mergePolicy(bad)).toEqual(DEFAULT_POLICY);
    }
  });
  it("overrides known keys and ignores wrong types and empty strings", () => {
    const p = mergePolicy({
      policies: {
        "legal.footer": "Custom footer",
        "legal.licence_status": "   ",
        "legal.company_name": 7,
        "brand.name": "Citizen Bank (in application)",
        "contact.email": " hello@example.org ",
        "contact.phone": null,
        "contact.unknown": "x",
      },
    });
    expect(p.legal.footer).toBe("Custom footer");
    expect(p.legal.licence_status).toBe(LICENCE_STATUS_SENTENCE);
    expect(p.legal.company_name).toBe("Citizen Digital Ltd");
    expect(p.brand.name).toBe("Citizen Bank (in application)");
    expect(p.contact.email).toBe("hello@example.org");
    expect(p.contact.phone).toBeNull();
  });
  it("does not mutate the defaults", () => {
    mergePolicy({ policies: { "legal.footer": "x", "contact.email": "a@b.c" } });
    expect(DEFAULT_POLICY.contact.email).toBeNull();
    expect(DEFAULT_POLICY.legal.footer).not.toBe("x");
  });
});

describe("default licence wording", () => {
  it("states applicant status and never claims a licence", () => {
    expect(DEFAULT_POLICY.legal.licence_status).toMatch(/applicant for a Central Bank of Lesotho banking licence/);
    expect(DEFAULT_POLICY.legal.licence_status).toMatch(/does not currently carry on banking business/);
  });
});

describe("contact helpers", () => {
  it("hides null lines and keeps the requested order", () => {
    const p = mergePolicy({ policies: { "contact.phone": "+266 0000", "contact.email": "a@b.c" } });
    expect(visibleContact(p, ["phone", "address", "email"])).toEqual([
      { key: "phone", value: "+266 0000" },
      { key: "email", value: "a@b.c" },
    ]);
    expect(visibleContact(DEFAULT_POLICY)).toEqual([]);
  });
  it("firstContact falls back along the key list", () => {
    const p = mergePolicy({ policies: { "contact.email": "a@b.c" } });
    expect(firstContact(p, ["privacy_email", "email"])).toBe("a@b.c");
    expect(firstContact(DEFAULT_POLICY, ["privacy_email", "email"])).toBeNull();
  });
});

describe("copyrightLine", () => {
  it("uses the given year and the registered entity", () => {
    expect(copyrightLine(DEFAULT_POLICY, 2031)).toBe("© 2031 Citizen Digital Ltd (Reg. 99073). All rights reserved.");
  });
});

describe("loadPolicy", () => {
  beforeEach(() => resetPolicyCache());
  it("merges a successful response and caches it", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ policies: { "contact.email": "a@b.c" } }), { status: 200 }));
    const p = await loadPolicy(f as unknown as typeof fetch);
    expect(p.contact.email).toBe("a@b.c");
    await loadPolicy(f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("falls back to the defaults on HTTP errors, network errors and bad JSON", async () => {
    const cases = [
      async () => new Response("no", { status: 500 }),
      async () => { throw new Error("offline"); },
      async () => new Response("not json", { status: 200 }),
    ];
    for (const c of cases) {
      resetPolicyCache();
      await expect(loadPolicy(c as unknown as typeof fetch)).resolves.toEqual(DEFAULT_POLICY);
    }
  });
});
