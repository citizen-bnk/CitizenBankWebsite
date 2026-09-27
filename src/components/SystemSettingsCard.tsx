import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const SystemSettingsCard = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">System Settings</CardTitle>
        <CardDescription>Manage your preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={() => navigate('/notification-preferences')} 
          variant="outline" 
          className="w-full justify-start"
        >
          <Mail className="h-4 w-4 mr-2" />
          Notification Preferences
        </Button>
        <Button 
          onClick={() => navigate('/security-tips')} 
          variant="outline" 
          className="w-full justify-start"
        >
          <Shield className="h-4 w-4 mr-2" />
          Security Settings
        </Button>
      </CardContent>
    </Card>
  );
};
