import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface SignatureData {
  signatureImage: string; // base64 encoded PNG (full data URL)
  signerName: string;
  signerRole: string;
}

interface Props {
  onSign: (data: SignatureData) => void | Promise<void>;
  isLoading?: boolean;
  certificateNumber?: string;
  shareholderName?: string;
  className?: string;
}

const SIGNER_ROLES = [
  { value: 'company_secretary', label: 'Company Secretary' },
  { value: 'chairman', label: 'Chairman' },
  { value: 'director', label: 'Director' },
  { value: 'authorized_official', label: 'Authorized Official' },
];

export default function SignaturePad({
  onSign,
  isLoading = false,
  certificateNumber,
  shareholderName,
  className = '',
}: Props) {
  const signaturePadRef = useRef<SignatureCanvas>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSignatureEnd = () => {
    setIsEmpty(signaturePadRef.current?.isEmpty() || false);
  };

  const handleSubmit = async () => {
    if (!signaturePadRef.current || isEmpty) {
      return;
    }

    if (!signerName.trim() || !signerRole) {
      return;
    }

    // Get signature as base64 PNG (full data URL)
    const signatureImage = signaturePadRef.current
      .getTrimmedCanvas()
      .toDataURL('image/png');

    await onSign({
      signatureImage,
      signerName: signerName.trim(),
      signerRole,
    });
  };

  const canSubmit = !isEmpty && signerName.trim() && signerRole && !isLoading;

  return (
    <div className={className}>
      {/* Signer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="signer-name">Your Full Name *</Label>
          <Input
            id="signer-name"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Enter your full name"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signer-role">Your Role *</Label>
          <Select value={signerRole} onValueChange={setSignerRole} disabled={isLoading}>
            <SelectTrigger id="signer-role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {SIGNER_ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Signature Canvas */}
      <div className="space-y-2 mb-4">
        <Label>Draw Your Signature *</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <SignatureCanvas
            ref={signaturePadRef}
            canvasProps={{
              className: 'w-full h-48 cursor-crosshair',
            }}
            onEnd={handleSignatureEnd}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={isEmpty || isLoading}
          className="flex-1"
        >
          Clear
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1"
        >
          {isLoading ? 'Signing...' : 'Sign Certificate'}
        </Button>
      </div>
    </div>
  );
}
