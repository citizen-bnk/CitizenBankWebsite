import { describe, expect, it } from "vitest";
import {
  LICENCE_STATUS_DEFAULT, applyInfo, closingLabel, formatBytes, formatDate, hasApplyInfo, issueDateLabel,
  issueLabel, licenceStatus, safeExternalUrl, sortTimeline, timelineStatusLabel,
} from "utils/publicContent";

describe("licenceStatus", () => {
  it("falls back to the built-in sentence when the policy is missing or blank", () => {
    expect(licenceStatus(null)).toBe(LICENCE_STATUS_DEFAULT);
    expect(licenceStatus({})).toBe(LICENCE_STATUS_DEFAULT);
    expect(licenceStatus({ "legal.licence_status": "  " })).toBe(LICENCE_STATUS_DEFAULT);
    expect(licenceStatus({ "legal.licence_status": 7 })).toBe(LICENCE_STATUS_DEFAULT);
  });
  it("uses the policy value when present", () => {
    expect(licenceStatus({ "legal.licence_status": "Applicant only." })).toBe("Applicant only.");
  });
  it("says applicant and never licensed", () => {
    expect(LICENCE_STATUS_DEFAULT).toMatch(/applicant for a Central Bank of Lesotho banking licence/);
    expect(LICENCE_STATUS_DEFAULT).toMatch(/does not currently carry on banking business/);
  });
});

describe("applyInfo", () => {
  it("is empty (so the page hides the block) when the policy values are null", () => {
    const info = applyInfo({ "careers.apply_email": null, "careers.apply_instructions": null });
    expect(info).toEqual({ instructions: null, email: null });
    expect(hasApplyInfo(info)).toBe(false);
    expect(hasApplyInfo(applyInfo(null))).toBe(false);
  });
  it("accepts confirmed values and rejects a malformed address", () => {
    expect(applyInfo({ "careers.apply_email": "jobs@example.test" }).email).toBe("jobs@example.test");
    expect(applyInfo({ "careers.apply_email": "not an email" }).email).toBeNull();
    expect(applyInfo({ "careers.apply_instructions": " Email your CV. " }).instructions).toBe("Email your CV.");
    expect(hasApplyInfo(applyInfo(null), "Apply in writing")).toBe(true);
  });
});

describe("dates and sizes", () => {
  it("formats ISO dates without time-zone drift", () => {
    expect(formatDate("2026-02-10")).toBe("10 February 2026");
    expect(formatDate("2026-12-31T23:59:00+00:00")).toBe("31 December 2026");
    expect(formatDate("soon")).toBe("soon");
    expect(formatDate(null)).toBe("");
  });
  it("labels issues and closing dates", () => {
    expect(issueDateLabel({ published_on: "2026-03-22", period_label: "March 2026" })).toBe("22 March 2026");
    expect(issueDateLabel({ published_on: null, period_label: "August 2026" })).toBe("August 2026");
    expect(issueLabel({ series: "Quarterly Review", issue_no: 4 })).toBe("Quarterly Review · Issue 4");
    expect(issueLabel({ series: null, issue_no: null })).toBe("");
    expect(closingLabel("2026-10-15")).toBe("Closes 15 October 2026");
    expect(closingLabel(null)).toBeNull();
  });
  it("formats file sizes", () => {
    expect(formatBytes(null)).toBe("");
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(1_017_105)).toBe("993 KB");
    expect(formatBytes(4_508_789)).toBe("4.3 MB");
    expect(formatBytes(150_000)).toBe("146 KB");
  });
});

describe("links and timeline", () => {
  it("only trusts http(s) links", () => {
    expect(safeExternalUrl("https://drive.example.test/x")).toBe("https://drive.example.test/x");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });
  it("orders the timeline oldest first and labels statuses", () => {
    const items = [
      { id: 3, display_order: 20, achievement_date: "2026-09-25" },
      { id: 1, display_order: 10, achievement_date: "2026-09-25" },
      { id: 2, display_order: 20, achievement_date: "2026-09-24" },
    ];
    expect(sortTimeline(items).map((i) => i.id)).toEqual([1, 2, 3]);
    expect(timelineStatusLabel("in_progress")).toBe("In progress");
    expect(timelineStatusLabel("completed")).toBe("Completed");
    expect(timelineStatusLabel("anything")).toBe("Planned");
  });
});
