/**
 * Public, data-driven settings (legal wording and contact lines).
 *
 * Public pages and the footer read legal text and contact details ONLY from here. The values come from
 * GET /api/policy (anonymous callers receive the audience="public" keys). DEFAULT_POLICY is what renders when the
 * endpoint is unreachable, so the licence-status sentence is always present. Contact details default to null and
 * a null line is hidden: never put a placeholder phone number or address in a page.
 */
import { useEffect, useState } from "react";

export const CONTACT_KEYS = [
  "email",
  "support_email",
  "privacy_email",
  "legal_email",
  "security_email",
  "phone",
  "address",
] as const;
export type ContactKey = (typeof CONTACT_KEYS)[number];

export type PublicPolicy = {
  legal: {
    licence_status: string;
    footer: string;
    company_name: string;
    registration_number: string;
  };
  brand: { name: string };
  contact: Record<ContactKey, string | null>;
};

export const LICENCE_STATUS_SENTENCE =
  "Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence and does not currently carry on banking business.";

export const DEFAULT_POLICY: PublicPolicy = {
  legal: {
    licence_status: LICENCE_STATUS_SENTENCE,
    footer: "Citizen Digital Ltd, applicant for a Central Bank of Lesotho banking licence.",
    company_name: "Citizen Digital Ltd",
    registration_number: "99073",
  },
  brand: { name: "Citizen Bank" },
  contact: {
    email: null,
    support_email: null,
    privacy_email: null,
    legal_email: null,
    security_email: null,
    phone: null,
    address: null,
  },
};

const clean = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Merges the `policies` map of a /api/policy response over the defaults. Flat keys ("legal.footer") are expected.
 * Unknown keys, wrong types and empty strings are ignored; legal/brand values can never become empty.
 */
export function mergePolicy(raw: unknown): PublicPolicy {
  const policies =
    raw && typeof raw === "object" && "policies" in raw && (raw as { policies: unknown }).policies &&
    typeof (raw as { policies: unknown }).policies === "object"
      ? ((raw as { policies: Record<string, unknown> }).policies)
      : {};
  const out: PublicPolicy = {
    legal: { ...DEFAULT_POLICY.legal },
    brand: { ...DEFAULT_POLICY.brand },
    contact: { ...DEFAULT_POLICY.contact },
  };
  for (const k of Object.keys(out.legal) as (keyof PublicPolicy["legal"])[]) {
    const v = clean(policies[`legal.${k}`]);
    if (v) out.legal[k] = v;
  }
  const name = clean(policies["brand.name"]);
  if (name) out.brand.name = name;
  for (const k of CONTACT_KEYS) out.contact[k] = clean(policies[`contact.${k}`]);
  return out;
}

/** Contact entries that have a value, in the order requested. Null/empty ones are dropped (hidden on the page). */
export function visibleContact(
  policy: PublicPolicy,
  keys: readonly ContactKey[] = CONTACT_KEYS,
): { key: ContactKey; value: string }[] {
  return keys.flatMap((key) => {
    const value = policy.contact[key];
    return value ? [{ key, value }] : [];
  });
}

export const hasContact = (policy: PublicPolicy, keys: readonly ContactKey[]) => visibleContact(policy, keys).length > 0;

/** The first available address of the given kinds, or null (e.g. privacyEmail: privacy_email, then email). */
export function firstContact(policy: PublicPolicy, keys: readonly ContactKey[]): string | null {
  return visibleContact(policy, keys)[0]?.value ?? null;
}

/** "© 2026 Citizen Digital Ltd (Reg. 99073)". The year is computed, never hard-coded. */
export function copyrightLine(policy: PublicPolicy, year: number = new Date().getFullYear()): string {
  const { company_name, registration_number } = policy.legal;
  return `© ${year} ${company_name} (Reg. ${registration_number}). All rights reserved.`;
}

let cached: PublicPolicy | undefined;
let inflight: Promise<PublicPolicy> | undefined;

/** Fetches the policy once per page life. Never rejects: any failure resolves to the defaults. */
export function loadPolicy(fetchImpl: typeof fetch = fetch): Promise<PublicPolicy> {
  if (cached) return Promise.resolve(cached);
  inflight ??= (async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const res = await fetchImpl(`${origin}/api/policy`, { headers: { Accept: "application/json" }, credentials: "include" });
      if (!res.ok) return DEFAULT_POLICY;
      const merged = mergePolicy(await res.json());
      cached = merged;
      return merged;
    } catch {
      return DEFAULT_POLICY;
    } finally {
      inflight = undefined;
    }
  })();
  return inflight;
}

export function resetPolicyCache() {
  cached = undefined;
  inflight = undefined;
}

/** The policy for rendering. Starts on the defaults and updates when the endpoint answers. Never throws. */
export function usePolicy(): PublicPolicy {
  const [policy, setPolicy] = useState<PublicPolicy>(cached ?? DEFAULT_POLICY);
  useEffect(() => {
    let live = true;
    loadPolicy().then((p) => live && setPolicy(p));
    return () => {
      live = false;
    };
  }, []);
  return policy;
}
