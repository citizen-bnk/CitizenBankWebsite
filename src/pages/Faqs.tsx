import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { Link } from "react-router-dom";
import { bankingDestination } from "utils/bankingDestination";

const questions = [
  { question: "Can I open a banking account today?", answer: "You can create a banking profile. Banking accounts remain dormant until the required licence and operational approvals.", href: bankingDestination("/register"), action: "Create a banking profile" },
  { question: "Where can I view investment opportunities?", answer: "Current opportunities and their terms are presented in the investment section of this website. Review the offer and its documents there before subscribing.", href: "/invest", action: "View opportunities" },
  { question: "Where do I manage my investment and board access?", answer: "Sign in on this website to open your investor or board portal, according to your assigned role.", href: "/auth/sign-in", action: "Sign in" },
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
