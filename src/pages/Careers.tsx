import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";

/** The restored website owns public careers information. */
export default function Careers() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Careers at Citizen</h1>
      <p className="text-lg text-gray-700 mb-8">Confirmed vacancies and application instructions will be published here.</p>
      <Link to="/contact" className="inline-flex rounded-lg bg-[#6d52a2] text-white px-6 py-3 font-semibold">Contact recruitment</Link>
    </main><Footer /></div>;
}
