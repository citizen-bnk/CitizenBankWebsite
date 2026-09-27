import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EditableFieldComponent, type EditingField } from "components/EditableFieldComponent";

type UserProfile = {
  source_of_funds?: string;
  investor_type?: string;
  investment_purpose?: string;
};

type Props = {
  profile: UserProfile;
  onEditField: (field: EditingField) => void;
};

export const InvestorInfoSection = ({ profile, onEditField }: Props) => {
  const navigate = useNavigate();

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-blue-900">Investor Information</CardTitle>
        </div>
        <CardDescription className="text-blue-700">
          Your investment profile and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <EditableFieldComponent 
          label="Source of Funds" 
          value={profile.source_of_funds} 
          fieldName="source_of_funds"
          fieldType="select"
          selectOptions={[
            { label: 'Salary/Employment Income', value: 'salary' },
            { label: 'Business Revenue', value: 'business_revenue' },
            { label: 'Savings', value: 'savings' },
            { label: 'Investment Returns', value: 'investment_returns' },
            { label: 'Inheritance', value: 'inheritance' },
            { label: 'Gift', value: 'gift' },
            { label: 'Loan', value: 'loan' },
            { label: 'Other', value: 'other' },
          ]}
          description="Where your investment funds originate"
          onEdit={onEditField}
        />
        <EditableFieldComponent 
          label="Investor Type" 
          value={profile.investor_type} 
          fieldName="investor_type"
          fieldType="select"
          selectOptions={[
            { label: 'Individual/Retail', value: 'individual' },
            { label: 'Institutional', value: 'institutional' },
            { label: 'Accredited Investor', value: 'accredited' },
            { label: 'Professional Investor', value: 'professional' },
            { label: 'Qualified Purchaser', value: 'qualified_purchaser' },
          ]}
          description="Your investor classification"
          onEdit={onEditField}
        />
        <div className="sm:col-span-2">
          <EditableFieldComponent 
            label="Investment Purpose" 
            value={profile.investment_purpose} 
            fieldName="investment_purpose"
            fieldType="textarea"
            description="Why you're investing (e.g., retirement, wealth growth, etc.)"
            onEdit={onEditField}
          />
        </div>
        <div className="sm:col-span-2">
          <Button 
            onClick={() => navigate('/my-subscriptions')} 
            className="w-full"
            variant="outline"
          >
            <Wallet className="h-4 w-4 mr-2" />
            View My Subscriptions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
