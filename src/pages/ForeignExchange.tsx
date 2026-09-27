import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { useCurrency } from "components/CurrencyProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, TrendingUp, Globe, Bitcoin } from "lucide-react";
import { ExchangeRateDisclaimer } from "components/CurrencyIndicator";
import { Separator } from "@/components/ui/separator";

export default function ForeignExchange() {
  const { rates, selectedCurrency } = useCurrency();

  const baseCurrency = "LSL";
  const currencies = [
    { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
    { code: "USD", name: "US Dollar", flag: "🇺🇸" },
    { code: "GBP", name: "British Pound", flag: "🇬🇧" },
    { code: "EUR", name: "Euro", flag: "🇪🇺" },
  ];

  const cryptoCurrencies = [
    { code: "BTC", name: "Bitcoin", icon: "₿", color: "text-orange-500" },
    { code: "ETH", name: "Ethereum", icon: "Ξ", color: "text-blue-500" },
    { code: "USDT", name: "Tether", icon: "₮", color: "text-green-500" },
    { code: "BNB", name: "Binance Coin", icon: "Ⓑ", color: "text-yellow-500" },
  ];

  const getExchangeRate = (currency: string) => {
    return rates?.[currency] || 1;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-12 sm:py-16 md:py-20 pt-[calc(88px+3rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+5rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-8 w-8 sm:h-10 sm:w-10" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Foreign Exchange Services</h1>
            </div>
            <p className="text-base sm:text-lg md:text-xl text-white/90">
              Access competitive foreign exchange rates for international transactions and currency conversion
            </p>
          </div>
        </div>
      </section>

      {/* Live Fiat Exchange Rates */}
      <section className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Live Fiat Exchange Rates</h2>
          <p className="text-sm sm:text-base text-gray-600">Current exchange rates for Lesotho Loti (LSL)</p>
          <ExchangeRateDisclaimer />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {currencies.map((currency) => {
            const rate = getExchangeRate(currency.code);
            return (
              <Card key={currency.code} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-3xl sm:text-4xl">{currency.flag}</span>
                    <ArrowRightLeft className="h-5 w-5 text-[#6d52a2]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Currency</p>
                      <p className="font-semibold text-sm sm:text-base text-gray-900">{currency.name}</p>
                      <p className="text-xs text-gray-500">{currency.code}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs sm:text-sm text-gray-600">Exchange Rate</p>
                      <p className="text-xl sm:text-2xl font-bold text-[#6d52a2]">
                        {rate.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500">
                        1 {baseCurrency} = {rate.toFixed(4)} {currency.code}
                      </p>
                    </div>
                    <div className="pt-2">
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>Live Rate</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Cryptocurrency Exchange Rates */}
        <Separator className="my-8 sm:my-12" />
        
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Bitcoin className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Live Cryptocurrency Rates</h2>
          </div>
          <p className="text-sm sm:text-base text-gray-600">Current crypto exchange rates for Lesotho Loti (LSL)</p>
          <ExchangeRateDisclaimer />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {cryptoCurrencies.map((crypto) => {
            const rate = getExchangeRate(crypto.code);
            const isAvailable = rate && rate !== 1;
            
            return (
              <Card key={crypto.code} className={`hover:shadow-lg transition-shadow ${
                !isAvailable ? 'opacity-60' : ''
              }`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className={`text-3xl sm:text-4xl font-bold ${crypto.color}`}>{crypto.icon}</span>
                    <ArrowRightLeft className="h-5 w-5 text-[#6d52a2]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Cryptocurrency</p>
                      <p className="font-semibold text-sm sm:text-base text-gray-900">{crypto.name}</p>
                      <p className="text-xs text-gray-500">{crypto.code}</p>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs sm:text-sm text-gray-600">Exchange Rate</p>
                      {isAvailable ? (
                        <>
                          <p className={`text-xl sm:text-2xl font-bold ${crypto.color}`}>
                            {rate < 0.01 ? rate.toFixed(8) : rate.toFixed(4)}
                          </p>
                          <p className="text-xs text-gray-500">
                            1 {baseCurrency} = {rate < 0.01 ? rate.toFixed(8) : rate.toFixed(4)} {crypto.code}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Rate currently unavailable</p>
                      )}
                    </div>
                    <div className="pt-2">
                      {isAvailable ? (
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Live Rate</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-400">
                          <span>Contact bank for rates</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Services Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">International Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-gray-600">
                Send money internationally with competitive exchange rates and low transfer fees.
                Transfers typically complete within 1-3 business days.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Currency Exchange</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-gray-600">
                Exchange foreign currency at our branches. We offer competitive rates for major
                currencies including USD, EUR, GBP, and ZAR.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Cryptocurrency Services</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-gray-600">
                Accept cryptocurrency payments for board member investments. We support Bitcoin (BTC), 
                Ethereum (ETH), Tether (USDT), and BNB for share subscriptions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
