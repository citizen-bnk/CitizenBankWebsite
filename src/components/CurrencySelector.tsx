import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "components/CurrencyProvider";

// Currency display names and symbols
const CURRENCY_INFO: Record<string, { symbol: string; name: string }> = {
  LSL: { symbol: "L", name: "Lesotho Loti" },
  ZAR: { symbol: "R", name: "South African Rand" },
  USD: { symbol: "$", name: "US Dollar" },
  GBP: { symbol: "£", name: "British Pound" },
  EUR: { symbol: "€", name: "Euro" },
};

const CurrencySelector: React.FC = () => {
  const { rates, selectedCurrency, setSelectedCurrency, isLoading } = useCurrency();

  if (isLoading && Object.keys(rates).length === 0) {
    return <div className="text-xs text-gray-500">Loading...</div>;
  }

  const supportedCurrencies = Object.keys(rates).filter(currency => 
    ['LSL', 'ZAR', 'USD', 'GBP', 'EUR'].includes(currency)
  );

  const handleValueChange = (value: string) => {
    setSelectedCurrency(value);
  };

  const getDisplayValue = (currency: string) => {
    const info = CURRENCY_INFO[currency];
    return info ? `${info.symbol} ${currency}` : currency;
  };

  return (
    <Select onValueChange={handleValueChange} value={selectedCurrency}>
      <SelectTrigger className="w-[110px] bg-white border-gray-300 dark:border-gray-700 text-sm">
        <SelectValue placeholder="Currency">
          {getDisplayValue(selectedCurrency)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {supportedCurrencies.map((currency) => {
          const info = CURRENCY_INFO[currency] || { symbol: currency, name: currency };
          return (
            <SelectItem key={currency} value={currency}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{info.symbol}</span>
                <span>{currency}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
