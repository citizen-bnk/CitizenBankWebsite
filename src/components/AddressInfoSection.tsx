import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { EditableFieldComponent, type EditingField } from "components/EditableFieldComponent";

type UserProfile = {
  street_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
};

type Props = {
  profile: UserProfile;
  onEditField: (field: EditingField) => void;
};

export const AddressInfoSection = ({ profile, onEditField }: Props) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <CardTitle>Address Information</CardTitle>
        </div>
        <CardDescription>Your residential address</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <EditableFieldComponent 
            label="Street Address" 
            value={profile.street_address} 
            fieldName="street_address" 
            fieldType="textarea"
            required 
            onEdit={onEditField}
          />
        </div>
        <EditableFieldComponent 
          label="City" 
          value={profile.city} 
          fieldName="city" 
          required 
          onEdit={onEditField}
        />
        <EditableFieldComponent 
          label="State/Province" 
          value={profile.state_province} 
          fieldName="state_province" 
          onEdit={onEditField}
        />
        <EditableFieldComponent 
          label="Postal Code" 
          value={profile.postal_code} 
          fieldName="postal_code" 
          onEdit={onEditField}
        />
        <EditableFieldComponent 
          label="Country" 
          value={profile.country} 
          fieldName="country" 
          required 
          onEdit={onEditField}
        />
      </CardContent>
    </Card>
  );
};
