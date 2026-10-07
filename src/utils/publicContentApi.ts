import { API_URL } from "app";
import type { Policies, PublicAdvert, PublicNewsletter, PublicTimelineItem } from "utils/publicContent";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw Object.assign(new Error(`Request failed (${res.status})`), { status: res.status });
  return (await res.json()) as T;
}

export const newsletterFileUrl = (id: number, download = false): string =>
  `${API_URL}/newsletters/${id}/file${download ? "?download=1" : ""}`;

export const listNewsletters = () => getJson<PublicNewsletter[]>("/newsletters");
export const listAdverts = () => getJson<PublicAdvert[]>("/careers/adverts");
export const getAdvert = (slug: string) => getJson<PublicAdvert>(`/careers/adverts/${encodeURIComponent(slug)}`);
export const listProgressTimeline = () => getJson<PublicTimelineItem[]>("/progress-timeline/public");

/**
 * Public policy settings (GET /api/policy). Returns null when the endpoint does not exist yet or is down, so every
 * caller falls back to its built-in default.
 */
export async function loadPublicPolicies(): Promise<Policies | null> {
  try {
    const body = await getJson<{ policies?: Policies }>("/policy");
    return body && typeof body.policies === "object" && body.policies ? body.policies : null;
  } catch {
    return null;
  }
}
