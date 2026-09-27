import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserGuardContext } from "app/auth";
import brain from "brain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, FileText, Shield, AlertCircle, Building2, DollarSign } from "lucide-react";
import { toast } from "sonner";

const DataRoomAccess = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Investment details form
  const [investorName, setInvestorName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investmentCurrency, setInvestmentCurrency] = useState("LSL");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [investmentPurpose, setInvestmentPurpose] = useState("");

  // Agreement consent
  const [ncndaAgreed, setNcndaAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loiAgreed, setLoiAgreed] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState("");

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await brain.check_access();
      const data = await response.json();
      
      // If user already has access, redirect to data room
      if (data.has_access) {
        toast.success("You already have access to the data room");
        navigate("/data-room");
        return;
      }

      // Pre-fill email if available
      if (user.primaryEmail) {
        setContactEmail(user.primaryEmail);
      }
      if (user.displayName) {
        setInvestorName(user.displayName);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      toast.error("Failed to check access status");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAll = async () => {
    // Validation
    if (!ncndaAgreed || !termsAgreed || !loiAgreed) {
      toast.error("Please agree to all three agreements");
      return;
    }

    if (!digitalSignature.trim()) {
      toast.error("Please provide your digital signature");
      return;
    }

    if (!investorName.trim() || !entityName.trim() || !entityType || !investmentAmount) {
      toast.error("Please complete all required investment details");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Sign NCNDA
      await brain.sign_ncnda({
        agreement_version: "1.0",
        digital_signature: digitalSignature
      });

      // Step 2: Sign Terms
      await brain.sign_terms({
        agreement_version: "1.0",
        digital_signature: digitalSignature
      });

      // Step 3: Agree to LOI with investment details
      await brain.agree_to_loi({
        agreement_version: "1.0",
        digital_signature: digitalSignature,
        investor_name: investorName,
        entity_name: entityName,
        entity_type: entityType,
        registration_number: registrationNumber || null,
        investment_amount: investmentAmount,
        investment_currency: investmentCurrency,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        investment_purpose: investmentPurpose || null
      });

      toast.success("All agreements signed successfully! Redirecting to data room...");
      
      // Small delay for toast to show
      setTimeout(() => {
        navigate("/data-room");
      }, 1500);
    } catch (error) {
      console.error("Error submitting agreements:", error);
      toast.error("Failed to submit agreements. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const allFormsComplete = () => {
    return (
      ncndaAgreed &&
      termsAgreed &&
      loiAgreed &&
      digitalSignature.trim() &&
      investorName.trim() &&
      entityName.trim() &&
      entityType &&
      investmentAmount &&
      contactEmail.trim()
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-background dark:from-gray-900 dark:to-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Investor Data Room Access</h1>
          <p className="text-muted-foreground">
            Complete the form below to access banking license documentation
          </p>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please review all agreements, provide your investment details, and consent to all requirements below to gain access to the secure data room.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Investment Details Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Investor Information
                </CardTitle>
                <CardDescription>
                  Provide your details for the investment documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="investor-name">Full Name / Representative Name *</Label>
                  <Input
                    id="investor-name"
                    placeholder="e.g., John Smith"
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="entity-name">Entity / Company Name *</Label>
                  <Input
                    id="entity-name"
                    placeholder="e.g., ABC Investment Holdings"
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="entity-type">Entity Type *</Label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger id="entity-type">
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual Investor</SelectItem>
                      <SelectItem value="company">Private Company</SelectItem>
                      <SelectItem value="trust">Trust</SelectItem>
                      <SelectItem value="fund">Investment Fund</SelectItem>
                      <SelectItem value="pension">Pension Fund</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="registration-number">Registration Number (if applicable)</Label>
                  <Input
                    id="registration-number"
                    placeholder="e.g., 2023/123456/07"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Investment Details
                </CardTitle>
                <CardDescription>
                  Indicate your intended investment amount
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor="investment-amount">Investment Amount *</Label>
                    <Input
                      id="investment-amount"
                      type="number"
                      placeholder="e.g., 1000000"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency *</Label>
                    <Select value={investmentCurrency} onValueChange={setInvestmentCurrency}>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LSL">LSL</SelectItem>
                        <SelectItem value="ZAR">ZAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="investment-purpose">Investment Purpose *</Label>
                  <Textarea
                    id="investment-purpose"
                    placeholder="Briefly describe your investment objectives and interest in Citizen Bank..."
                    value={investmentPurpose}
                    onChange={(e) => setInvestmentPurpose(e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="contact-email">Contact Email *</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="investor@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    placeholder="+266 XXXX XXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Agreements */}
          <div className="space-y-6">
            {/* NCNDA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Non-Circumvention Non-Disclosure Agreement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto text-sm">
                  <h4 className="font-semibold mb-2">NCNDA Agreement</h4>
                  <p className="mb-2">
                    This Non-Circumvention and Non-Disclosure Agreement ("Agreement") is entered into by and between:
                  </p>
                  <p className="mb-2">
                    <strong>Citizen Bank</strong> ("Disclosing Party"), a banking institution in the process of obtaining a banking license in Lesotho, and
                  </p>
                  <p className="mb-2">
                    <strong>{investorName || "[Investor Name]"}</strong> representing <strong>{entityName || "[Entity Name]"}</strong> ("Receiving Party").
                  </p>
                  <p className="mb-2 font-semibold">1. Confidentiality</p>
                  <p className="mb-2">
                    The Receiving Party agrees to maintain strict confidentiality of all information, documents, data, and materials provided by the Disclosing Party in connection with the banking license application and business operations.
                  </p>
                  <p className="mb-2 font-semibold">2. Non-Disclosure</p>
                  <p className="mb-2">
                    The Receiving Party shall not disclose, copy, distribute, or share any confidential information with third parties without prior written consent from the Disclosing Party.
                  </p>
                  <p className="mb-2 font-semibold">3. Non-Circumvention</p>
                  <p className="mb-2">
                    The Receiving Party agrees not to circumvent, avoid, or bypass the Disclosing Party in any business dealings, transactions, or opportunities arising from this relationship.
                  </p>
                  <p className="mb-2 font-semibold">4. Use of Information</p>
                  <p className="mb-2">
                    All information shall be used solely for the purpose of evaluating investment opportunities in Citizen Bank and shall not be used for any competitive or unauthorized purpose.
                  </p>
                  <p className="mb-2 font-semibold">5. Term</p>
                  <p className="mb-2">
                    This Agreement shall remain in effect for a period of five (5) years from the date of signing.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="ncnda-agree"
                    checked={ncndaAgreed}
                    onCheckedChange={(checked) => setNcndaAgreed(checked as boolean)}
                  />
                  <Label htmlFor="ncnda-agree" className="text-sm leading-relaxed cursor-pointer">
                    I have read and agree to the Non-Circumvention Non-Disclosure Agreement
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Data Room Terms & Conditions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto text-sm">
                  <h4 className="font-semibold mb-2">Terms & Conditions for Data Room Access</h4>
                  <p className="mb-2">By accessing the Citizen Bank Data Room, you agree to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use the information solely for evaluating investment opportunities in Citizen Bank</li>
                    <li>Maintain the confidentiality of all documents and information accessed</li>
                    <li>Not distribute, copy, or share any documents without explicit written permission</li>
                    <li>Acknowledge that all access is logged and monitored for security and compliance purposes</li>
                    <li>Comply with all applicable laws and regulations regarding the handling of sensitive financial information</li>
                    <li>Provide a legitimate business reason when accessing specific documents</li>
                    <li>Accept that access may be revoked at any time at the discretion of Citizen Bank</li>
                    <li>Not engage in any activity that could harm Citizen Bank's interests or reputation</li>
                    <li>Report any unauthorized access or security concerns immediately</li>
                  </ul>
                  <p className="mt-2 font-semibold">Data Protection & Audit Trail</p>
                  <p>
                    Your access activities, including IP addresses, download history, and access reasons, will be recorded for audit and compliance purposes in accordance with data protection regulations.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms-agree"
                    checked={termsAgreed}
                    onCheckedChange={(checked) => setTermsAgreed(checked as boolean)}
                  />
                  <Label htmlFor="terms-agree" className="text-sm leading-relaxed cursor-pointer">
                    I have read and agree to the Data Room Terms & Conditions
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Letter of Intent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Letter of Intent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto text-sm">
                  <h4 className="font-semibold mb-2">Letter of Intent</h4>
                  <p className="mb-2">Date: {new Date().toLocaleDateString()}</p>
                  <p className="mb-2">To: Citizen Bank Board of Directors</p>
                  <p className="mb-2">From: {investorName || "[Investor Name]"}, {entityName || "[Entity Name]"}</p>
                  <p className="mb-3">Re: Investment Intent in Citizen Bank</p>
                  <p className="mb-2">Dear Board Members,</p>
                  <p className="mb-2">
                    I/We, <strong>{investorName || "[Investor Name]"}</strong>, on behalf of <strong>{entityName || "[Entity Name]"}</strong>, 
                    hereby express our serious intent to invest in Citizen Bank.
                  </p>
                  <p className="mb-2 font-semibold">Investment Details:</p>
                  <ul className="list-disc pl-5 space-y-1 mb-2">
                    <li>Proposed Investment Amount: <strong>{investmentAmount ? `${investmentCurrency} ${Number(investmentAmount).toLocaleString()}` : "[Amount]"}</strong></li>
                    <li>Entity Type: <strong>{entityType || "[Entity Type]"}</strong></li>
                    <li>Registration Number: <strong>{registrationNumber || "N/A"}</strong></li>
                  </ul>
                  <p className="mb-2 font-semibold">Investment Purpose:</p>
                  <p className="mb-2">{investmentPurpose || "[Investment purpose and objectives]"}</p>
                  <p className="mb-2">
                    This Letter of Intent is non-binding and serves to express our genuine interest in participating in Citizen Bank's development. 
                    We understand that this LOI is subject to due diligence, regulatory approval, and the negotiation of definitive agreements.
                  </p>
                  <p className="mb-2">
                    We commit to conducting thorough due diligence and working collaboratively with Citizen Bank's management and advisors 
                    to finalize the investment terms.
                  </p>
                  <p className="mb-2">
                    We acknowledge that access to the data room is granted for the purpose of conducting due diligence and that all information 
                    accessed is subject to the NCNDA and Terms & Conditions agreed upon.
                  </p>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="loi-agree"
                    checked={loiAgreed}
                    onCheckedChange={(checked) => setLoiAgreed(checked as boolean)}
                  />
                  <Label htmlFor="loi-agree" className="text-sm leading-relaxed cursor-pointer">
                    I agree to provide this Letter of Intent expressing serious interest in investing in Citizen Bank
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Digital Signature */}
            <Card>
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                  Sign all agreements with your full legal name
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="signature">Digital Signature (Full Legal Name) *</Label>
                  <Input
                    id="signature"
                    placeholder="Enter your full legal name"
                    value={digitalSignature}
                    onChange={(e) => setDigitalSignature(e.target.value)}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    By signing, you legally agree to all terms above. Your signature will be recorded with a timestamp and IP address for all three agreements.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleSubmitAll}
                  disabled={!allFormsComplete() || submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Sign All Agreements & Access Data Room
                    </>
                  )}
                </Button>

                {!allFormsComplete() && (
                  <p className="text-sm text-muted-foreground text-center">
                    Please complete all required fields and agree to all terms
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataRoomAccess;
