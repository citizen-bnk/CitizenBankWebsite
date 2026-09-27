import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ProfilePictureUpload from "components/ProfilePictureUpload";
import { apiClient } from "app";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Edit, X, Check } from "lucide-react";
import { clearNotificationCache } from "utils/useNotifications";
import { useUser } from "@stackframe/react";

interface Props {
  bio: string | null;
  profilePictureUrl: string | null;
  onUpdate: () => void;
}

export const BoardMemberProfileSection = ({ bio, profilePictureUrl, onUpdate }: Props) => {
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
        <CardTitle>Board Member Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture Upload */}
        <div className="flex justify-center">
          <ProfilePictureUpload
            currentPictureUrl={profilePictureUrl}
            userName="Board Member"
            onUploadSuccess={(newUrl) => {
              toast.success("Profile picture updated");
              onUpdate();
            }}
          />
        </div>

        {/* Bio Section */}
        <div className="space-y-3">
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
                        {bio ? "Regenerate" : "Generate AI Bio"}
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
            <Textarea
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
              placeholder="Write a professional bio paragraph (3-4 sentences) introducing yourself to other users..."
              className="min-h-[120px] text-sm"
              maxLength={500}
            />
          ) : bio ? (
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg border border-border">
              {bio}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center">
              Click "Generate AI Bio" to create a professional introduction, or click "Edit" to write your own
            </p>
          )}
          
          {isEditing && (
            <p className="text-xs text-muted-foreground text-right">
              {editedBio.length}/500 characters
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
