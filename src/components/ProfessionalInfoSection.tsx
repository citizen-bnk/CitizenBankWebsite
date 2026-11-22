import {ProfileCV} from './ProfileCV';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ExternalLink } from "lucide-react";
import { EditableFieldComponent, type EditingField } from "components/EditableFieldComponent";
import type { UserProfileResponse } from 'types';

type Props = {
  profile: UserProfileResponse;
  onEditField: (field: EditingField) => void;
  onUpdate: () => void;
};

export const ProfessionalInfoSection = ({ profile, onEditField, onUpdate }: Props) => {

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle>Professional Information</CardTitle>
        </div>
        <CardDescription>Your employment details and professional profile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <EditableFieldComponent 
            label="Occupation" 
            value={profile.occupation} 
            fieldName="occupation" 
            onEdit={onEditField}
          />
          <EditableFieldComponent 
            label="Employer" 
            value={profile.employer} 
            fieldName="employer" 
            onEdit={onEditField}
          />
        </div>

        {/* LinkedIn Profile */}
        <div className="space-y-2">
          <EditableFieldComponent 
            label="LinkedIn Profile" 
            value={profile.linkedin_profile} 
            fieldName="linkedin_profile" 
            description="Your LinkedIn profile URL (e.g., https://linkedin.com/in/yourname)"
            onEdit={onEditField}
          />
          {profile.linkedin_profile && (
            <a 
              href={profile.linkedin_profile}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View LinkedIn Profile
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <ProfileCV profile={profile} onUpdate={onUpdate}/>
      </CardContent>
    </Card>
  );
};
