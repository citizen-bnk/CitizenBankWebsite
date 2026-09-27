import { format } from "date-fns";

type Props = {
  label: string;
  value: any;
};

export const ReadOnlyFieldComponent = ({ label, value }: Props) => {
  const hasValue = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-base mt-1">
        {hasValue(value) 
          ? (value instanceof Date ? format(value, 'PPP') : value)
          : 'Not provided'
        }
      </p>
    </div>
  );
};
