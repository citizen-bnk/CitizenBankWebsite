export const FEATURES = {
  // Toggle analytics logging for onboarding. If false, calls become no-ops.
  onboardingAnalytics: true,
  // Run self-tests in dev automatically on app load
  devRunApiSelfTests: true,
  // Optional: in DEV only, attempt a tiny test upload to verify the upload_document endpoint.
  // Keep this false unless you explicitly want to create a test submission.
  devTestUploadDocument: false,
} as const;
