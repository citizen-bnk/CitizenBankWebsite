import { useCurrency } from "components/CurrencyProvider";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DualCurrencyDisplayProps {
  amount: number;
  showTooltip?: boolean;
  className?: string;
}

/**
 * Displays an amount in the user's selected currency with optional LSL equivalent tooltip
 * For authenticated pages where users want to see both their local currency and LSL base
 */
export function DualCurrencyDisplay({ amount, showTooltip = true, className = "" }: DualCurrencyDisplayProps) {
  const { formatCurrency, selectedCurrency, convertFromLSL } = useCurrency();

  // If user is viewing in LSL, just show the amount normally
  if (selectedCurrency === "LSL") {
    return <span className={className}>{formatCurrency(amount)}</span>;
  }

  // Show converted amount with LSL tooltip
  const displayAmount = formatCurrency(amount);
  const lslEquivalent = `≈ L ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LSL`;

  if (!showTooltip) {
    return <span className={className}>{displayAmount}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${className} cursor-help underline decoration-dotted`}>
            {displayAmount}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{lslEquivalent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Shows both currencies inline for transparency
 * Example: "$1,234.56 (≈ L 1,000.00)"
 */
export function DualCurrencyInline({ amount, className = "" }: DualCurrencyDisplayProps) {
  const { formatCurrency, selectedCurrency } = useCurrency();

  // If user is viewing in LSL, just show the amount normally
  if (selectedCurrency === "LSL") {
    return <span className={className}>{formatCurrency(amount)}</span>;
  }

  const displayAmount = formatCurrency(amount);
  const lslEquivalent = `L ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <span className={className}>
      {displayAmount} <span className="text-muted-foreground text-sm">(≈ {lslEquivalent})</span>
    </span>
  );
}
