import { useState } from "react";
import { Camera, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { apiClient, API_URL } from "app";

export interface Props {
  currentPictureUrl?: string | null;
  userName?: string;
  onUploadSuccess: (newPictureUrl: string) => void;
}

export default function ProfilePictureUpload({ currentPictureUrl, userName, onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast.error("Please select a JPG or PNG image");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    setUploading(true);
    try {
      const response = await apiClient.upload_profile_picture({ file });
      
      if (response.ok) {
        const data = await response.json();
        toast.success("Profile picture updated successfully");
        onUploadSuccess(data.picture_url);
        setPreviewUrl(null);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to upload profile picture");
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error("Failed to upload profile picture");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    document.getElementById("profile-picture-input")?.click();
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Construct full URL if currentPictureUrl is a relative path
  const getFullImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url; // Already a full URL
    if (url.startsWith('/routes/')) {
      // Convert relative API path to full URL
      return `${API_URL}${url.replace('/routes/', '/')}`;
    }
    return url;
  };

  const displayUrl = previewUrl || getFullImageUrl(currentPictureUrl);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
          <AvatarImage src={displayUrl || undefined} alt={userName || "Profile picture"} />
          <AvatarFallback className="bg-primary/10 text-primary text-2xl">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Hover overlay */}
        <div 
          onClick={triggerFileInput}
          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="h-8 w-8 text-white" />
        </div>
      </div>

      <input
        id="profile-picture-input"
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button 
        onClick={triggerFileInput} 
        variant="outline" 
        size="sm"
        disabled={uploading}
        className="text-xs"
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Uploading...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Camera className="h-3 w-3" />
            Change Photo
          </span>
        )}
      </Button>
    </div>
  );
}
