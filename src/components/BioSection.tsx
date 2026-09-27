import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "app";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Edit, X, Check, User } from "lucide-react";
import ProfilePictureUpload from "components/ProfilePictureUpload";
import { clearNotificationCache } from "utils/useNotifications";
import { useUser } from "@stackframe/react";

interface Props {
  bio: string | null;
  profilePictureUrl?: string | null;
  userName: string;
  onUpdate: () => void;
  onPictureUploadSuccess: (newUrl: string) => void;
}

export const BioSection = ({ bio, profilePictureUrl, userName, onUpdate, onPictureUploadSuccess }: Props) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerateBio = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.generate_bio_for_user();
      const data = await response.json();
      
      if (data.success) {
        toast.success("Bio generated successfully!");
        onUpdate();
      }
    } catch (error) {
      console.error("Error generating bio:", error);
      toast.error("Failed to generate bio. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditBio = () => {
    setEditedBio(bio || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedBio(bio || "");
    setIsEditing(false);
  };

  const handleSaveBio = async () => {
    setIsSaving(true);
    try {
      const response = await apiClient.update_user_profile({
        bio: editedBio || null,
      });

      if (response.ok) {
        toast.success("Bio updated successfully!");
        setIsEditing(false);
        onUpdate();
        clearNotificationCache();
      } else {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to update bio");
      }
    } catch (error) {
      console.error("Error saving bio:", error);
      toast.error("Failed to save bio. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle>About Me</CardTitle>
        </div>
        <CardDescription>
          Your professional bio and profile picture to introduce yourself to other users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Profile Picture on left, Bio on right - same row */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Picture Section - Left side */}
          <div className="flex-shrink-0">
            <ProfilePictureUpload
              currentPictureUrl={profilePictureUrl}
              userName={userName}
              onUploadSuccess={onPictureUploadSuccess}
            />
          </div>

          {/* Bio Section - Right side */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Bio</h3>
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    <Button
                      onClick={handleEditBio}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      onClick={handleGenerateBio}
                      disabled={isGenerating}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          {bio ? "Regenerate AI" : "Generate AI Bio"}
                        </>
                      )}
                    </Button>
                  </>
                )}
                {isEditing && (
                  <>
                    <Button
                      onClick={handleCancelEdit}
                      size="sm"
                      variant="ghost"
                      className="gap-2"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveBio}
                      disabled={isSaving}
                      size="sm"
                      variant="default"
                      className="gap-2"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Save
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {isEditing ? (
              <>
                <Textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  placeholder="Write a professional bio paragraph (3-4 sentences) introducing yourself to other users..."
                  className="min-h-[120px] text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {editedBio.length}/500 characters
                </p>
              </>
            ) : bio ? (
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border border-border">
                {bio}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center">
                Click "Generate AI Bio" to create a professional introduction, or click "Edit" to write your own
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
