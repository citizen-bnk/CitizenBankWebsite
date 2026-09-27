import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, TrendingUp, Target, Lightbulb, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { apiClient } from "app";
import { toast } from 'sonner';

interface InvestmentRecommendation {
  recommendation_type: string;
  title: string;
  description: string;
  rationale: string;
  priority: string;
  action_items: string[];
}

interface RecommendationsResponse {
  user_id: string;
  risk_tolerance: string;
  recommendations: InvestmentRecommendation[];
  generated_at: string;
}

interface RiskAssessment {
  user_id: string;
  risk_score: number;
  risk_level: string;
  diversification_score: number;
  concentration_risk: boolean;
  factors: Array<{ factor: string; value: string }>;
  suggestions: string[];
}

interface ReinvestmentSettings {
  user_id: string;
  auto_reinvest: boolean;
  risk_tolerance: string;
  investment_goals?: string;
  notification_preferences: {
    dividend_alerts: boolean;
    performance_reports: boolean;
  };
  updated_at: string;
}

export function InvestmentRecommendations() {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [settings, setSettings] = useState<ReinvestmentSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load recommendations
      const recResponse = await apiClient.get_investment_recommendations();
      const recData = await recResponse.json();
      setRecommendations(recData);

      // Load risk assessment
      const riskResponse = await apiClient.get_risk_assessment();
      const riskData = await riskResponse.json();
      setRiskAssessment(riskData);

      // Load settings
      const settingsResponse = await apiClient.get_reinvest_settings();
      const settingsData = await settingsResponse.json();
      setSettings(settingsData);
    } catch (error: any) {
      console.error('Failed to load recommendations:', error);
      toast.error('Failed to load investment recommendations');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updatedSettings: Partial<ReinvestmentSettings>) => {
    if (!settings) return;

    try {
      setSavingSettings(true);
      const response = await apiClient.update_reinvest_settings({
        auto_reinvest: updatedSettings.auto_reinvest ?? settings.auto_reinvest,
        risk_tolerance: updatedSettings.risk_tolerance ?? settings.risk_tolerance,
        investment_goals: updatedSettings.investment_goals ?? settings.investment_goals,
        notification_preferences: updatedSettings.notification_preferences ?? settings.notification_preferences
      });
      const data = await response.json();
      setSettings(data);
      toast.success('Settings updated successfully');
      
      // Reload recommendations after settings change
      await loadData();
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <Lightbulb className="h-5 w-5 text-blue-600" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'high':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Assessment Card */}
      {riskAssessment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Portfolio Risk Assessment
            </CardTitle>
            <CardDescription>Your current risk profile and diversification analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Risk Score</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${getRiskLevelColor(riskAssessment.risk_level)}`}>
                    {riskAssessment.risk_score.toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">/ 100</p>
                </div>
                <Badge className={`mt-2 ${getPriorityColor(riskAssessment.risk_level)}`}>
                  {riskAssessment.risk_level.toUpperCase()} RISK
                </Badge>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Diversification</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">
                    {riskAssessment.diversification_score.toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">/ 100</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {riskAssessment.diversification_score >= 75 ? 'Well diversified' :
                   riskAssessment.diversification_score >= 50 ? 'Moderately diversified' :
                   'Limited diversification'}
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Concentration Risk</p>
                <p className={`text-3xl font-bold ${
                  riskAssessment.concentration_risk ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                  {riskAssessment.concentration_risk ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {riskAssessment.concentration_risk ? 'Portfolio is concentrated' : 'Portfolio is balanced'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Risk Factors</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {riskAssessment.factors.map((factor, idx) => (
                  <div key={idx} className="flex justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm text-muted-foreground">{factor.factor}</span>
                    <span className="text-sm font-medium">{factor.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {riskAssessment.suggestions.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Suggestions</h4>
                <ul className="space-y-2">
                  {riskAssessment.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reinvestment Settings */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Dividend Reinvestment Settings</CardTitle>
            <CardDescription>Configure your dividend and investment preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-reinvest">Automatic Dividend Reinvestment</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically reinvest dividends into more shares
                </p>
              </div>
              <Switch
                id="auto-reinvest"
                checked={settings.auto_reinvest}
                onCheckedChange={(checked) => updateSettings({ auto_reinvest: checked })}
                disabled={savingSettings}
              />
            </div>

            <div className="space-y-2">
              <Label>Risk Tolerance</Label>
              <div className="grid grid-cols-3 gap-2">
                {['conservative', 'moderate', 'aggressive'].map((tolerance) => (
                  <Button
                    key={tolerance}
                    variant={settings.risk_tolerance === tolerance ? 'default' : 'outline'}
                    onClick={() => updateSettings({ risk_tolerance: tolerance })}
                    disabled={savingSettings}
                    className="capitalize"
                  >
                    {tolerance}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Your risk tolerance helps us provide tailored investment recommendations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Investment Goals (Optional)</Label>
              <Textarea
                id="goals"
                value={settings.investment_goals || ''}
                onChange={(e) => setSettings({ ...settings, investment_goals: e.target.value })}
                placeholder="Describe your investment goals and objectives..."
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => updateSettings({ investment_goals: settings.investment_goals })}
                disabled={savingSettings}
              >
                Save Goals
              </Button>
            </div>

            <div className="space-y-3">
              <Label>Notification Preferences</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dividend-alerts" className="font-normal">
                    Dividend Payment Alerts
                  </Label>
                  <Switch
                    id="dividend-alerts"
                    checked={settings.notification_preferences.dividend_alerts}
                    onCheckedChange={(checked) => updateSettings({
                      notification_preferences: {
                        ...settings.notification_preferences,
                        dividend_alerts: checked
                      }
                    })}
                    disabled={savingSettings}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="performance-reports" className="font-normal">
                    Monthly Performance Reports
                  </Label>
                  <Switch
                    id="performance-reports"
                    checked={settings.notification_preferences.performance_reports}
                    onCheckedChange={(checked) => updateSettings({
                      notification_preferences: {
                        ...settings.notification_preferences,
                        performance_reports: checked
                      }
                    })}
                    disabled={savingSettings}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Recommendations */}
      {recommendations && recommendations.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Investment Recommendations
            </CardTitle>
            <CardDescription>
              AI-powered insights based on your {recommendations.risk_tolerance} risk profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.recommendations.map((rec, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getPriorityIcon(rec.priority)}
                    <div>
                      <h4 className="font-semibold">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority.toUpperCase()}
                  </Badge>
                </div>

                <div className="pl-8">
                  <p className="text-sm mb-2">
                    <span className="font-medium">Why: </span>
                    {rec.rationale}
                  </p>

                  {rec.action_items.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Action Items:</p>
                      <ul className="space-y-1">
                        {rec.action_items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recommendations && recommendations.recommendations.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600 dark:text-green-400" />
              <p className="font-medium text-lg mb-2">Your portfolio looks great!</p>
              <p className="text-sm">No immediate recommendations at this time.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
