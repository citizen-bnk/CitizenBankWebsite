import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";
import { bankingDestination } from "utils/bankingDestination";

const destinations = [
  { title: "Banking profile", detail: "Sign in and view your pre-licensing banking profile. Accounts remain dormant.", href: bankingDestination("/login") },
  { title: "Investments", detail: "Review the offer, subscribe and manage your investment on this website.", href: "/invest" },
  { title: "Governance", detail: "Open the board portal on this website.", href: "/board-portal" },
  { title: "Frequently asked questions", detail: "Answers about the pre-licensing stage and platform access.", href: "/faqs" },
  { title: "Account security", detail: "Learn how to protect your Citizen identity.", href: "/security-tips" },
];

export default function HelpCenter() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-5xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Help centre</h1>
      <p className="text-gray-700 mb-8">Choose the service you need. Banking accounts remain dormant while the licence application is in preparation.</p>
      <div className="grid sm:grid-cols-2 gap-5">{destinations.map(item => <a key={item.title} href={item.href} className="rounded-xl bg-white border border-gray-200 p-6 hover:border-[#6d52a2]"><h2 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h2><p className="text-gray-700">{item.detail}</p></a>)}</div>
      <p className="mt-8 text-gray-700">Need a person? <Link to="/contact" className="text-[#6d52a2] font-semibold underline">Contact us</Link>.</p>
    </main><Footer /></div>;
}
