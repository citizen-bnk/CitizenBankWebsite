import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { BackOfficeNav } from "components/BackOfficeNav";
import { SubscriberInfoStep } from "components/SubscriberInfoStep";
import { ShareSelectionStep } from "components/ShareSelectionStep";
import { PaymentOptionsStep } from "components/PaymentOptionsStep";
import { ReviewStep } from "components/ReviewStep";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "app";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = "subscriber" | "shares" | "payment" | "review";
type PaymentMethod = "bank_transfer" | "crypto" | "installment";

interface ShareClass {
  class_name: string;
  price_per_share: number;
}

export default function BackOfficeSubscribeOnBehalf() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>("subscriber");
  const [loadingUser, setLoadingUser] = useState(false);
  
  // Check if coming from AdminUsers (has userId param)
  const userId = searchParams.get('userId');
  const fromAdminUsers = userId !== null;

  // Subscriber info
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [emailCheckStatus, setEmailCheckStatus] = useState<"unchecked" | "checking" | "exists" | "new">("unchecked");
  const [existingUserInfo, setExistingUserInfo] = useState<{ name: string; userId: string } | null>(null);

  // Share details
  const [shareClass, setShareClass] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [payLater, setPayLater] = useState(false);
  const [installmentPlan, setInstallmentPlan] = useState<string | null>(null);
  const [cryptoWalletId, setCryptoWalletId] = useState<string | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch complete user profile when userId is provided
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      
      try {
        setLoadingUser(true);
        console.log('🔍 Fetching user profile for userId:', userId);
        
        const response = await apiClient.get_user_profile_by_id({ userId });
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        
        const userData = await response.json();
        console.log('✅ User profile fetched:', userData);
        
        // Auto-populate all available fields
        if (userData.email) setEmail(userData.email);
        if (userData.full_name) setName(userData.full_name);
        if (userData.id_number) setIdNumber(userData.id_number);
        if (userData.phone) setPhone(userData.phone);
        
        // Set user as existing
        setEmailCheckStatus('exists');
        setExistingUserInfo({ 
          name: userData.full_name || userData.email, 
          userId: userData.user_id 
        });
        
        toast.success(`User profile loaded: ${userData.full_name || userData.email}`);
      } catch (error) {
        console.error('❌ Failed to fetch user profile:', error);
        toast.error('Failed to load user profile');
      } finally {
        setLoadingUser(false);
      }
    };
    
    fetchUserProfile();
  }, [userId]);

  // Check email when it changes (skip if locked from AdminUsers)
  useEffect(() => {
    // Skip auto-check if email was pre-filled from AdminUsers
    if (fromAdminUsers) return;
    
    if (email && email.includes("@")) {
      checkEmail();
    } else {
      setEmailCheckStatus("unchecked");
      setExistingUserInfo(null);
    }
  }, [email, fromAdminUsers]);

  const checkEmail = async () => {
    try {
      setEmailCheckStatus("checking");
      const response = await apiClient.search_users({ email });
      const data = await response.json();
      
      if (data.users && data.users.length > 0) {
        const user = data.users[0];
        setEmailCheckStatus("exists");
        setExistingUserInfo({ name: user.full_name || user.email, userId: user.user_id });
        // Pre-fill data if user exists
        if (user.full_name) setName(user.full_name);
        if (user.id_number) setIdNumber(user.id_number);
        if (user.contact_number) setPhone(user.contact_number);
      } else {
        setEmailCheckStatus("new");
        setExistingUserInfo(null);
      }
    } catch (error) {
      console.error("Failed to check email:", error);
      setEmailCheckStatus("unchecked");
    }
  };

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === "subscriber") {
      if (!email || !email.includes("@")) {
        newErrors.email = "Valid email is required";
      }
    }

    if (step === "shares") {
      if (!shareClass) {
        newErrors.shareClass = "Share class is required";
      }
      if (quantity < 1) {
        newErrors.quantity = "Quantity must be at least 1";
      }
    }

    if (step === "payment") {
      if (paymentMethod === "installment" && !installmentPlan) {
        newErrors.installmentPlan = "Please select an installment plan";
      }
      if (paymentMethod === "crypto" && !cryptoWalletId) {
        newErrors.cryptoWalletId = "Please select a crypto wallet";
      }
      if (!payLater && !paymentProofFile && paymentMethod !== "installment") {
        // Warning, not error
        // newErrors.paymentProofFile = "Payment proof recommended";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (step: Step) => {
    if (!validateStep(step)) return;

    const steps: Step[] = ["subscriber", "shares", "payment", "review"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = (step: Step) => {
    const steps: Step[] = ["subscriber", "shares", "payment", "review"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Upload payment proof if provided
      let paymentProofUrl = null;
      if (paymentProofFile) {
        const formData = new FormData();
        formData.append("file", paymentProofFile);
        // Assuming there's an upload endpoint
        // const uploadResponse = await apiClient.upload_payment_proof(formData);
        // const uploadData = await uploadResponse.json();
        // paymentProofUrl = uploadData.url;
      }

      const subscriptionData = {
        email,
        full_name: name || "",
        id_number: idNumber || "",
        phone: phone || "",
        share_class: shareClass,
        num_shares: quantity,
        payment_method: paymentMethod,
        installment_plan: installmentPlan,
        crypto_wallet_id: cryptoWalletId,
        payment_proof_filename: paymentProofUrl,
        admin_notes: adminNotes,
      };

      const response = await apiClient.create_subscription_on_behalf(subscriptionData);
      const result = await response.json();

      toast.success("Subscription created successfully!");
      navigate("/back-office-subscriptions");
    } catch (error: any) {
      console.error("Failed to create subscription:", error);
      toast.error(error.message || "Failed to create subscription");
    } finally {
      setSubmitting(false);
    }
  };

  // Handler to receive share classes from ShareSelectionStep
  const handleShareClassesLoaded = (loadedClasses: any[]) => {
    console.log('📥 [Parent] Received share classes:', loadedClasses);
    // Map the API response format to our local format
    const mappedClasses = loadedClasses.map(sc => ({
      class_name: sc.name,
      price_per_share: sc.price_per_share
    }));
    console.log('🔄 [Parent] Mapped share classes:', mappedClasses);
    setShareClasses(mappedClasses);
  };

  const getSelectedShareClass = () => {
    console.log('🔍 [Parent] Looking for share class:', shareClass);
    console.log('🔍 [Parent] Available share classes:', shareClasses);
    const found = shareClasses.find(sc => sc.class_name === shareClass);
    console.log('🔍 [Parent] Found share class:', found);
    return found;
  };

  const calculateTotalAmount = () => {
    const selectedClass = getSelectedShareClass();
    const total = selectedClass ? selectedClass.price_per_share * quantity : 0;
    console.log('💰 [Parent] Calculate total:', { selectedClass, quantity, total });
    return total;
  };

  const getProgressValue = () => {
    const steps: Step[] = ["subscriber", "shares", "payment", "review"];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <BackOfficeNav />
      <main className="flex-1 lg:ml-64 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
            className="-ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {/* User Context Banner (when coming from AdminUsers) */}
          {fromAdminUsers && existingUserInfo && (
            <Alert className="border-blue-600 bg-blue-50 dark:bg-blue-950">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Creating subscription for: <strong>{existingUserInfo.name}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Loading State */}
          {loadingUser && (
            <Alert className="border-orange-600 bg-orange-50 dark:bg-orange-950">
              <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                Loading user profile...
              </AlertDescription>
            </Alert>
          )}
          
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Subscribe on Behalf</h1>
            <p className="text-muted-foreground mt-2">
              Create a share subscription for an investor
            </p>
          </div>

          {/* Progress Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
                  <span className={currentStep === "subscriber" ? "text-orange-600 font-medium" : ""}>
                    Subscriber Info
                  </span>
                  <span className={currentStep === "shares" ? "text-orange-600 font-medium" : ""}>
                    Share Selection
                  </span>
                  <span className={currentStep === "payment" ? "text-orange-600 font-medium" : ""}>
                    Payment Details
                  </span>
                  <span className={currentStep === "review" ? "text-orange-600 font-medium" : ""}>
                    Review
                  </span>
                </div>
                <Progress value={getProgressValue()} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          {currentStep === "subscriber" && (
            <SubscriberInfoStep
              email={email}
              name={name}
              idNumber={idNumber}
              phone={phone}
              emailCheckStatus={emailCheckStatus}
              existingUserInfo={existingUserInfo}
              errors={errors}
              emailLocked={fromAdminUsers}
              onEmailChange={setEmail}
              onNameChange={setName}
              onIdNumberChange={setIdNumber}
              onPhoneChange={setPhone}
              onNext={() => handleNext("subscriber")}
            />
          )}

          {currentStep === "shares" && (
            <ShareSelectionStep
              shareClass={shareClass}
              quantity={quantity}
              errors={errors}
              onShareClassChange={setShareClass}
              onQuantityChange={setQuantity}
              onShareClassesLoaded={handleShareClassesLoaded}
              onBack={() => handleBack("shares")}
              onNext={() => handleNext("shares")}
            />
          )}

          {currentStep === "payment" && (
            <PaymentOptionsStep
              paymentMethod={paymentMethod}
              payLater={payLater}
              installmentPlan={installmentPlan}
              cryptoWalletId={cryptoWalletId}
              paymentProofFile={paymentProofFile}
              adminNotes={adminNotes}
              totalAmount={calculateTotalAmount()}
              errors={errors}
              onPaymentMethodChange={setPaymentMethod}
              onPayLaterChange={setPayLater}
              onInstallmentPlanChange={setInstallmentPlan}
              onCryptoWalletChange={setCryptoWalletId}
              onPaymentProofChange={setPaymentProofFile}
              onAdminNotesChange={setAdminNotes}
              onBack={() => handleBack("payment")}
              onNext={() => handleNext("payment")}
            />
          )}

          {currentStep === "review" && (
            <ReviewStep
              email={email}
              name={name}
              idNumber={idNumber}
              phone={phone}
              shareClass={shareClass}
              quantity={quantity}
              pricePerShare={getSelectedShareClass()?.price_per_share || 0}
              totalAmount={calculateTotalAmount()}
              paymentMethod={paymentMethod}
              payLater={payLater}
              installmentPlan={installmentPlan}
              paymentProofFile={paymentProofFile}
              adminNotes={adminNotes}
              emailCheckStatus={emailCheckStatus}
              existingUserInfo={existingUserInfo}
              submitting={submitting}
              onBack={() => handleBack("review")}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
