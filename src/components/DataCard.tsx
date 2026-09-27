import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useCurrency } from "components/CurrencyProvider";

interface DataField {
  label: string;
  value: string | number | React.ReactNode;
  isCurrency?: boolean;
  icon?: LucideIcon;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
}

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  icon?: LucideIcon;
}

interface Props {
  title: string | React.ReactNode;
  subtitle?: string;
  fields: DataField[];
  actions?: ActionButton[];
  badge?: React.ReactNode | {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  className?: string;
  onClick?: () => void;
}

export function DataCard({ title, subtitle, fields, actions, badge, className, onClick }: Props) {
  const isClickable = !!onClick;
  const { formatCurrency } = useCurrency();

  return (
    <Card 
      className={`
        ${className || ''} 
        ${isClickable ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : ''}
      `}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {badge && (
            <div className="ml-2">
              {typeof badge === 'object' && 'text' in badge ? (
                <Badge variant={badge.variant || "default"}>
                  {badge.text}
                </Badge>
              ) : (
                badge
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Data Fields */}
        <div className="space-y-2">
          {(fields || []).map((field, index) => (
            <div key={index} className="flex items-start justify-between py-1">
              <div className="flex items-center gap-2">
                {field.icon && <field.icon className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">{field.label}:</span>
              </div>
              <div className="flex items-center gap-2 ml-2">
                {typeof field.value === 'string' || typeof field.value === 'number' ? (
                  <span className="text-sm font-medium text-right">
                    {field.isCurrency && typeof field.value === 'number' ? formatCurrency(field.value) : field.value}
                  </span>
                ) : (
                  field.value
                )}
                {field.badge && (
                  <Badge variant={field.badge.variant || "secondary"} className="text-xs">
                    {field.badge.text}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outline"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className="flex-1 min-w-[100px]"
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
