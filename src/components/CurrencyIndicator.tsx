import { useCurrency } from "components/CurrencyProvider";
import { Info, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CurrencyIndicator() {
  const { selectedCurrency, rates, formatCurrency, convertFromLSL } = useCurrency();

  const currencyNames: Record<string, string> = {
    LSL: "Loti",
    ZAR: "South African Rand",
    USD: "US Dollar",
    GBP: "British Pound",
    EUR: "Euro",
  };

  // Sample amount in LSL for conversion tooltip
  const sampleLSL = 1000;
  const convertedAmount = convertFromLSL(sampleLSL);
  const rate = rates?.[selectedCurrency] || 1;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
      <Info className="h-4 w-4" />
      <span>
        Prices shown in <strong>{currencyNames[selectedCurrency] || selectedCurrency}</strong> ({selectedCurrency})
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Globe className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p className="text-sm">
              Rates updated hourly from live markets. All base prices are in Lesotho Loti (LSL).
              Actual exchange rates may vary. For transactions, rates are confirmed at time of payment.
            </p>
            <p className="text-xs mt-2">
              {formatCurrency(convertedAmount)} ≈ L {sampleLSL.toFixed(2)} LSL
            </p>
            {rates && selectedCurrency !== "LSL" && (
              <p className="text-xs text-gray-500">Rate: {rate.toFixed(4)}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function ExchangeRateDisclaimer() {
  return (
    <div className="text-xs text-gray-500 italic mt-2">
      * Indicative rates, loaded once per session. Actual rates may differ at the time of any transaction.
    </div>
  );
}
