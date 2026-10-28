import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { EditableFieldComponent, type EditingField } from "components/EditableFieldComponent";

type UserProfile = {
  full_name: string;
  id_number?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  citizenship_status?: string;
};

type Props = {
  profile: UserProfile;
  onEditField: (field: EditingField) => void;
  section?: 'basic' | 'identity';
};

export const PersonalInfoSection = ({ profile, onEditField, section = 'basic' }: Props) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle>{section === 'basic' ? 'Personal information' : 'Identity details'}</CardTitle>
        </div>
        <CardDescription>{section === 'basic' ? 'Your name and personal details' : 'Details used for service verification'}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        {section === 'basic' && <EditableFieldComponent
          label="Full Name"
          value={profile.full_name}
          fieldName="full_name"
          required
          onEdit={onEditField}
        />}
        {section === 'identity' && <EditableFieldComponent
          label="ID Number"
          value={profile.id_number}
          fieldName="id_number"
          required
          onEdit={onEditField}
        />}
        <EditableFieldComponent
          label="Date of Birth"
          value={profile.date_of_birth}
          fieldName="date_of_birth"
          fieldType="date"
          onEdit={onEditField}
        />
        <EditableFieldComponent
          label="Gender"
          value={profile.gender}
          fieldName="gender"
          fieldType="select"
          selectOptions={[
            { label: 'Male', value: 'male' },
            { label: 'Female', value: 'female' },
            { label: 'Other', value: 'other' },
            { label: 'Prefer not to say', value: 'prefer_not_to_say' },
          ]}
          onEdit={onEditField}
        />
        {section === 'identity' && <EditableFieldComponent
          label="Nationality"
          value={profile.nationality}
          fieldName="nationality"
          required
          onEdit={onEditField}
        />}
        {section === 'identity' && <EditableFieldComponent
          label="Citizenship Status"
          value={profile.citizenship_status}
          fieldName="citizenship_status"
          fieldType="select"
          selectOptions={[
            { label: 'Citizen', value: 'citizen' },
            { label: 'Permanent Resident', value: 'permanent_resident' },
            { label: 'Temporary Resident', value: 'temporary_resident' },
            { label: 'Work Permit', value: 'work_permit' },
          ]}
          onEdit={onEditField}
        />}
      </CardContent>
    </Card>
  );
};
