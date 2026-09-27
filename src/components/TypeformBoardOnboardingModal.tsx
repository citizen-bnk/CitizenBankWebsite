import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, AlertCircle, FileCheck2 } from "lucide-react";
import { apiClient } from "app";
import {
  GetChecklistData,
  GetMyDocumentStatusData,
  OnboardingStatusResponse,
  UserProfileUpdate,
} from "types";
import { toast } from "sonner";
import { logOnboardingEvent } from "utils/onboardingAnalytics";
import { canProceedContact, canProceedIdentity, canProceedKyc } from "utils/validators";
import { useBoardOnboardingStore } from "utils/boardOnboardingStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  initialStep?: string; // Add missing prop for deep-link step targeting
}

// Minimal validators
// (moved to utils/validators)

export default function TypeformBoardOnboardingModal({ open, onClose, initialStep }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<OnboardingStatusResponse | null>(null);
  const [profileDraft, setProfileDraft] = useState<Partial<UserProfileUpdate>>({});
  const [docChecklist, setDocChecklist] = useState<GetChecklistData | null>(null);
  const [docStatus, setDocStatus] = useState<GetMyDocumentStatusData | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const { setIncomplete } = useBoardOnboardingStore();
  const [showDeferConfirm, setShowDeferConfirm] = useState(false);
  // NEW: Suppress confirmation when closing programmatically (e.g., after confirm defer or finish)
  const [suppressCloseConfirm, setSuppressCloseConfirm] = useState(false);
  // Track pending changes to retry on next step - simplified to just track if we have pending saves
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const steps = useMemo(() => [
    { key: "identity", title: "Identity", description: "Your ID details", required: true },
    { key: "contact", title: "Contact Details", description: "Phone and address", required: true },
    { key: "kyc", title: "KYC Basics", description: "Birth date and nationality", required: true },
    { key: "documents", title: "Required Documents", description: "Upload checklist items", required: true },
  ], []);

  const completion = useMemo(() => status?.completion_percentage ?? 0, [status]);

  useEffect(() => {
    if (!open) return;
    const init = async () => {
      try {
        setLoading(true);
        // Prefill user profile
        const profRes = await apiClient.get_user_profile();
        const prof = await profRes.json();
        setProfileDraft({
          full_name: prof.full_name || undefined,
          phone: prof.phone || undefined,
          street_address: prof.street_address || undefined,
          city: prof.city || undefined,
          state_province: prof.state_province || undefined,
          postal_code: prof.postal_code || undefined,
          country: prof.country || "Lesotho",
          date_of_birth: prof.date_of_birth || undefined,
          nationality: prof.nationality || "Lesotho",
          id_type: prof.id_type || undefined,
          id_number: prof.id_number || undefined,
          employer: prof.employer || undefined,
          occupation: prof.occupation || undefined,
        });

        // Load status + checklist
        const [stRes, clRes, dsRes] = await Promise.all([
          apiClient.get_onboarding_status(),
          apiClient.get_checklist({}),
          apiClient.get_my_document_status(),
        ]);
        setStatus(await stRes.json());
        setDocChecklist(await clRes.json());
        setDocStatus(await dsRes.json());

        // Apply initialStep if provided
        if (initialStep) {
          const stepIndex = steps.findIndex(s => s.key === initialStep);
          if (stepIndex >= 0) {
            setCurrentStep(stepIndex);
            console.log(`[deep-link] Jumped to step: ${initialStep} (index ${stepIndex})`);
          }
        }

        // Log modal opened
        await logOnboardingEvent("modal_opened", steps[currentStep]?.key);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [open]);

  // Reset suppression flag when fully closed
  useEffect(() => {
    if (!open) {
      // Allow future close attempts to show confirm again
      setSuppressCloseConfirm(false);
    }
  }, [open]);

  // Log step viewed on change
  useEffect(() => {
    if (!open) return;
    const key = steps[currentStep]?.key;
    if (key) {
      logOnboardingEvent("step_viewed", key);
    }
  }, [currentStep, open, steps]);

  // Update draft without saving (for manual save on Next/Finish)
  const updateDraft = (partial: Partial<UserProfileUpdate>) => {
    setProfileDraft(prev => ({ ...prev, ...partial }));
    setHasPendingChanges(true);
  };

  // Manual save function (called on Next/Finish)
  const saveDraft = async (data: Partial<UserProfileUpdate>, retryCount = 0) => {
    const merged = { ...profileDraft, ...data };
    setProfileDraft(merged);
    setHasPendingChanges(true);
    setSaving(true);
    try {
      await apiClient.update_user_profile(merged);
      await logOnboardingEvent("autosave_success", steps[currentStep]?.key);
      // Clear pending on success
      setHasPendingChanges(false);
      
      // ✅ PERFORMANCE FIX: Don't refresh status after every field update
      // Status will be refreshed when moving to next step or finishing
      // This prevents 20+ second delays on every keystroke
    } catch (e: any) {
      console.error("Failed to save profile:", e);
      // Retry logic: max 2 retries with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 500; // 500ms, 1000ms
        console.log(`Retrying save in ${delay}ms (attempt ${retryCount + 1})`);
        setTimeout(() => saveDraft(data, retryCount + 1), delay);
      } else {
        // Final failure - keep pending changes for next step retry
        toast.error("Auto-save temporarily unavailable. Changes will retry on next step.", { duration: 3000 });
        await logOnboardingEvent("autosave_error", steps[currentStep]?.key, { error: String(e?.message || e) });
      }
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    // Save any pending changes before moving to next step
    if (hasPendingChanges) {
      console.log("Saving changes before next step");
      setSaving(true);
      try {
        await saveDraft(profileDraft, 0);
      } catch (e) {
        console.error("Failed to save before next:", e);
        toast.error("Failed to save changes. Please try again.");
        setSaving(false);
        return; // Don't proceed if save fails
      }
      setSaving(false);
    }
    if (currentStep < steps.length - 1) {
      await logOnboardingEvent("step_next", steps[currentStep]?.key);
      setCurrentStep(s => s + 1);
    }
  };

  const prev = async () => {
    await logOnboardingEvent("step_prev", steps[currentStep]?.key);
    setCurrentStep(s => Math.max(0, s - 1));
  };

  const handleUpload = async (requirementId: number, file: File) => {
    setUploadingId(requirementId);
    try {
      await apiClient.upload_document({ requirement_id: requirementId }, { file });
      toast.success("Document uploaded");
      await logOnboardingEvent("upload_success", "documents", { requirement_id: requirementId });
      // Refresh checklist/status
      const [clRes, stRes] = await Promise.all([
        apiClient.get_checklist({}),
        apiClient.get_my_document_status(),
      ]);
      setDocChecklist(await clRes.json());
      setDocStatus(await stRes.json());
    } catch (e: any) {
      console.error(e);
      await logOnboardingEvent("upload_error", "documents", { requirement_id: requirementId, error: String(e?.message || e) });
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingId(null);
    }
  };

  const finish = async () => {
    try {
      const res = await apiClient.get_onboarding_status();
      const data = await res.json();
      setStatus(data);
      if (data.overall_complete) {
        await logOnboardingEvent("flow_completed", steps[currentStep]?.key);
        setIncomplete(false);
        // Programmatic close - suppress confirm once
        setSuppressCloseConfirm(true);
        onClose();
      } else {
        toast.info("You're almost there. Please complete all steps.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmDefer = async () => {
    try {
      await logOnboardingEvent("defer_confirmed", steps[currentStep]?.key);
    } catch {}
    setShowDeferConfirm(false);
    // Programmatic close - suppress confirm once
    setSuppressCloseConfirm(true);
    onClose();
    toast.info("We’ll remind you next time you sign in.");
  };

  const openDeferConfirm = async () => {
    try { await logOnboardingEvent("defer_prompt_shown", steps[currentStep]?.key); } catch {}
    setShowDeferConfirm(true);
  };

  const cancelDefer = async () => {
    try { await logOnboardingEvent("defer_cancelled", steps[currentStep]?.key); } catch {}
    setShowDeferConfirm(false);
  };

  // Derived validity flags
  const canIdentity = canProceedIdentity(profileDraft);
  const canContact = canProceedContact(profileDraft);
  const canKyc = canProceedKyc(profileDraft);

  const allDocsComplete = useMemo(() => {
    if (!docChecklist) return false;
    return (docChecklist.items || []).every(i => !i.is_required || i.is_complete);
  }, [docChecklist]);

  const finishIfComplete = async () => {
    // Save any pending changes before finishing
    if (hasPendingChanges) {
      console.log("Saving changes before finish");
      setSaving(true);
      try {
        await saveDraft(profileDraft, 0);
      } catch (e) {
        console.error("Failed to save before finish:", e);
        toast.error("Failed to save changes. Please try again.");
        setSaving(false);
        return; // Don't proceed if save fails
      }
      setSaving(false);
    }
    
    try {
      const onbRes = await apiClient.get_onboarding_status();
      const s = await onbRes.json();
      setStatus(s);
      if (s.overall_complete) {
        toast.success("Onboarding complete. Welcome!");
        setIncomplete(false);
        // Programmatic close - suppress confirm once
        setSuppressCloseConfirm(true);
        onClose();
      } else {
        toast.warning("Almost there! Please finish remaining steps.");
      }
    } catch (e) {
      // Even if status check fails, do not force-close without confirmation
      onClose();
    }
  };

  const stepPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Only show defer confirmation when user attempts to close interactively */}
      <Dialog open={open} onOpenChange={(v) => { 
        // If user tries to close (v=false) and we are NOT suppressing, show confirmation instead of closing
        if (!v) {
          if (suppressCloseConfirm) {
            // One-time suppression when closing programmatically
            setSuppressCloseConfirm(false);
            return; // allow parent-controlled close without showing confirm
          }
          openDeferConfirm();
        }
      }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <div className="bg-card">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Board Onboarding</h2>
                  <p className="text-sm text-muted-foreground">A few quick steps to get you started</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">{Math.round(completion)}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </div>
              <Progress value={Math.max(completion, stepPercent)} className="mt-4" />
            </div>

            <div className="p-6">
              {loading ? (
                <div className="py-16 text-center text-muted-foreground">Loading…</div>
              ) : (
                <>
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Identity</CardTitle>
                          <CardDescription>We need your legal name and ID</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>ID Type</Label>
                            <Input
                              placeholder="e.g., National ID, Passport"
                              value={(profileDraft.id_type as string) || ""}
                              onChange={(e) => updateDraft({ id_type: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>ID Number</Label>
                            <Input
                              placeholder="Enter your ID number"
                              value={(profileDraft.id_number as string) || ""}
                              onChange={(e) => updateDraft({ id_number: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Full Name</Label>
                            <Input
                              placeholder="Enter your full legal name"
                              value={(profileDraft.full_name as string) || ""}
                              onChange={(e) => updateDraft({ full_name: e.target.value })}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      {!canIdentity && (
                        <Alert>
                          <AlertDescription>
                            Please fill in ID type, ID number and full name to continue.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Contact Details</CardTitle>
                          <CardDescription>How can we reach you?</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Phone</Label>
                            <Input
                              placeholder="e.g., +266 5xxxxxxx"
                              value={(profileDraft.phone as string) || ""}
                              onChange={(e) => updateDraft({ phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Street Address</Label>
                            <Input
                              placeholder="Street and number"
                              value={(profileDraft.street_address as string) || ""}
                              onChange={(e) => updateDraft({ street_address: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>City/Town</Label>
                            <Input
                              value={(profileDraft.city as string) || ""}
                              onChange={(e) => updateDraft({ city: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Postal Code</Label>
                            <Input
                              value={(profileDraft.postal_code as string) || ""}
                              onChange={(e) => updateDraft({ postal_code: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Country</Label>
                            <Input
                              value={(profileDraft.country as string) || "Lesotho"}
                              onChange={(e) => updateDraft({ country: e.target.value })}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      {!canContact && (
                        <Alert>
                          <AlertDescription>
                            Please provide a valid phone number, address, city and country.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>KYC Basics</CardTitle>
                          <CardDescription>Regulatory information</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Date of Birth</Label>
                            <Input
                              type="date"
                              value={(profileDraft.date_of_birth as string) || ""}
                              onChange={(e) => updateDraft({ date_of_birth: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>Nationality</Label>
                            <Input
                              value={(profileDraft.nationality as string) || "Lesotho"}
                              onChange={(e) => updateDraft({ nationality: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Occupation</Label>
                            <Input
                              value={(profileDraft.occupation as string) || ""}
                              onChange={(e) => updateDraft({ occupation: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label>Employer</Label>
                            <Input
                              value={(profileDraft.employer as string) || ""}
                              onChange={(e) => updateDraft({ employer: e.target.value })}
                            />
                          </div>
                        </CardContent>
                      </Card>
                      {!canKyc && (
                        <Alert>
                          <AlertDescription>
                            Please provide your date of birth and nationality.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Required Documents</CardTitle>
                          <CardDescription>Upload each required item below</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {!docChecklist ? (
                            <div className="text-sm text-muted-foreground">No checklist available.</div>
                          ) : (
                            <div className="space-y-3">
                              {docChecklist.items.map((item) => {
                                const req = item.requirement;
                                const st = item.submission;
                                const statusLabel = item.is_complete
                                  ? "Complete"
                                  : st?.status === "rejected"
                                  ? "Rejected"
                                  : st?.status === "submitted"
                                  ? "Under review"
                                  : "Not submitted";
                                const statusColor = item.is_complete
                                  ? "bg-green-100 text-green-700"
                                  : st?.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : st?.status === "submitted"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700";
                                return (
                                  <div key={req.id} className="border rounded-md p-3 flex items-center justify-between gap-3">
                                    <div>
                                      <div className="font-medium">{req.name}</div>
                                      {req.description && (
                                        <div className="text-sm text-muted-foreground">{req.description}</div>
                                      )}
                                      <div className="mt-1">
                                        <Badge className={statusColor}>{statusLabel}</Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <label className="inline-flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="file"
                                          className="hidden"
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleUpload(req.id!, f);
                                          }}
                                          disabled={uploadingId === req.id || item.is_complete}
                                        />
                                        <Button variant="outline" disabled={uploadingId === req.id || item.is_complete}>
                                          <Upload className="w-4 h-4 mr-2" />
                                          {uploadingId === req.id ? "Uploading…" : item.is_complete ? "Uploaded" : "Upload"}
                                        </Button>
                                      </label>
                                      {item.is_complete && <FileCheck2 className="w-5 h-5 text-green-600" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      {allDocsComplete ? (
                        <Alert className="bg-green-50 border-green-200">
                          <AlertDescription>
                            All required documents have been submitted. You can finish onboarding now.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert>
                          <AlertDescription>
                            Please upload all required documents to proceed.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t flex items-center justify-between bg-muted/30">
              <div className="text-xs text-muted-foreground">
                {saving ? "Saving…" : hasPendingChanges ? "Retrying…" : "Auto-saved"}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={openDeferConfirm}>Complete later</Button>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={prev} disabled={currentStep === 0 || saving}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  {currentStep < steps.length - 1 && (
                    <Button
                      onClick={next}
                      disabled={
                        saving || 
                        (currentStep === 0 && !canIdentity) || 
                        (currentStep === 1 && !canContact) || 
                        (currentStep === 2 && !canKyc)
                      }
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {saving ? 'Processing...' : 'Next'} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  {currentStep === steps.length - 1 && (
                    <Button onClick={finishIfComplete} disabled={saving} className="bg-green-600 hover:bg-green-700">
                      Finish <CheckCircle2 className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Defer confirmation dialog */}
      <AlertDialog open={showDeferConfirm} onOpenChange={(v) => setShowDeferConfirm(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish your onboarding to unlock Board Portal access</AlertDialogTitle>
            <AlertDialogDescription>
              We use your information to meet banking license and regulatory requirements (KYC/AML) and to verify your board appointment. Completing now ensures:
              - Secure access to the Board Portal and documents
              - Compliance with governance and regulatory standards
              - Faster approval of your Class C investment benefits
              It takes about 3–5 minutes. Would you like to continue now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDefer}>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDefer} className="bg-gray-900 hover:bg-gray-800">
              Complete later (remind me next sign-in)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
