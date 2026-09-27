import brain from "brain";
import { FEATURES } from "utils/features";

export type OnboardingEventName =
  | "modal_opened"
  | "step_viewed"
  | "step_next"
  | "step_prev"
  | "autosave_success"
  | "autosave_error"
  | "upload_success"
  | "upload_error"
  | "flow_completed";

export async function logOnboardingEvent(event_name: OnboardingEventName, step_key?: string, extra?: Record<string, any>) {
  if (!FEATURES.onboardingAnalytics) return;
  try {
    // The client method name mirrors the backend handler function name
    // i.e., log_onboarding_event
    await (brain as any).log_onboarding_event({ event_name, step_key, extra });
  } catch (e) {
    // Silent fail to avoid impacting UX
    console.debug("[onboarding-analytics] log failed", e);
  }
}
