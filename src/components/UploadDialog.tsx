import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText } from "lucide-react";
import { apiClient } from "app";
import { BoardMemberDocumentStatus } from "types";
import { showErrorToast, showSuccessToast, validateFileUpload } from "utils/errorHandling";

interface Props {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  requirement: BoardMemberDocumentStatus | null;
  onUploadSuccess: () => void;
}

const UploadDialog: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  requirement,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file upload
    const validation = validateFileUpload(file, {
      maxSizeMB: requirement?.requirement.max_file_size_mb || 5,
      allowedTypes: requirement?.requirement.file_formats_accepted || [],
    });

    if (!validation.valid) {
      showErrorToast(null, validation.error);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !requirement) return;

    setUploading(true);
    try {
      await apiClient.upload_document(
        { requirement_id: requirement.requirement.id },
        { file: selectedFile }
      );
      showSuccessToast('Document uploaded successfully!');
      onUploadSuccess();
      setSelectedFile(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error uploading document:", error);
      showErrorToast(error, 'Upload failed. Please try again or contact support if the issue persists.');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            {requirement?.requirement.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file-upload" className="text-right">
              File
            </Label>
            <Input
              id="file-upload"
              type="file"
              className="col-span-3"
              onChange={handleFileSelect}
              accept={requirement?.requirement.file_formats_accepted
                .map((ext) => `.${ext}`)
                .join(",")}
            />
          </div>
          {selectedFile && (
            <div className="text-sm text-muted-foreground col-start-2 col-span-3">
              <p>Selected: {selectedFile.name}</p>
              <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDialog;
