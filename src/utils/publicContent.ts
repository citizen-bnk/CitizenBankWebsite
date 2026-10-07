/**
 * Helpers for the public newsletters, careers and progress-timeline pages. Pure functions only (no imports from
 * "app"), so they can be unit tested; the fetching code is in publicContentApi.ts.
 */

/** Shown when GET /api/policy is unavailable. Same text as the `legal.licence_status` policy default. */
export const LICENCE_STATUS_DEFAULT =
  "Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not currently carry on banking business.";

export interface PublicNewsletter {
  id: number;
  slug: string;
  issue_no: number | null;
  series: string | null;
  title: string;
  published_on: string | null;
  period_label: string | null;
  summary: string | null;
  sections: { heading?: string; points?: string[] }[];
  has_file: boolean;
  file_bytes: number | null;
  external_url: string | null;
}

export interface PublicAdvert {
  id: number;
  slug: string;
  title: string;
  department: string | null;
  employment_type: string | null;
  location: string | null;
  summary: string | null;
  responsibilities: string[];
  requirements: string[];
  how_to_apply: string | null;
  closing_date: string | null;
}

export interface PublicTimelineItem {
  id: number;
  title: string;
  short_story: string;
  achievement_date: string;
  image_url: string | null;
  status: string;
  display_order: number;
}

export type Policies = Record<string, unknown>;

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The licence-status sentence from the policy, or the built-in default. */
export function licenceStatus(policies: Policies | null | undefined): string {
  return text(policies?.["legal.licence_status"]) ?? LICENCE_STATUS_DEFAULT;
}

export interface ApplyInfo {
  instructions: string | null;
  email: string | null;
}

/** Apply details from the policy. Both are null (and the page hides the block) until the owner confirms them. */
export function applyInfo(policies: Policies | null | undefined): ApplyInfo {
  const email = text(policies?.["careers.apply_email"]);
  return {
    instructions: text(policies?.["careers.apply_instructions"]),
    email: email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null,
  };
}

export function hasApplyInfo(info: ApplyInfo, advertHowToApply?: string | null): boolean {
  return Boolean(info.instructions || info.email || text(advertHowToApply));
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-02-10" -> "10 February 2026" without time-zone drift. Falls back to the input when it is not a date. */
export function formatDate(value: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!m) return value ?? "";
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : (value ?? "");
}

/** The date line of an issue: its date when known, otherwise the period label. */
export function issueDateLabel(n: Pick<PublicNewsletter, "published_on" | "period_label">): string {
  return n.published_on ? formatDate(n.published_on) : (n.period_label ?? "");
}

export function issueLabel(n: Pick<PublicNewsletter, "issue_no" | "series">): string {
  return [n.series, n.issue_no != null ? `Issue ${n.issue_no}` : null].filter(Boolean).join(" · ");
}

export function closingLabel(closingDate: string | null | undefined): string | null {
  return closingDate ? `Closes ${formatDate(closingDate)}` : null;
}

/** Only absolute http(s) links are used for external issue links. */
export function safeExternalUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export const TIMELINE_STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  in_progress: "In progress",
  upcoming: "Planned",
};

export function timelineStatusLabel(status: string): string {
  return TIMELINE_STATUS_LABEL[status] ?? "Planned";
}

/** Items ordered as the timeline shows them: display_order, then date, then id (oldest first, newest last). */
export function sortTimeline<T extends Pick<PublicTimelineItem, "display_order" | "achievement_date" | "id">>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => a.display_order - b.display_order || a.achievement_date.localeCompare(b.achievement_date) || a.id - b.id,
  );
}
