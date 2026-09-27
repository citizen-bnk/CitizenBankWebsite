import { CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  action_url?: string | null;
  action_label?: string | null;
}

export interface OnboardingStatus {
  overall_complete: boolean;
  completion_percentage: number;
  steps: OnboardingStep[];
  next_step?: string | null;
}

interface Props {
  status: OnboardingStatus;
  loading?: boolean;
}

export function OnboardingWizard({ status, loading = false }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Your Onboarding Progress...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStepIcon = (step: OnboardingStep, index: number) => {
    if (step.completed) {
      return <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />;
    }
    if (status.next_step === step.key) {
      return <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-500" />;
    }
    return <Circle className="w-6 h-6 text-gray-400 dark:text-gray-600" />;
  };

  const getStepStatus = (step: OnboardingStep) => {
    if (step.completed) return 'Completed';
    if (status.next_step === step.key) return 'In Progress';
    return 'Pending';
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">
              {status.overall_complete ? '🎉 Onboarding Complete!' : 'Welcome! Complete Your Onboarding'}
            </CardTitle>
            <CardDescription className="mt-2">
              {status.overall_complete
                ? 'You have completed all required onboarding steps. Welcome to the board!'
                : 'Follow these steps to get started as a board member'}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{status.completion_percentage}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>
        <Progress value={status.completion_percentage} className="mt-4" />
      </CardHeader>

      <CardContent>
        {!status.overall_complete && status.next_step && (
          <Alert className="mb-6 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
            <AlertDescription className="text-orange-900 dark:text-orange-100">
              <strong>Next Step:</strong> {status.steps.find(s => s.key === status.next_step)?.title}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {status.steps.map((step, index) => (
            <div
              key={step.key}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                step.completed
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  : status.next_step === step.key
                  ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                  : 'bg-card border-border'
              }`}
            >
              {/* Step Number/Icon */}
              <div className="flex-shrink-0 mt-1">
                {getStepIcon(step, index)}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">
                    {index + 1}. {step.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      step.completed
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : status.next_step === step.key
                        ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {getStepStatus(step)}
                  </span>
                  {step.required && !step.completed && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>

              {/* Action Button */}
              {!step.completed && step.action_url && step.action_label && (
                <div className="flex-shrink-0">
                  <Button
                    onClick={() => navigate(step.action_url!)}
                    size="sm"
                    className={status.next_step === step.key ? 'bg-orange-600 hover:bg-orange-700' : ''}
                  >
                    {step.action_label}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Completed Checkmark */}
              {step.completed && (
                <div className="flex-shrink-0 text-green-600 dark:text-green-500 font-medium text-sm">
                  ✓ Done
                </div>
              )}
            </div>
          ))}
        </div>

        {status.overall_complete && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-center">
            <p className="text-green-900 dark:text-green-100 font-medium">
              🎊 Congratulations! You're all set to participate as a board member.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
