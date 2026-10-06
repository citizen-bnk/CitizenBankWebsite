/**
 * The API is served from the same origin as the page (see apiclient/index.ts), so in a browser that is the base.
 * The build-time value is `http://localhost:8000`, which only works on a developer's machine: code that used it
 * directly (document downloads, uploads, recording a payment) failed in production.
 */
export function resolveApiUrl(origin: string | undefined, fallback: string): string {
  return origin ? `${origin.replace(/\/+$/, "")}/api` : fallback;
}
