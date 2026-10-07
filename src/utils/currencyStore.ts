import { create } from "zustand";
import brain from "brain";
import { GeolocationResponse } from "types";

// LocalStorage key for currency preference
const CURRENCY_PREFERENCE_KEY = 'citizen-bank-currency-preference';

// Map country codes to currencies
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  LS: "LSL", // Lesotho
  ZA: "ZAR", // South Africa
  US: "USD", // United States
  GB: "GBP", // United Kingdom
  // EU countries
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", PT: "EUR",
  NL: "EUR", BE: "EUR", AT: "EUR", IE: "EUR", GR: "EUR",
  FI: "EUR", LU: "EUR", SI: "EUR", CY: "EUR", MT: "EUR",
  SK: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", HR: "EUR",
};

interface CurrencyState {
  detectedCurrency: string;
  selectedCurrency: string;
  detectedCountry: string | null;
  rates: Record<string, number>;
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  detectLocation: () => Promise<void>;
  setSelectedCurrency: (currency: string) => void;
  fetchRates: () => Promise<void>;
  formatCurrency: (amount: number, currency?: string) => string;
  convertFromLSL: (amountInLSL: number, toCurrency?: string) => number;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  detectedCurrency: "LSL",
  selectedCurrency: "LSL",
  detectedCountry: null,
  rates: { 
    LSL: 1.0,
    ZAR: 1.0  // ZAR and LSL are typically at parity
  },
  lastUpdated: null,
  isLoading: false,
  error: null,

  // Detect user location and set currency
  detectLocation: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      // First, check localStorage for saved preference
      const savedCurrency = localStorage.getItem(CURRENCY_PREFERENCE_KEY);
      if (savedCurrency) {
        console.log(`Using saved currency preference: ${savedCurrency}`);
        set({
          selectedCurrency: savedCurrency,
          isLoading: false,
        });
        return;
      }

      let countryCode = "LS"; // Home currency when detection is unavailable
      let detectionMethod = "default";

      // Try IP-based detection first
      try {
        // Pass empty string - backend will detect IP from request
        const response = await brain.lookup_ip({ ip_address: "" });
        const data: GeolocationResponse = await response.json();
        if (data.country_code) {
          countryCode = data.country_code;
          detectionMethod = "IP";
          console.log(`Location detected via IP: ${countryCode}`);
        }
      } catch {
        // Location is optional. Preserve the home currency without requesting
        // precise location or transmitting coordinates to another service.
      }

      const currency = COUNTRY_TO_CURRENCY[countryCode] || "LSL";
      console.log(`Currency set to ${currency} based on country ${countryCode} (${detectionMethod} detection)`);

      set({
        detectedCurrency: currency,
        selectedCurrency: currency,
        detectedCountry: countryCode,
        isLoading: false,
      });
    } catch (error) {
      console.error("Location detection error:", error);
      set({
        error: "Failed to detect location",
        isLoading: false,
        selectedCurrency: "LSL", // Preserve home currency
      });
    }
  },

  // Set user's preferred currency and save to localStorage
  setSelectedCurrency: (currency: string) => {
    set({ selectedCurrency: currency });
    localStorage.setItem(CURRENCY_PREFERENCE_KEY, currency);
    console.log(`Currency preference saved: ${currency}`);
  },

  // Fetch the latest exchange rates from our backend
  fetchRates: async () => {
    if (get().isLoading) return;
    
    // Check sessionStorage first - load once per browser session
    const SESSION_KEY = 'citizen_bank_exchange_rates';
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      try {
        const { rates, lastUpdated } = JSON.parse(cached);
        console.log(`✅ Using cached exchange rates from session (${Object.keys(rates).length} currencies)`);
        set({ rates, lastUpdated, error: null });
        return;
      } catch (parseError) {
        console.warn('Failed to parse cached rates, fetching fresh:', parseError);
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    
    set({ isLoading: true, error: null });
    try {
      // Fetch from our new exchange rates API
      const response = await brain.get_current_rates();
      const data = await response.json();
      
      if (data.rates) {
        const ratesData = {
          rates: data.rates,
          lastUpdated: data.date || new Date().toISOString()
        };
        
        // Store in sessionStorage for this browser session
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(ratesData));
        
        set({
          rates: data.rates,
          lastUpdated: data.date || new Date().toISOString(),
          error: null,
        });
        console.log(`✅ Exchange rates fetched from backend: ${Object.keys(data.rates).length} currencies`);
        console.log(`📅 Rates dated: ${data.date}`);
      } else {
        throw new Error("Rates data is missing in the API response.");
      }
    } catch (error) {
      console.error("❌ Failed to fetch exchange rates from backend:", error);
      
      // If backend rates not available, try fallback to old API
      try {
        console.log("⚠️ Attempting fallback to legacy rate API...");
        const fallbackResponse = await brain.get_all_rates();
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.rates) {
          const fallbackRatesData = {
            rates: fallbackData.rates,
            lastUpdated: fallbackData.time_last_update_utc
          };
          
          // Store fallback in sessionStorage too
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(fallbackRatesData));
          
          set({
            rates: fallbackData.rates,
            lastUpdated: fallbackData.time_last_update_utc,
            error: null,
          });
          console.log(`✅ Fallback rates fetched: ${Object.keys(fallbackData.rates).length} currencies`);
        } else {
          throw new Error("Fallback rates also unavailable");
        }
      } catch (fallbackError) {
        console.error("❌ Fallback rates also failed:", fallbackError);
        set({
          error: "Failed to fetch exchange rates. Using default rates.",
          // Use hardcoded fallback rates
          rates: {
            LSL: 1.0,
            ZAR: 1.0,  // LSL and ZAR are typically at parity
            USD: 0.0556,  // Approximate
            EUR: 0.0500,  // Approximate
            GBP: 0.0435,  // Approximate
          },
          lastUpdated: new Date().toISOString(),
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // Format an amount into a currency string (e.g., "$1,234.56")
  formatCurrency: (amount: number, currency?: string) => {
    const targetCurrency = currency || get().selectedCurrency;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: targetCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (e) {
      // Fallback for invalid currency codes
      return `${targetCurrency} ${amount.toFixed(2)}`;
    }
  },

  // Convert an amount from LSL to another currency
  convertFromLSL: (amountInLSL: number, toCurrency?: string) => {
    const targetCurrency = toCurrency || get().selectedCurrency;
    const { rates } = get();
    
    // If converting to LSL, return as-is
    if (targetCurrency === "LSL") {
      return amountInLSL;
    }
    
    // Get the rate for the target currency
    const rate = rates[targetCurrency];
    if (!rate) {
      // Silently fallback to LSL if rate not available
      return amountInLSL;
    }
    
    // Convert: LSL amount * rate = target currency amount
    return amountInLSL * rate;
  },
}));
