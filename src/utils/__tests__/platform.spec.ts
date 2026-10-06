import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authHeader = vi.fn(async () => "Bearer test-token");
vi.mock("app/auth", () => ({ auth: { getAuthHeaderValue: () => authHeader() } }));

import { resolveApiUrl } from "utils/apiUrl";
import {
  PlatformError, getDemoAccounts, getMe, getPlatformConfig, hubDestinations, reasonMessage,
  resetPlatformConfigCache, startHandoff,
} from "utils/platform";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("resolveApiUrl", () => {
  it("uses the page's own origin, not the build-time localhost address", () => {
    expect(resolveApiUrl("https://citizenbank.example", "http://localhost:8000")).toBe("https://citizenbank.example/api");
    expect(resolveApiUrl("https://citizenbank.example/", "http://localhost:8000")).toBe("https://citizenbank.example/api");
  });
  it("falls back only when there is no browser origin", () => {
    expect(resolveApiUrl(undefined, "http://localhost:8000")).toBe("http://localhost:8000");
    expect(resolveApiUrl("", "http://localhost:8000")).toBe("http://localhost:8000");
  });
});

describe("hubDestinations: what each demo account is offered", () => {
  const labels = (roles: string[]) => hubDestinations(roles).map((d) => d.label);
  it("customer: no Hub workspace (banking only)", () => expect(labels(["customer"])).toEqual([]));
  it("investor and shareholder: their investments", () => {
    expect(labels(["investor"])).toEqual(["My investments"]);
    expect(labels(["investor", "shareholder"])).toEqual(["My investments"]);
  });
  it("board member: the board portal and their investments", () =>
    expect(labels(["board_member", "investor"])).toEqual(["Board portal", "My investments"]));
  it("staff: the back office only", () => expect(labels(["staff", "back_office"])).toEqual(["Back office"]));
  it("admin: administration and the back office", () =>
    expect(labels(["admin", "super_admin"])).toEqual(["Administration", "Back office"]));
  it("combined: board and investments, no back office or administration", () =>
    expect(labels(["customer", "investor", "shareholder", "board_member"])).toEqual(["Board portal", "My investments"]));
  it("nobody below staff is ever offered the back office or administration", () => {
    for (const roles of [["customer"], ["investor"], ["shareholder"], ["board_member"], ["board_member", "investor"]]) {
      expect(labels(roles)).not.toContain("Back office");
      expect(labels(roles)).not.toContain("Administration");
    }
  });
  it("unknown or no roles open nothing, and paths are real routes", () => {
    expect(labels([])).toEqual([]);
    expect(labels(["wizard"])).toEqual([]);
    expect(hubDestinations(["super_admin"]).map((d) => d.path)).toEqual(["/admin-dashboard", "/back-office-dashboard"]);
  });
});

describe("reasonMessage", () => {
  it("explains the three reasons the banking apps send back", () => {
    for (const r of ["timeout", "sso", "unavailable"]) expect(reasonMessage(r)).toBeTruthy();
  });
  it("shows nothing for anything else, including inherited object keys", () => {
    for (const r of [null, undefined, "", "other", "<script>", "constructor", "__proto__", "toString"]) {
      expect(reasonMessage(r as string | null | undefined)).toBeNull();
    }
  });
});

describe("platform client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.stubGlobal("window", { location: { origin: "https://site.test" } });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    authHeader.mockImplementation(async () => "Bearer test-token");
    resetPlatformConfigCache();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getPlatformConfig caches, so the banner costs one request per page", async () => {
    fetchMock.mockResolvedValue(json({ demo_mode: true }));
    expect(await getPlatformConfig()).toEqual({ demo_mode: true });
    expect(await getPlatformConfig()).toEqual({ demo_mode: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://site.test/api/platform/config");
  });

  it("getPlatformConfig never throws: a failure means not demo", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(await getPlatformConfig()).toEqual({ demo_mode: false });
    resetPlatformConfigCache();
    fetchMock.mockResolvedValue(json({ detail: "boom" }, 500));
    expect(await getPlatformConfig()).toEqual({ demo_mode: false });
  });

  it("getDemoAccounts returns the list, or null when not the demo or on any failure", async () => {
    const body = { accounts: [{ key: "customer", email: "customer@demo.citizenbank.test", roles: ["customer"], description: "d" }], password: "pw" };
    fetchMock.mockResolvedValueOnce(json(body));
    expect(await getDemoAccounts()).toEqual(body);
    fetchMock.mockResolvedValueOnce(json({ detail: "Not found" }, 404));
    expect(await getDemoAccounts()).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await getDemoAccounts()).toBeNull();
  });

  it("public calls send no Authorization header; signed-in calls do", async () => {
    fetchMock.mockResolvedValue(json({ demo_mode: false }));
    await getPlatformConfig();
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("Authorization");
    fetchMock.mockResolvedValue(json({ person_id: "p", display_name: null, email: null, roles: [], demo_mode: true }));
    await getMe();
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer test-token" });
  });

  it("startHandoff posts the audience and path, and returns the address to open", async () => {
    fetchMock.mockResolvedValue(json({ url: "https://banking.test/sso?code=abc&next=/dashboard", expires_in: 60 }));
    expect(await startHandoff("banking", "/dashboard")).toBe("https://banking.test/sso?code=abc&next=/dashboard");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://site.test/api/platform/handoff");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ audience: "banking", next: "/dashboard" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("startHandoff surfaces the server's reason, with its status", async () => {
    fetchMock.mockResolvedValue(json({ detail: "Your account does not include Internet Banking" }, 403));
    await expect(startHandoff("banking")).rejects.toMatchObject({
      message: "Your account does not include Internet Banking", status: 403,
    });
    fetchMock.mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 }));
    const err = await startHandoff("app").catch((e) => e);
    expect(err).toBeInstanceOf(PlatformError);
    expect(err.message).toBe("Request failed (502)");
  });

  it("signed-in calls without a session send no token rather than 'Bearer '", async () => {
    authHeader.mockImplementation(async () => "");
    fetchMock.mockResolvedValue(json({ detail: "Not authenticated" }, 401));
    await getMe().catch(() => undefined);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("Authorization");
  });
});
