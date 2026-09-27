import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";
import { format } from "date-fns";

type UserProfile = {
  account_type: string;
  status: string;
  created_at: string;
  user_id: string;
};

type Props = {
  profile: UserProfile;
};

export const AccountStatusCard = ({ profile }: Props) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Account Status</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Account Type</p>
          <Badge variant="default" className="mt-1 capitalize">
            {profile.account_type}
          </Badge>
        </div>
        <Separator />
        <div>
          <p className="text-sm font-medium text-gray-500">Status</p>
          <Badge 
            variant={profile.status === 'active' ? 'default' : 'secondary'}
            className="mt-1 capitalize"
          >
            {profile.status}
          </Badge>
        </div>
        <Separator />
        <div>
          <p className="text-sm font-medium text-gray-500">Member Since</p>
          <p className="text-base mt-1">
            {format(new Date(profile.created_at), 'MMMM yyyy')}
          </p>
        </div>
        <Separator />
        <div>
          <p className="text-sm font-medium text-gray-500">User ID</p>
          <p className="text-xs mt-1 font-mono text-gray-600 break-all">
            {profile.user_id}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
