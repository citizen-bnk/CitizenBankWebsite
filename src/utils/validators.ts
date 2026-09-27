// Reusable validation helpers for onboarding/profile flows

export const isNonEmpty = (v?: string | null) => Boolean(v && v.trim().length >= 1);

export const isPhone = (v?: string | null) => {
  if (!v) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};

export const isDate = (v?: string | null) => {
  if (!v) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
};

export const canProceedIdentity = (draft: any) =>
  isNonEmpty(draft?.id_type) && isNonEmpty(draft?.id_number) && isNonEmpty(draft?.full_name);

export const canProceedContact = (draft: any) =>
  isPhone(draft?.phone) && isNonEmpty(draft?.street_address) && isNonEmpty(draft?.city) && isNonEmpty(draft?.country);

export const canProceedKyc = (draft: any) =>
  isDate(draft?.date_of_birth) && isNonEmpty(draft?.nationality);

// Lightweight dev-time tests (run manually via testRunner)
export const runValidatorSelfTest = () => {
  const asserts: Array<[string, boolean]> = [
    ["isNonEmpty('a')", isNonEmpty("a")],
    ["!isNonEmpty('')", !isNonEmpty("")],
    ["isPhone('+266 12345678')", isPhone("+266 12345678")],
    ["!isPhone('123')", !isPhone("123")],
    ["isDate('1990-01-01')", isDate("1990-01-01")],
  ];
  let ok = true;
  for (const [name, result] of asserts) {
    if (!result) {
      console.warn(`[validators:selftest] FAIL: ${name}`);
      ok = false;
    }
  }
  if (ok) console.log("[validators:selftest] All checks passed");
  return ok;
};
