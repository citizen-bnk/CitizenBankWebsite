import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function Sustainability() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Sustainability & CSR</h1>
            <p className="text-lg sm:text-xl text-white/90">
              Social responsibility and sustainability at Citizen Bank
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-2xl mx-auto text-center">
          <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
            <Leaf className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Nothing to report yet</h2>
          <p className="text-gray-600 mb-3">
            Citizen Bank is still being built and has no sustainability or community programmes to report.
            We will not publish figures or programme descriptions here until there is something real to
            report, with evidence.
          </p>
          <p className="text-gray-600">
            For what has been built so far, see the{" "}
            <Link to="/media" className="text-[#6d52a2] font-medium hover:underline">Media Center</Link>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
