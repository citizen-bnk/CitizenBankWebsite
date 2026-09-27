import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { EditableFieldComponent, type EditingField } from "components/EditableFieldComponent";
import { ReadOnlyFieldComponent } from "components/ReadOnlyFieldComponent";

type UserProfile = {
  email: string;
  phone: string;
  email_verified?: boolean;
  mobile_verified?: boolean;
};

type Props = {
  profile: UserProfile;
  onEditField: (field: EditingField) => void;
};

export const ContactInfoSection = ({ profile, onEditField }: Props) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle>Contact Information</CardTitle>
        </div>
        <CardDescription>How we can reach you</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ReadOnlyFieldComponent label="Email Address" value={profile.email} />
          <div className="flex items-center gap-2 mt-1">
            {profile.email_verified ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Verified
              </Badge>
            )}
          </div>
        </div>
        <div className="sm:col-span-2">
          <EditableFieldComponent 
            label="Phone Number" 
            value={profile.phone} 
            fieldName="phone" 
            fieldType="tel"
            required 
            onEdit={onEditField}
          />
          <div className="flex items-center gap-2 mt-1">
            {profile.mobile_verified ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Verified
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
