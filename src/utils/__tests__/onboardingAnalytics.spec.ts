import { describe, it, expect, vi } from "vitest";

vi.mock("utils/features", () => ({
  FEATURES: { onboardingAnalytics: true, devRunApiSelfTests: false, devTestUploadDocument: false },
}));

const logFn = vi.fn(() => ({ json: async () => ({ success: true }) }));
vi.mock("brain", () => ({
  default: { log_onboarding_event: logFn },
}));

import { logOnboardingEvent } from "utils/onboardingAnalytics";

describe("onboardingAnalytics", () => {
  it("calls backend when enabled", async () => {
    await logOnboardingEvent("step_viewed", "identity", { a: 1 });
    expect(logFn).toHaveBeenCalledWith({ event_name: "step_viewed", step_key: "identity", extra: { a: 1 } });
  });
});
