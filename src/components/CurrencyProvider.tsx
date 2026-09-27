import React, { createContext, useContext, useEffect, ReactNode } from "react";
import { useCurrencyStore } from "utils/currencyStore";

// Create a context to hold only the stable values and actions
interface CurrencyContextValue {
  selectedCurrency: string;
  detectedCurrency: string;
  rates: Record<string, number>;
  error: string | null;
  setSelectedCurrency: (currency: string) => void;
  formatCurrency: (amount: number, currency?: string) => string;
  convertFromLSL: (amountInLSL: number, toCurrency?: string) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  // Use selective subscription - only subscribe to values we actually expose
  // Do NOT subscribe to isLoading or lastUpdated as they cause unnecessary re-renders
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const detectedCurrency = useCurrencyStore((state) => state.detectedCurrency);
  const rates = useCurrencyStore((state) => state.rates);
  const error = useCurrencyStore((state) => state.error);
  
  // Get actions (these don't cause re-renders)
  const setSelectedCurrency = useCurrencyStore((state) => state.setSelectedCurrency);
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const convertFromLSL = useCurrencyStore((state) => state.convertFromLSL);
  const detectLocation = useCurrencyStore((state) => state.detectLocation);
  const fetchRates = useCurrencyStore((state) => state.fetchRates);

  useEffect(() => {
    // Initialize: detect location and fetch rates on mount
    const initializeAsync = async () => {
      console.log("🌍 CurrencyProvider: Starting initialization...");
      
      try {
        await detectLocation();
        console.log("✅ CurrencyProvider: Location detected");
      } catch (error) {
        console.error("❌ CurrencyProvider: Location detection failed:", error);
      }
      
      // Delay rate fetching by 2 seconds to allow page to load first
      setTimeout(async () => {
        try {
          await fetchRates();
          console.log("✅ CurrencyProvider: Rates loaded (session-cached, delayed 2s)");
        } catch (error) {
          console.error("❌ CurrencyProvider: Rate fetching failed:", error);
        }
      }, 2000); // 2 second delay
    };
    
    initializeAsync();
    
    // No interval - rates load once per session via sessionStorage
  }, []); // Empty dependency array - only run on mount

  // Create stable context value with only the values components need
  const contextValue: CurrencyContextValue = {
    selectedCurrency,
    detectedCurrency,
    rates,
    error,
    setSelectedCurrency,
    formatCurrency,
    convertFromLSL,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Custom hook for easy access to the currency context
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
