import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pen } from 'lucide-react';
import SignaturePad from 'components/SignaturePad';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureData: SignatureData) => Promise<void>;
  certificateNumber: string;
  shareholderName: string;
}

export interface SignatureData {
  signatureImage: string; // base64 encoded PNG
  signerName: string;
  signerRole: string;
}

export default function SignatureCaptureModal({
  isOpen,
  onClose,
  onSign,
  certificateNumber,
  shareholderName,
}: Props) {
  const [isSigning, setIsSigning] = useState(false);

  const handleSign = async (signatureData: SignatureData) => {
    try {
      setIsSigning(true);
      await onSign(signatureData);
      onClose();
    } catch (error) {
      console.error('Signature error:', error);
      alert('Failed to sign certificate. Please try again.');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-5 w-5" />
            Sign Share Certificate
          </DialogTitle>
          <DialogDescription>
            Certificate #{certificateNumber} for {shareholderName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Legal Notice */}
          <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 mb-4">
            <p className="text-xs text-amber-900 dark:text-amber-100">
              <strong>Legal Notice:</strong> By signing this certificate, you
              certify that the information is accurate and that you are
              authorized to sign on behalf of Citizen Bank. This signature will
              be permanently embedded in the certificate PDF.
            </p>
          </div>

          <SignaturePad
            onSign={handleSign}
            isLoading={isSigning}
            certificateNumber={certificateNumber}
            shareholderName={shareholderName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
