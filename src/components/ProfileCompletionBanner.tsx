import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

type Props = {
  completionPercentage: number;
};

export const ProfileCompletionBanner = ({ completionPercentage }: Props) => {
  if (completionPercentage >= 100) {
    return null; // Don't show banner when profile is complete
  }

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-900">
                Profile {completionPercentage}% Complete
              </p>
              <p className="text-sm text-orange-700">
                Complete your profile to access all features
              </p>
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {completionPercentage}%
          </div>
        </div>
        <div className="w-full bg-orange-200 rounded-full h-2 mt-4">
          <div 
            className="h-2 rounded-full bg-orange-600 transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
