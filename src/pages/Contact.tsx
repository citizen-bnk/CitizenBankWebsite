import { Header } from "components/Header";
import { Footer } from "components/Footer";

/** Mail links are explicit: the website must never claim a message was sent when it was not. */
export default function Contact() {
  return <div className="min-h-screen bg-gray-50"><Header />
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Citizen Digital</h1>
      <p className="text-lg text-gray-700 mb-8">Choose the right team. Your email app will open so you can review and send your message.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {[
          ["General enquiries", "info@citizenbank.co.ls"],
          ["Investor relations", "invest@citizenbank.co.ls"],
          ["Account support", "support@citizenbank.co.ls"],
          ["Privacy enquiries", "privacy@citizenbank.co.ls"],
        ].map(([label, email]) => <a key={email} href={`mailto:${email}`} className="rounded-xl bg-white border border-gray-200 p-6 hover:border-[#6d52a2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6d52a2]"><strong className="block text-gray-900 mb-2">{label}</strong><span className="text-[#6d52a2] break-all">{email}</span></a>)}
      </div>
      <p className="mt-8 text-sm text-gray-600">Citizen Bank is preparing its licence application. Banking customer support and branch services are not yet operational.</p>
    </main><Footer /></div>;
}
