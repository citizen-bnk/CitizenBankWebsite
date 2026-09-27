import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, Mail, CreditCard, User, FileText, AlertCircle, Building2, Hash, Phone, Wallet } from "lucide-react";
import { Loader2 } from "lucide-react";

export interface Props {
  email: string;
  name: string;
  idNumber: string;
  phone: string;
  shareClass: string;
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  paymentMethod: string;
  payLater: boolean;
  installmentPlan: string | null;
  paymentProofFile: File | null;
  adminNotes: string;
  emailCheckStatus: "unchecked" | "checking" | "exists" | "new";
  existingUserInfo: { name: string; userId: string } | null;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export function ReviewStep({
  email,
  name,
  idNumber,
  phone,
  shareClass,
  quantity,
  pricePerShare,
  totalAmount,
  paymentMethod,
  payLater,
  installmentPlan,
  paymentProofFile,
  adminNotes,
  emailCheckStatus,
  existingUserInfo,
  submitting,
  onBack,
  onSubmit,
}: Props) {
  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case "bank_transfer": return "Bank Transfer";
      case "crypto": return "Cryptocurrency";
      case "installment": return "Installment Plan";
      default: return paymentMethod;
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Alerts */}
      {emailCheckStatus === "exists" && existingUserInfo && (
        <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Adding shares to existing investor: <strong>{existingUserInfo.name}</strong>
          </AlertDescription>
        </Alert>
      )}
      
      {emailCheckStatus === "new" && (
        <Alert className="border-blue-600 bg-blue-50 dark:bg-blue-950">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            New investor will be invited to complete their profile
          </AlertDescription>
        </Alert>
      )}

      {payLater && (
        <Alert className="border-amber-600 bg-amber-50 dark:bg-amber-950">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Subscription will be created with <strong>pending payment</strong> status.
            Payment can be added later from the subscriptions dashboard.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Review Card */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-orange-600" />
              <div>
                <CardTitle className="text-2xl">Review & Confirm</CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Please verify all details before creating the subscription
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-white dark:bg-gray-900 text-lg px-4 py-2">
              {shareClass}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Subscriber & Payment Info */}
            <div className="space-y-6">
              {/* Subscriber Information */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                    <User className="h-4 w-4 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Subscriber Details</h3>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Email Address</p>
                      <p className="font-medium break-all">{email}</p>
                    </div>
                  </div>
                  {name && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-medium">{name}</p>
                      </div>
                    </div>
                  )}
                  {idNumber && (
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">ID Number</p>
                        <p className="font-medium">{idNumber}</p>
                      </div>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Phone Number</p>
                        <p className="font-medium">{phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Information */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                    <Wallet className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Payment Information</h3>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Payment Method</p>
                      <p className="font-medium">{getPaymentMethodLabel()}</p>
                    </div>
                  </div>
                  {paymentMethod === "installment" && installmentPlan && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Installment Plan</p>
                        <p className="font-medium">{installmentPlan}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Payment Status</p>
                      {payLater ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 mt-1">
                          Pay Later
                        </Badge>
                      ) : paymentProofFile ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 mt-1">
                          Proof Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 mt-1">
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  {paymentProofFile && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Proof of Payment</p>
                        <p className="text-sm font-medium truncate">{paymentProofFile.name}</p>
                      </div>
                    </div>
                  )}
                  {adminNotes && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Admin Notes</p>
                        <p className="text-sm bg-muted p-3 rounded-lg mt-1 whitespace-pre-wrap">{adminNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Share Details & Total */}
            <div className="space-y-6">
              {/* Share Investment Details */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <Building2 className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Investment Details</h3>
                </div>
                <div className="space-y-3 pl-1">
                  <div className="flex items-start gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Share Class</p>
                      <p className="font-medium text-lg">{shareClass}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Number of Shares</p>
                      <p className="font-medium text-lg">{quantity.toLocaleString()} shares</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Price per Share</p>
                      <p className="font-medium text-lg">R{pricePerShare.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Total Amount Card */}
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="text-center space-y-2">
                    <p className="text-orange-100 text-sm font-medium uppercase tracking-wide">Total Investment Amount</p>
                    <div className="text-4xl md:text-5xl font-bold text-white">
                      R{totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-orange-100 text-xs pt-2">
                      {quantity.toLocaleString()} shares × R{pricePerShare.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3">Quick Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investor Type:</span>
                    <span className="font-medium">
                      {emailCheckStatus === "exists" ? "Existing" : "New"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Share Class:</span>
                    <span className="font-medium">{shareClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Shares:</span>
                    <span className="font-medium">{quantity.toLocaleString()}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-semibold">Payment:</span>
                    <span className="font-semibold">
                      {payLater ? "Deferred" : "Immediate"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 mt-6 border-t">
            <Button 
              variant="outline" 
              onClick={onBack} 
              disabled={submitting}
              size="lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Payment
            </Button>
            <Button 
              onClick={onSubmit} 
              disabled={submitting} 
              className="bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Subscription...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Create Subscription
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
