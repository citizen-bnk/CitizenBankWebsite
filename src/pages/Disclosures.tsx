import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

export default function Disclosures() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Public Disclosures</h1>
            <p className="text-lg sm:text-xl text-white/90">
              Documents that Citizen Digital Ltd publishes about Citizen Bank
            </p>
          </div>
        </div>
      </section>

      {/* Disclosures List */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
          <div className="inline-flex p-3 bg-[#6d52a2]/10 rounded-lg mb-4">
            <FileText className="h-6 w-6 text-[#6d52a2]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No documents published yet</h2>
          <p className="text-gray-600">
            No public reports or disclosures have been published yet. When they are, they will be listed here.
            For progress on the platform, see the{" "}
            <Link to="/media" className="text-[#6d52a2] font-medium hover:underline">Media Center</Link>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
