import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { EditableFieldComponent, type EditingField } from "components/EditableFieldComponent";

type UserProfile = {
  business_name?: string;
  company_registration_number?: string;
  tax_id?: string;
};

type Props = {
  profile: UserProfile;
  onEditField: (field: EditingField) => void;
};

export const BusinessInfoSection = ({ profile, onEditField }: Props) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Business Information</CardTitle>
        </div>
        <CardDescription>Your business account details</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <EditableFieldComponent 
          label="Business Name" 
          value={profile.business_name} 
          fieldName="business_name" 
          required 
          onEdit={onEditField}
        />
        <EditableFieldComponent 
          label="Company Registration" 
          value={profile.company_registration_number} 
          fieldName="company_registration_number" 
          required 
          onEdit={onEditField}
        />
        <EditableFieldComponent 
          label="Tax ID" 
          value={profile.tax_id} 
          fieldName="tax_id" 
          onEdit={onEditField}
        />
      </CardContent>
    </Card>
  );
};
