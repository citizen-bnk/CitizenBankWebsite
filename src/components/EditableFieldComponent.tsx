import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Edit2 } from "lucide-react";
import { format } from "date-fns";

export type EditingField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'select';
  currentValue: string | null | undefined;
  selectOptions?: { label: string; value: string }[];
  required?: boolean;
  description?: string;
};

type Props = {
  label: string;
  value: any;
  fieldName: string;
  fieldType?: 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'select';
  required?: boolean;
  selectOptions?: { label: string; value: string }[];
  description?: string;
  onEdit: (field: EditingField) => void;
};

export const EditableFieldComponent = ({
  label,
  value,
  fieldName,
  fieldType = 'text',
  required = false,
  selectOptions,
  description,
  onEdit,
}: Props) => {
  const hasValue = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  };

  const displayValue = hasValue(value) 
    ? (fieldType === 'date' && value ? format(new Date(value), 'PPP') : value)
    : 'Not provided';

  return (
    <div className="group">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </p>
            {hasValue(value) ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
          </div>
          <p className={`text-base mt-1 ${
            !hasValue(value) ? 'text-gray-400 italic' : ''
          }`}>
            {displayValue}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="transition-all hover:bg-gray-100"
          onClick={() => onEdit({
            name: fieldName,
            label,
            type: fieldType,
            currentValue: value,
            selectOptions,
            required,
            description,
          })}
        >
          <Edit2 className="h-4 w-4 text-gray-900" />
        </Button>
      </div>
    </div>
  );
};
