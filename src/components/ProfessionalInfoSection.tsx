import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Briefcase, Upload, FileText, Download, Loader2, CheckCircle, ExternalLink, Eye, Link2, Copy } from "lucide-react";
import { EditableFieldComponent, type EditingField } from "components/EditableFieldComponent";
import { apiClient } from 'app';
import { toast } from 'sonner';
import type { UserProfileResponse } from 'types';

type Props = {
  profile: UserProfileResponse;
  onEditField: (field: EditingField) => void;
  onUpdate: () => void;
};

export const ProfessionalInfoSection = ({ profile, onEditField, onUpdate }: Props) => {
  const [uploadingCV, setUploadingCV] = useState(false);

  const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingCV(true);
    try {
      // Upload CV file using the new upload_cv endpoint
      const response = await apiClient.upload_cv({ file });

      if (response.ok) {
        toast.success('CV uploaded successfully');
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to upload CV');
      }
    } catch (error) {
      console.error('Error uploading CV:', error);
      toast.error('Failed to upload CV');
    } finally {
      setUploadingCV(false);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle>Professional Information</CardTitle>
        </div>
        <CardDescription>Your employment details and professional profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <EditableFieldComponent 
            label="Occupation" 
            value={profile.occupation} 
            fieldName="occupation" 
            onEdit={onEditField}
          />
          <EditableFieldComponent 
            label="Employer" 
            value={profile.employer} 
            fieldName="employer" 
            onEdit={onEditField}
          />
        </div>

        {/* LinkedIn Profile */}
        <div className="space-y-2">
          <EditableFieldComponent 
            label="LinkedIn Profile" 
            value={profile.linkedin_profile} 
            fieldName="linkedin_profile" 
            description="Your LinkedIn profile URL (e.g., https://linkedin.com/in/yourname)"
            onEdit={onEditField}
          />
          {profile.linkedin_profile && (
            <a 
              href={profile.linkedin_profile}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View LinkedIn Profile
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* CV Upload */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Curriculum Vitae (CV)
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your CV or resume (PDF or Word document, max 10MB)
              </p>
            </div>
          </div>

          {profile.cv_uploaded_at ? (
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
                <div>
                  <p className="font-medium text-sm">CV Uploaded</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(profile.cv_uploaded_at).toLocaleDateString('en-ZA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Open CV in new tab using download_cv endpoint
                    try {
                      const response = await apiClient.download_cv();
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        // Cleanup after a delay to ensure the window opened
                        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
                      } else {
                        toast.error('Failed to view CV');
                      }
                    } catch (error) {
                      console.error('Error viewing CV:', error);
                      toast.error('Failed to view CV');
                    }
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Download CV
                    try {
                      const response = await apiClient.download_cv();
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = profile.cv_filename || 'cv.pdf';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } else {
                        toast.error('Failed to download CV');
                      }
                    } catch (error) {
                      console.error('Error downloading CV:', error);
                      toast.error('Failed to download CV');
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                {profile.cv_share_link && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Copy share link to clipboard
                      navigator.clipboard.writeText(profile.cv_share_link || '');
                      toast.success('Share link copied to clipboard');
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                )}
                <Label htmlFor="cv-upload" className="cursor-pointer">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={uploadingCV}
                    asChild
                  >
                    <span>
                      {uploadingCV ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Replace CV
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
                <Input
                  id="cv-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleCVUpload}
                  disabled={uploadingCV}
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground text-center mb-4">
                No CV uploaded yet
              </p>
              <Label htmlFor="cv-upload-initial" className="cursor-pointer">
                <Button disabled={uploadingCV} asChild>
                  <span>
                    {uploadingCV ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload CV
                      </>
                    )}
                  </span>
                </Button>
              </Label>
              <Input
                id="cv-upload-initial"
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleCVUpload}
                disabled={uploadingCV}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
