import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { hubDestination } from "utils/bankingDestination";

/** Vacancies and applications have one source of truth in the Hub. */
export default function Careers() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Careers at Citizen</h1>
      <p className="text-lg text-gray-700 mb-8">View current vacancies, role requirements and closing dates in the Citizen Hub. Applications can be started there without signing in.</p>
      <a href={hubDestination('/careers')} className="inline-flex rounded-lg bg-[#6d52a2] text-white px-6 py-3 font-semibold">View open positions</a>
    </main><Footer /></div>;
}
