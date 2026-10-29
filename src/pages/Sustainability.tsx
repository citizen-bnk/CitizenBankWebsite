import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";

export default function Sustainability() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Sustainability and community</h1>
      <p className="text-lg text-gray-700 mb-8">Citizen Digital is developing its approach to responsible banking as part of its pre-licensing work. Approved programmes, outcomes and reports will be published when available.</p>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-gray-200 p-6"><h2 className="text-xl font-semibold mb-2">Proposed priorities</h2><p className="text-gray-700">Financial inclusion, accessible digital services and responsible operations are areas under development.</p></div>
        <div className="rounded-xl bg-white border border-gray-200 p-6"><h2 className="text-xl font-semibold mb-2">Verified updates</h2><p className="text-gray-700">Follow published milestones and company news rather than projected outcomes.</p><Link className="inline-block mt-4 text-[#6d52a2] font-semibold underline" to="/media">View company updates</Link></div>
      </div>
    </main><Footer /></div>;
}
