import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

export default function BranchLocator() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <MapPin className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl font-bold mb-4">Locations</h1>
            <p className="text-xl text-white/90">Where to find Citizen Bank</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">No branches or ATMs</h2>
          <p className="text-gray-600 mb-3">
            Citizen Bank is a digital bank in preparation. It has no branches or ATMs, and no physical
            locations are open to the public.
          </p>
          <p className="text-gray-600">
            To get in touch, use the{" "}
            <Link to="/contact" className="text-[#6d52a2] font-medium hover:underline">contact page</Link>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
