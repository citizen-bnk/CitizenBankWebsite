import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";

/** Only approved public documents should appear here; never invent downloadable reports. */
export default function Disclosures() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Public disclosures</h1>
      <p className="text-lg text-gray-700 mb-8">Documents approved for public release will appear here. No annual reports, regulatory filings or certificates are published on this page yet.</p>
      <div className="flex flex-wrap gap-4"><Link className="rounded-lg bg-[#6d52a2] text-white px-6 py-3 font-semibold" to="/media">Company updates</Link><Link className="rounded-lg border border-[#6d52a2] text-[#6d52a2] px-6 py-3 font-semibold" to="/contact">Request information</Link></div>
    </main><Footer /></div>;
}
