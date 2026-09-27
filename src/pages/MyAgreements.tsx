import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@stackframe/react";
import brain from "brain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, FileText, Shield, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface AgreementStatus {
  ncnda_signed: boolean;
  ncnda_signed_at: string | null;
  terms_signed: boolean;
  terms_signed_at: string | null;
  loi_agreed: boolean;
  loi_agreed_at: string | null;
  loi_file_url: string | null;
  loi_status: string | null;
}

const MyAgreements = () => {
  const user = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<AgreementStatus | null>(null);

  useEffect(() => {
    loadAgreements();
  }, []);

  const loadAgreements = async () => {
    try {
      const response = await brain.get_my_agreement_status();
      const data = await response.json();
      setAgreements(data);
    } catch (error) {
      console.error("Error loading agreements:", error);
      toast.error("Failed to load agreement status");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not signed";
    const date = new Date(dateString);
    return date.toLocaleString('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Johannesburg'
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Under Review</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading agreements...</p>
        </div>
      </div>
    );
  }

  if (!agreements) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load agreement information</p>
            <Button onClick={loadAgreements} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allSigned = agreements.ncnda_signed && agreements.terms_signed && agreements.loi_agreed;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/data-room")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Data Room
          </Button>
          <h1 className="text-4xl font-bold mb-2 flex items-center">
            <Shield className="h-8 w-8 mr-3 text-primary" />
            My Agreements
          </h1>
          <p className="text-muted-foreground">
            View and manage your signed agreements for data room access
          </p>
        </div>

        {/* Overall Status */}
        {allSigned ? (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              All agreements completed. You have full access to the data room.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Some agreements are pending. Complete all agreements to access the data room.
            </AlertDescription>
          </Alert>
        )}

        {/* NCNDA */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Non-Circumvention Non-Disclosure Agreement (NCNDA)</CardTitle>
              </div>
              {agreements.ncnda_signed ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <CardDescription>
              Legal agreement to protect confidential information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                {agreements.ncnda_signed ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Signed
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Signed
                  </Badge>
                )}
              </div>
              {agreements.ncnda_signed && agreements.ncnda_signed_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Signed on:</span>
                  <span className="text-sm font-medium">{formatDate(agreements.ncnda_signed_at)}</span>
                </div>
              )}
              {!agreements.ncnda_signed && (
                <Button 
                  onClick={() => navigate("/data-room-access")}
                  size="sm"
                  className="mt-2 w-full"
                >
                  Sign NCNDA
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Terms & Conditions</CardTitle>
              </div>
              {agreements.terms_signed ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <CardDescription>
              Data room access terms and conditions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                {agreements.terms_signed ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Accepted
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Accepted
                  </Badge>
                )}
              </div>
              {agreements.terms_signed && agreements.terms_signed_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Accepted on:</span>
                  <span className="text-sm font-medium">{formatDate(agreements.terms_signed_at)}</span>
                </div>
              )}
              {!agreements.terms_signed && (
                <Button 
                  onClick={() => navigate("/data-room-access")}
                  size="sm"
                  className="mt-2 w-full"
                >
                  Accept Terms
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Letter of Intent */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>Letter of Intent</CardTitle>
              </div>
              {agreements.loi_agreed ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <CardDescription>
              Confirmation of serious intent to participate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Agreement Status:</span>
                {agreements.loi_agreed ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Agreed
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Agreed
                  </Badge>
                )}
              </div>
              {agreements.loi_agreed && agreements.loi_agreed_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Agreed on:</span>
                  <span className="text-sm font-medium">{formatDate(agreements.loi_agreed_at)}</span>
                </div>
              )}
              {agreements.loi_file_url && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Document Status:</span>
                    {getStatusBadge(agreements.loi_status)}
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => window.open(agreements.loi_file_url!, "_blank")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Submitted LOI
                  </Button>
                </>
              )}
              {!agreements.loi_file_url && agreements.loi_agreed && (
                <Alert className="mt-2">
                  <AlertDescription className="text-xs">
                    You agreed to provide a Letter of Intent but haven't uploaded the document yet. You can submit it later.
                  </AlertDescription>
                </Alert>
              )}
              {!agreements.loi_agreed && (
                <Button 
                  onClick={() => navigate("/data-room-access")}
                  size="sm"
                  className="mt-2 w-full"
                >
                  Agree to LOI
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            All agreements are digitally signed and timestamped. Your signature includes your IP address for security and compliance purposes.
            These records are maintained for regulatory compliance.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          {allSigned && (
            <Button onClick={() => navigate("/data-room")} className="flex-1">
              <Shield className="h-4 w-4 mr-2" />
              Access Data Room
            </Button>
          )}
          {!allSigned && (
            <Button onClick={() => navigate("/data-room-access")} className="flex-1">
              Complete Missing Agreements
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAgreements;
