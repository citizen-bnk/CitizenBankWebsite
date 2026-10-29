import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";

export default function BranchLocator() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Branch locations</h1>
      <p className="text-lg text-gray-700 mb-8">Citizen Bank is in its pre-licensing stage. No banking branches or ATMs are open to customers. Confirmed locations will be listed here when operations begin.</p>
      <Link className="inline-flex rounded-lg bg-[#6d52a2] text-white px-6 py-3 font-semibold" to="/contact">Contact Citizen Digital</Link>
    </main><Footer /></div>;
}
