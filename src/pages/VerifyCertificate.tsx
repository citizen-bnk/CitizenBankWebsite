import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Shield, Loader2, QrCode, FileText } from "lucide-react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import brain from "brain";
import { toast } from "sonner";

export default function VerifyCertificate() {
  const [searchParams] = useSearchParams();
  const [certificateNumber, setCertificateNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("legacy");

  // Check for token in URL (from QR code scan)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setVerificationToken(token);
      setActiveTab("token");
      handleTokenVerification(token);
    }
  }, [searchParams]);

  const handleTokenVerification = async (token: string) => {
    setVerifying(true);
    setResult(null);

    try {
      const response = await brain.verify_certificate_by_token({ verificationToken: token });
      const data = await response.json();
      
      setResult({
        valid: data.verified,
        certificate_number: data.certificate_number,
        shareholder_name: data.shareholder_name,
        shares: data.num_shares,
        share_class: data.share_class,
        issue_date: data.issue_date,
        status: data.status,
        qr_code_data: data.qr_code_data,
        html_content: data.html_content,
        message: data.verified ? "Certificate verified successfully" : "Certificate is not active"
      });

      if (data.verified) {
        toast.success("Certificate verified successfully!");
      } else {
        toast.error("Certificate verification failed or certificate is revoked");
      }
    } catch (error: any) {
      console.error("Token verification error:", error);
      const errorMessage = error.status === 404 
        ? "Certificate not found or verification token is invalid"
        : "Failed to verify certificate. Please try again.";
      toast.error(errorMessage);
      setResult({ 
        valid: false, 
        message: errorMessage
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleLegacyVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!certificateNumber.trim() || !verificationCode.trim()) {
      toast.error("Please enter both certificate number and verification code");
      return;
    }

    setVerifying(true);
    setResult(null);

    try {
      const response = await brain.verify_certificate({
        certificate_number: certificateNumber.trim(),
        verification_code: verificationCode.trim()
      });

      const data = await response.json();
      setResult(data);

      if (data.valid) {
        toast.success("Certificate verified successfully!");
      } else {
        toast.error(data.message || "Certificate verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Failed to verify certificate. Please try again.");
      setResult({ valid: false, message: "Verification failed. Please check your inputs and try again." });
    } finally {
      setVerifying(false);
    }
  };

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken.trim()) {
      toast.error("Please enter a verification token");
      return;
    }
    handleTokenVerification(verificationToken.trim());
  };

  const handleReset = () => {
    setCertificateNumber("");
    setVerificationCode("");
    setVerificationToken("");
    setResult(null);
  };

  const handleViewCertificate = () => {
    if (result?.html_content) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(result.html_content);
        newWindow.document.close();
      } else {
        toast.error('Please allow popups to view certificate');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600/20 p-4 rounded-full">
                <Shield className="h-12 w-12 text-blue-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-2 text-white">
              Verify Share Certificate
            </h1>
            <p className="text-white/80">
              Authenticate a share certificate using QR code or manual entry
            </p>
          </div>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Certificate Verification</CardTitle>
              <CardDescription className="text-white/70">
                All share certificates issued by Citizen Bank can be verified using this secure system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="token" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code / Token
                  </TabsTrigger>
                  <TabsTrigger value="legacy" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Manual Entry
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="token">
                  <form onSubmit={handleTokenSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="verification-token" className="text-white">
                        Verification Token
                      </Label>
                      <Input
                        id="verification-token"
                        placeholder="Paste the token from QR code..."
                        value={verificationToken}
                        onChange={(e) => setVerificationToken(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                        disabled={verifying}
                      />
                      <p className="text-xs text-white/60">
                        Scan the QR code on the certificate or enter the token manually
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={verifying}
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Verify Certificate
                          </>
                        )}
                      </Button>
                      {result && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleReset}
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="legacy">
                  <form onSubmit={handleLegacyVerify} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="certificate-number" className="text-white">
                        Certificate Number
                      </Label>
                      <Input
                        id="certificate-number"
                        placeholder="e.g., CERT-2025-00001"
                        value={certificateNumber}
                        onChange={(e) => setCertificateNumber(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                        disabled={verifying}
                      />
                      <p className="text-xs text-white/60">
                        Found on the top of your share certificate
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="verification-code" className="text-white">
                        Verification Code
                      </Label>
                      <Input
                        id="verification-code"
                        placeholder="Enter the verification code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                        disabled={verifying}
                      />
                      <p className="text-xs text-white/60">
                        Found in the verification section of your certificate
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={verifying}
                      >
                        {verifying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Verify Certificate
                          </>
                        )}
                      </Button>
                      {result && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleReset}
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Verification Result */}
              {result && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  {result.valid ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500/20 p-3 rounded-full">
                          <CheckCircle className="h-8 w-8 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">Certificate Verified</h3>
                          <p className="text-green-400">This certificate is valid and authentic</p>
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-white/60 mb-1">Certificate Number</p>
                            <p className="text-white font-semibold">{result.certificate_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60 mb-1">Status</p>
                            <Badge className="bg-green-500/20 text-green-300">
                              {result.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-white/60 mb-1">Shareholder Name</p>
                            <p className="text-white font-semibold">{result.shareholder_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60 mb-1">Number of Shares</p>
                            <p className="text-white font-semibold">{result.shares?.toLocaleString()}</p>
                          </div>
                        </div>

                        {result.share_class && (
                          <div>
                            <p className="text-xs text-white/60 mb-1">Share Class</p>
                            <Badge variant="outline" className="text-white">{result.share_class}</Badge>
                          </div>
                        )}

                        <div>
                          <p className="text-xs text-white/60 mb-1">Issue Date</p>
                          <p className="text-white font-semibold">
                            {new Date(result.issue_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      {result.html_content && (
                        <Button
                          onClick={handleViewCertificate}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Full Certificate
                        </Button>
                      )}

                      <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg">
                        <p className="text-xs text-blue-200">
                          <strong>Note:</strong> This verification confirms the authenticity of the certificate.
                          For any concerns or questions, please contact Citizen Bank directly.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-500/20 p-3 rounded-full">
                          <XCircle className="h-8 w-8 text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">Verification Failed</h3>
                          <p className="text-red-400">{result.message || "Certificate could not be verified"}</p>
                        </div>
                      </div>

                      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg space-y-2">
                        <p className="text-sm text-white">
                          <strong>Possible reasons:</strong>
                        </p>
                        <ul className="text-sm text-white/80 list-disc list-inside space-y-1">
                          <li>Certificate number, code, or token is incorrect</li>
                          <li>Certificate may have been revoked</li>
                          <li>Certificate does not exist in our system</li>
                        </ul>
                        <p className="text-sm text-white/80 mt-3">
                          Please double-check your inputs or contact Citizen Bank for assistance.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Information Section */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <Card className="bg-white/5 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">How to Verify</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-sm text-white/80 space-y-2 list-decimal list-inside">
                  <li>Locate the certificate number at the top of your share certificate</li>
                  <li>Find the verification code in the QR code section</li>
                  <li>Enter both values in the form above</li>
                  <li>Click "Verify Certificate" to authenticate</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Security & Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/80">
                  Our verification system uses secure encryption to protect your certificate information.
                  Only limited details are shown during verification to maintain shareholder privacy while
                  confirming authenticity.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
