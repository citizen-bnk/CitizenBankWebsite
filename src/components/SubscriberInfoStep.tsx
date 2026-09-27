import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, UserPlus, CheckCircle2, ArrowRight } from "lucide-react";

export interface Props {
  email: string;
  name: string;
  idNumber: string;
  phone: string;
  emailCheckStatus: "unchecked" | "checking" | "exists" | "new";
  existingUserInfo: { name: string; userId: string } | null;
  errors: { email?: string; name?: string; idNumber?: string; phone?: string };
  emailLocked?: boolean;
  onEmailChange: (email: string) => void;
  onNameChange: (name: string) => void;
  onIdNumberChange: (idNumber: string) => void;
  onPhoneChange: (phone: string) => void;
  onNext: () => void;
}

export function SubscriberInfoStep({
  email,
  name,
  idNumber,
  phone,
  emailCheckStatus,
  existingUserInfo,
  errors,
  emailLocked = false,
  onEmailChange,
  onNameChange,
  onIdNumberChange,
  onPhoneChange,
  onNext,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-orange-600" />
          <CardTitle>Subscriber Information</CardTitle>
        </div>
        <CardDescription>
          Email is required. Other details are optional and can be confirmed by the user later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email - REQUIRED */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="investor@example.com"
            disabled={emailLocked}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
          
          {emailCheckStatus === "checking" && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>Checking email...</AlertDescription>
            </Alert>
          )}
          
          {emailCheckStatus === "exists" && existingUserInfo && (
            <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Existing user found: <strong>{existingUserInfo.name}</strong>
              </AlertDescription>
            </Alert>
          )}
          
          {emailCheckStatus === "new" && (
            <Alert className="border-blue-600 bg-blue-50 dark:bg-blue-950">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                New investor - an invitation will be sent after subscription creation
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Name - OPTIONAL */}
        <div className="space-y-2">
          <Label htmlFor="name">Full Name (Optional)</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="John Doe"
          />
          <p className="text-xs text-muted-foreground">
            User will confirm their details upon first login
          </p>
        </div>

        {/* ID Number - OPTIONAL */}
        <div className="space-y-2">
          <Label htmlFor="idNumber">ID Number (Optional)</Label>
          <Input
            id="idNumber"
            value={idNumber}
            onChange={(e) => onIdNumberChange(e.target.value)}
            placeholder="9001015009087"
          />
          <p className="text-xs text-muted-foreground">
            If provided, will be pre-filled for user confirmation
          </p>
        </div>

        {/* Phone - OPTIONAL */}
        <div className="space-y-2">
          <Label htmlFor="contact">Contact Number (Optional)</Label>
          <Input
            id="contact"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+27 XX XXX XXXX"
          />
          <p className="text-xs text-muted-foreground">
            If provided, will be pre-filled for user confirmation
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onNext} disabled={!email.trim() || !email.includes("@")}>
            Next: Share Selection
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
