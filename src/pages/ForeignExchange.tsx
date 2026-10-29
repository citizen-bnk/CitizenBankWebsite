import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { bankingDestination } from "utils/bankingDestination";

export default function ForeignExchange() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Foreign exchange</h1>
      <p className="text-lg text-gray-700 mb-5">Foreign exchange is part of the proposed Citizen Bank experience. No live rates, transfers or conversions are offered during pre-licensing.</p>
      <p className="text-gray-700 mb-8">You can explore available demonstration features in Internet Banking. Any displayed balances and transactions are fictional.</p>
      <a href={bankingDestination("/login")} className="inline-flex rounded-lg bg-[#6d52a2] text-white px-6 py-3 font-semibold">Explore banking demo</a>
    </main><Footer /></div>;
}
