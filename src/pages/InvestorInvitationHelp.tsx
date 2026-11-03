import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "components/Header";
import { Footer } from "components/Footer";

export default function InvestorInvitationHelp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!complete) return;
    const timer = window.setTimeout(() => navigate("/"), 2500);
    return () => window.clearTimeout(timer);
  }, [complete, navigate]);

  async function requestResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/investor-invitations/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("The invitation check is unavailable. Please retry.");
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The invitation check is unavailable. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="min-h-screen bg-gray-50">
    <Header />
    <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        <img src="/brand/logo.png" alt="Citizen Bank" className="mb-6 h-12 w-auto" />
        <h1 className="mb-3 text-3xl font-bold text-gray-900">Find your invitation</h1>
        {complete ? <p role="status" className="text-gray-700">If an invitation is available, a fresh link is on its way. Returning to the website…</p>
          : <><p className="mb-7 text-gray-600">Enter the email address you were invited with.</p>
            <form onSubmit={requestResend} className="space-y-5">
              <label htmlFor="invitation-email" className="block font-medium text-gray-800">Email address</label>
              <input id="invitation-email" type="email" autoComplete="email" required maxLength={254}
                placeholder="Example: you@example.com" value={email} onChange={event => setEmail(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#6d52a2] focus:outline-none focus:ring-2 focus:ring-[#6d52a2]/20" />
              {error && <p role="alert" className="text-red-700">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#6d52a2] px-6 py-3 font-semibold text-white hover:bg-[#5a4289] disabled:opacity-60">
                {busy ? "Checking…" : "Resend invitation"}
              </button>
            </form></>}
        <Link to="/" className="mt-6 inline-block font-medium text-[#6d52a2]">← Back to website</Link>
      </div>
    </main>
    <Footer />
  </div>;
}
