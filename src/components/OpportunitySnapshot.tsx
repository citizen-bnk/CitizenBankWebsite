import { useEffect, useState } from "react";
import brain from "brain";
import { hubDestination } from "utils/bankingDestination";

type Offer = { price_per_share: number | string; min_subscription: number; remaining: number };

/** The website reads the current offer instead of publishing a copied price or share count. */
export function OpportunitySnapshot() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    brain.core_get_share_availability().then(async response => {
      if (!response.ok) throw new Error("Offer unavailable");
      const data = await response.json();
      if (active) setOffer(data);
    }).catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, []);

  return <section className="container mx-auto px-4 py-10" aria-label="Current investment opportunity">
    <div className="rounded-2xl bg-[#f5f0ff] border border-[#d8c9f0] p-6 md:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Explore the current share offer</h2>
      {offer ? <p className="text-gray-700 mb-5">Current reference price: <strong>R{Number(offer.price_per_share).toFixed(2)}</strong> per unit. First subscription minimum: <strong>{offer.min_subscription.toLocaleString()} units</strong>. Terms and availability are confirmed in the Hub.</p>
        : <p className="text-gray-700 mb-5">{unavailable ? "Live offer details are temporarily unavailable. Review the current terms in the Hub before making a decision." : "Checking current offer terms…"}</p>}
      <a className="inline-flex rounded-lg bg-[#6d52a2] px-6 py-3 font-semibold text-white" href={hubDestination("/opportunities")}>View offer and terms</a>
    </div>
  </section>;
}
