import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  roles: string[];
};

export const UserRolesCard = ({ roles }: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Roles</CardTitle>
      </CardHeader>
      <CardContent>
        {roles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role} variant="outline" className="capitalize">
                {role.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No roles assigned</p>
        )}
      </CardContent>
    </Card>
  );
};
