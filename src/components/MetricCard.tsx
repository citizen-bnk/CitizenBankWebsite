import { LucideIcon } from "lucide-react";
import { useCurrency } from "components/CurrencyProvider";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  isCurrency?: boolean;
}

export function MetricCard({ icon: Icon, label, value, change, positive = true, isCurrency = false }: Props) {
  const { formatCurrency, convertFromLSL } = useCurrency();
  
  // For currency values: convert from LSL to selected currency, then format
  const displayValue = isCurrency && typeof value === 'number' 
    ? formatCurrency(convertFromLSL(value)) 
    : value;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-[#6d52a2]/10">
          <Icon className="h-5 w-5 text-[#6d52a2]" />
        </div>
        {change && (
          <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
            {positive ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{displayValue}</p>
    </div>
  );
}
