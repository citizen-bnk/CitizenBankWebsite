import { mode, Mode } from "app";
import brain from "brain";
import { runValidatorSelfTest, canProceedIdentity, canProceedContact, canProceedKyc } from "utils/validators";
import { FEATURES } from "utils/features";

export async function runBoardOnboardingTests() {
  if (mode !== Mode.DEV || !FEATURES.devRunApiSelfTests) return; // only run in dev when enabled
  try {
    console.log("[tests] Running board onboarding lightweight tests...");
    runValidatorSelfTest();

    // Extra unit tests for step validators
    try {
      const identityGood = canProceedIdentity({ id_type: "ID", id_number: "123", full_name: "A" });
      const identityBad = canProceedIdentity({ id_type: "", id_number: "", full_name: "" });
      const contactGood = canProceedContact({ phone: "+266 51234567", street_address: "1 Street", city: "Maseru", country: "Lesotho" });
      const contactBad = canProceedContact({ phone: "123", street_address: "", city: "", country: "" });
      const kycGood = canProceedKyc({ date_of_birth: "1990-01-01", nationality: "Lesotho" });
      const kycBad = canProceedKyc({ date_of_birth: "", nationality: "" });
      console.log("[tests] validators: ", { identityGood, identityBad, contactGood, contactBad, kycGood, kycBad });
    } catch (e) {
      console.warn("[tests] validator unit checks failed", e);
    }

    // API contract smoke test for onboarding status
    try {
      const res = await (brain as any).get_onboarding_status();
      const data = await res.json();
      const hasFields =
        typeof data?.overall_complete === "boolean" &&
        typeof data?.completion_percentage === "number" &&
        Array.isArray(data?.steps);
      if (!hasFields) {
        console.warn("[tests] onboarding_status shape unexpected", data);
      } else {
        console.log("[tests] onboarding_status OK", {
          overall: data.overall_complete,
          pct: data.completion_percentage,
          steps: data.steps?.length,
        });
      }
    } catch (e) {
      console.warn("[tests] get_onboarding_status failed (likely no role)", e);
    }

    // Analytics endpoint existence (no-op allowed)
    if (FEATURES.onboardingAnalytics) {
      try {
        const res = await (brain as any).log_onboarding_event({ event_name: "step_viewed", step_key: "selftest" });
        const json = await res.json();
        console.log("[tests] analytics/log_onboarding_event response", json);
      } catch (e) {
        console.warn("[tests] analytics/log_onboarding_event not reachable", e);
      }
    }

    // Document API shape (non-invasive)
    let firstReqId: number | undefined;
    try {
      const clRes = await (brain as any).get_checklist({});
      const cl = await clRes.json();
      firstReqId = cl?.items?.[0]?.requirement?.id;
      if (firstReqId) {
        console.log("[tests] checklist OK; sample requirement_id:", firstReqId);
        // Do not auto-upload by default; just assert method signature exists
        const hasUpload = typeof (brain as any).upload_document === "function";
        if (!hasUpload) {
          console.warn("[tests] upload_document method missing on brain client");
        } else {
          console.log("[tests] upload_document method present (skipping actual upload)");
        }
      } else {
        console.warn("[tests] checklist empty or unexpected shape", cl);
      }
    } catch (e) {
      console.warn("[tests] get_checklist failed (likely missing access)", e);
    }

    // Optional: perform a tiny real upload in DEV when enabled
    if (FEATURES.devTestUploadDocument && firstReqId) {
      try {
        const content = new Blob(["test"], { type: "text/plain" });
        const file = new File([content], "dev-selftest.txt", { type: "text/plain" });
        await (brain as any).upload_document({ requirement_id: firstReqId }, { file });
        console.log("[tests] dev test upload_document completed");
      } catch (e) {
        console.warn("[tests] dev test upload_document failed", e);
      }
    }

    // Update profile method presence (no-op)
    const hasUpdate = typeof (brain as any).update_user_profile === "function";
    console.log("[tests] update_user_profile method", hasUpdate ? "present" : "missing");
  } catch (e) {
    console.warn("[tests] Unexpected error in test runner", e);
  }
}
