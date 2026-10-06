import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, afterSignInTarget, isSignInPath, opensLabels, wantsManualSignIn } from "utils/demoSignIn";
import { FROM_HUB_PARAM, MOVED_TO_HUB, hubBase, hubRedirectTarget, hubUrl, workspaceHref } from "utils/hub";

const HUB = "https://hub.citizenbank.co.ls";

describe("hubBase", () => {
  it("accepts an http(s) address and trims slashes", () => {
    expect(hubBase("https://hub.citizenbank.co.ls/")).toBe(HUB);
  });
  it("is null when unset, blank or not a web address", () => {
    for (const v of [undefined, "", "  ", "hub.citizenbank.co.ls", "javascript:alert(1)"]) expect(hubBase(v)).toBeNull();
  });
});

describe("hubRedirectTarget", () => {
  it("keeps every screen here while the Hub is not configured", () => {
    for (const p of MOVED_TO_HUB) expect(hubRedirectTarget(p, "", "", null)).toBeNull();
  });
  it("sends each moved path to the same path, query and hash on the Hub", () => {
    for (const p of MOVED_TO_HUB) expect(hubRedirectTarget(p, "", "", HUB)).toBe(`${HUB}${p}`);
    expect(hubRedirectTarget("/meeting-details", "?id=7", "#notes", HUB)).toBe(`${HUB}/meeting-details?id=7#notes`);
    expect(hubRedirectTarget("/board-portal/", "", "", HUB)).toBe(`${HUB}/board-portal`);
  });
  it("leaves other screens alone, including look-alikes", () => {
    for (const p of ["/", "/admin-dashboard", "/back-office-board-documents", "/board-portal-invitations", "/demo"]) {
      expect(hubRedirectTarget(p, "", "", HUB)).toBeNull();
    }
  });
  it("does not bounce again when the Hub sent the visitor back", () => {
    expect(hubRedirectTarget("/board-portal", `?${FROM_HUB_PARAM}=1`, "", HUB)).toBeNull();
  });
});

describe("hubUrl and workspaceHref", () => {
  it("builds Hub addresses only for a configured Hub and a relative path", () => {
    expect(hubUrl("/board-portal", HUB)).toBe(`${HUB}/board-portal`);
    expect(hubUrl("//evil.example", HUB)).toBe(`${HUB}/`);
    expect(hubUrl("/x", null)).toBeNull();
  });
  it("only investor and board workspaces open on the Hub", () => {
    expect(workspaceHref("/my-subscriptions", HUB)).toBe(`${HUB}/my-subscriptions`);
    expect(workspaceHref("/board-portal", HUB)).toBe(`${HUB}/board-portal`);
    expect(workspaceHref("/admin-dashboard", HUB)).toBeNull();
    expect(workspaceHref("/back-office-dashboard", HUB)).toBeNull();
    expect(workspaceHref("/my-subscriptions", null)).toBeNull();
  });
});

describe("afterSignInTarget", () => {
  const own = "https://demo.example";
  it("goes to the launcher when nothing was asked for", () => {
    expect(afterSignInTarget(null, own, HUB)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
  it("keeps a path on this site and an address on this site or the Hub", () => {
    expect(afterSignInTarget("/board-portal", own, HUB)).toBe("/board-portal");
    expect(afterSignInTarget(`${HUB}/my-subscriptions?x=1`, own, HUB)).toBe(`${HUB}/my-subscriptions?x=1`);
    expect(afterSignInTarget(`${own}/demo/launch`, own, HUB)).toBe(`${own}/demo/launch`);
  });
  it("refuses other sites and script addresses", () => {
    for (const bad of ["https://evil.example/x", "//evil.example", "javascript:alert(1)", "/\\evil.example", `${HUB}.evil.example/`]) {
      expect(afterSignInTarget(bad, own, HUB)).toBe(DEFAULT_AFTER_SIGN_IN);
    }
    expect(afterSignInTarget(`${HUB}/x`, own, null)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});

describe("demo sign-in helpers", () => {
  it("labels what each role opens", () => {
    expect(opensLabels({ roles: ["customer"] })).toEqual(["Internet Banking", "Citizen Bank App"]);
    expect(opensLabels({ roles: ["board_member"] })).toEqual(["Board portal"]);
    expect(opensLabels({ roles: ["investor", "customer"] })).toEqual(["My investments", "Internet Banking", "Citizen Bank App"]);
  });
  it("recognises the sign-in screen and the manual switch", () => {
    expect(isSignInPath("/auth/sign-in")).toBe(true);
    expect(isSignInPath("/auth/sign-up")).toBe(false);
    expect(wantsManualSignIn("?manual=1")).toBe(true);
    expect(wantsManualSignIn("?after_auth_return_to=x")).toBe(false);
  });
});
