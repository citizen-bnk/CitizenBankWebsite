import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export interface Props {
  fullName: string;
  onBackClick: () => void;
}

export function ProfileHeader({ 
  fullName,
  onBackClick 
}: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-6">
        {/* Title and Description */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account information for {fullName}</p>
        </div>
        
        {/* Back Button */}
        <Button onClick={onBackClick} variant="outline">
          <Home className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </div>
  );
}
