import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from 'app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, CheckCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_URL } from 'app';
import SignaturePad, { type SignatureData } from 'components/SignaturePad';

export default function SignCertificate() {
  const [searchParams] = useSearchParams();
  
  // Get params from URL
  const certId = searchParams.get('certId');
  const certificateNumber = searchParams.get('certNumber');
  const shareholderName = searchParams.get('shareholder');
  
  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // Validate required params
  useEffect(() => {
    if (!certId || !certificateNumber) {
      toast.error('Missing certificate information');
      setTimeout(() => window.close(), 2000);
    }
  }, [certId, certificateNumber]);

  const handleSign = async (data: SignatureData) => {
    if (!certId) {
      toast.error('Certificate ID is missing');
      return;
    }

    setIsSigning(true);
    try {
      // Extract base64 from data URL (remove data:image/png;base64, prefix)
      const signatureImage = data.signatureImage.split(',')[1];

      const response = await apiClient.sign_certificate_endpoint(
        { certId: certId },
        {
          signature_image: signatureImage,
          signer_name: data.signerName,
          signer_role: data.signerRole,
        }
      );

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to sign certificate');
      }

      const result = await response.json();
      
      toast.success(`Certificate signed successfully by ${result.signer_name}`);
      console.log('✅ Certificate signed:', result);
      
      setSigned(true);
      
      // Open the signed certificate in public view
      if (result.certificate_url) {
        setTimeout(() => {
          // Construct full API URL for the public certificate endpoint
          const publicCertUrl = `${API_URL}${result.certificate_url}`;
          console.log('📄 Opening certificate at:', publicCertUrl);
          window.location.href = publicCertUrl;
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error signing certificate:', error);
      
      // Try to get detailed error message from response
      let errorMessage = 'Failed to sign certificate';
      if (error.json) {
        try {
          const errorData = await error.json();
          errorMessage = errorData.detail || errorMessage;
          console.error('Backend error details:', errorData);
          console.error('Error detail string:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Final error message to display:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSigning(false);
    }
  };

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Certificate Signed!</CardTitle>
            <CardDescription>
              Opening signed certificate...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sign Certificate</h1>
            <p className="text-gray-600 mt-1">Digital signature required for certificate issuance</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.close()}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>

        {/* Certificate Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Certificate Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Certificate Number</Label>
              <p className="font-mono font-semibold">{certificateNumber}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Shareholder</Label>
              <p className="font-medium">{shareholderName}</p>
            </div>
            <Alert>
              <AlertDescription className="text-xs">
                By signing this certificate, you confirm that the share allocation is accurate and authorized.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Signature Pad */}
        <Card>
          <CardHeader>
            <CardTitle>Authorized Signatory</CardTitle>
            <CardDescription>Enter your details and sign below</CardDescription>
          </CardHeader>
          <CardContent>
            <SignaturePad
              onSign={handleSign}
              isLoading={isSigning}
              certificateNumber={certificateNumber || undefined}
              shareholderName={shareholderName || undefined}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
