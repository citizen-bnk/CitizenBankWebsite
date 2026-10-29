import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";
import { bankingDestination, hubDestination } from "utils/bankingDestination";

const questions = [
  { question: "Can I open a banking account today?", answer: "You can create a demonstration account to explore the proposed banking experience. Real-money banking will be available only after the required licence and operational approvals.", href: bankingDestination("/register"), action: "Open a demo account" },
  { question: "Where can I view investment opportunities?", answer: "Current opportunities and their terms are presented in the Citizen Hub. Review the offer and its documents there before subscribing.", href: hubDestination("/opportunities"), action: "View opportunities" },
  { question: "Can I use the same identity across the ecosystem?", answer: "The platforms are being connected around one Citizen identity. Your available features depend on your roles and completed verification. If access does not carry over, sign in on the destination platform or contact support.", href: hubDestination("/login"), action: "Open the Hub" },
  { question: "Where are the branches and ATMs?", answer: "No Citizen Bank branches or ATMs are open during pre-licensing. The website will list confirmed locations when banking operations begin.", href: "/branch-locator", action: "Branch status" },
];

export default function Faqs() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Frequently asked questions</h1>
      <div className="space-y-4">{questions.map(item => <section key={item.question} className="rounded-xl border border-gray-200 bg-white p-6"><h2 className="text-xl font-semibold text-gray-900 mb-3">{item.question}</h2><p className="text-gray-700 mb-4">{item.answer}</p><a className="font-semibold text-[#6d52a2] underline" href={item.href}>{item.action}</a></section>)}</div>
      <p className="mt-8 text-gray-700">Need another answer? <Link className="text-[#6d52a2] underline" to="/contact">Contact us</Link>.</p>
    </main><Footer /></div>;
}
