import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Briefcase, Calendar, Loader2, Mail, MapPin } from "lucide-react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { LicenceStatusNote } from "components/LicenceStatusNote";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdvert, listAdverts, loadPublicPolicies } from "utils/publicContentApi";
import {
  applyInfo, closingLabel, hasApplyInfo, type Policies, type PublicAdvert,
} from "utils/publicContent";

function Hero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h1>
          {subtitle && <p className="text-lg sm:text-xl text-white/90">{subtitle}</p>}
        </div>
      </div>
    </section>
  );
}

function Meta({ advert }: { advert: PublicAdvert }) {
  const closing = closingLabel(advert.closing_date);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
      {advert.department && <Badge variant="outline">{advert.department}</Badge>}
      {advert.employment_type && <Badge variant="outline">{advert.employment_type}</Badge>}
      {advert.location && (
        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden="true" />{advert.location}</span>
      )}
      {closing && (
        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" aria-hidden="true" />{closing}</span>
      )}
    </div>
  );
}

/** How to apply: the advert's own text and the policy instructions / address. Hidden when none is confirmed. */
function ApplyBlock({ policies, advert }: { policies: Policies | null; advert?: PublicAdvert }) {
  const info = applyInfo(policies);
  if (!hasApplyInfo(info, advert?.how_to_apply)) return null;
  return (
    <section aria-labelledby="apply-heading" className="mt-8 rounded-lg border border-[#6d52a2]/30 bg-[#6d52a2]/5 p-5">
      <h2 id="apply-heading" className="text-lg font-semibold text-gray-900 mb-2">How to apply</h2>
      {advert?.how_to_apply && <p className="text-gray-700 whitespace-pre-wrap mb-2">{advert.how_to_apply}</p>}
      {info.instructions && <p className="text-gray-700 whitespace-pre-wrap mb-2">{info.instructions}</p>}
      {info.email && (
        <p className="flex items-center gap-2 text-gray-800">
          <Mail className="h-4 w-4" aria-hidden="true" />
          <a className="text-[#6d52a2] underline" href={`mailto:${info.email}`}>{info.email}</a>
        </p>
      )}
    </section>
  );
}

function usePolicies(): Policies | null {
  const [policies, setPolicies] = useState<Policies | null>(null);
  useEffect(() => {
    loadPublicPolicies().then(setPolicies);
  }, []);
  return policies;
}

function List({ policies }: { policies: Policies | null }) {
  const [adverts, setAdverts] = useState<PublicAdvert[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    setAdverts(null);
    listAdverts().then(setAdverts).catch(() => setFailed(true));
  };
  useEffect(load, []);

  return (
    <>
      <Hero title="Careers" subtitle="Open positions at Citizen Digital." />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {failed ? (
          <div role="alert" className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-700 mb-4">We could not load the open positions. Please try again.</p>
            <Button variant="outline" onClick={load}>Try again</Button>
          </div>
        ) : adverts === null ? (
          <div className="flex justify-center py-12" role="status" aria-label="Loading positions">
            <Loader2 className="h-8 w-8 animate-spin text-[#6d52a2]" aria-hidden="true" />
          </div>
        ) : adverts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900">There are no open positions right now</h2>
          </div>
        ) : (
          <>
            <ul className="space-y-5" aria-label="Open positions">
              {adverts.map((advert) => (
                <li key={advert.id} className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{advert.title}</h2>
                  <Meta advert={advert} />
                  {advert.summary && <p className="mt-3 text-gray-700 leading-relaxed">{advert.summary}</p>}
                  <Button asChild variant="outline" className="mt-4">
                    <Link to={`/careers/${advert.slug}`}>
                      View details<span className="sr-only"> for {advert.title}</span>
                      <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
            <ApplyBlock policies={policies} />
          </>
        )}
        <LicenceStatusNote policies={policies} className="mt-10 text-center" />
      </main>
    </>
  );
}

function Detail({ slug, policies }: { slug: string; policies: Policies | null }) {
  const [advert, setAdvert] = useState<PublicAdvert | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "error" | "ok">("loading");
  useEffect(() => {
    setState("loading");
    getAdvert(slug)
      .then((a) => { setAdvert(a); setState("ok"); })
      .catch((e: { status?: number }) => setState(e?.status === 404 ? "missing" : "error"));
  }, [slug]);

  return (
    <>
      <Hero title={advert?.title ?? "Careers"} />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Link to="/careers" className="inline-flex items-center gap-1 text-[#6d52a2] mb-6">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />All open positions
        </Link>
        {state === "loading" && (
          <div className="flex justify-center py-12" role="status" aria-label="Loading position">
            <Loader2 className="h-8 w-8 animate-spin text-[#6d52a2]" aria-hidden="true" />
          </div>
        )}
        {state === "missing" && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">This position is not available</h2>
            <p className="text-gray-600 mt-2">It may have closed or been withdrawn.</p>
          </div>
        )}
        {state === "error" && (
          <div role="alert" className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-700">We could not load this position. Please try again later.</p>
          </div>
        )}
        {state === "ok" && advert && (
          <article className="bg-white border border-gray-200 rounded-lg p-5 sm:p-8">
            <Meta advert={advert} />
            {advert.summary && <p className="mt-4 text-gray-700 leading-relaxed">{advert.summary}</p>}
            {advert.responsibilities.length > 0 && (
              <section className="mt-6" aria-labelledby="resp-heading">
                <h2 id="resp-heading" className="text-lg font-semibold text-gray-900 mb-2">Responsibilities</h2>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  {advert.responsibilities.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </section>
            )}
            {advert.requirements.length > 0 && (
              <section className="mt-6" aria-labelledby="req-heading">
                <h2 id="req-heading" className="text-lg font-semibold text-gray-900 mb-2">Requirements</h2>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  {advert.requirements.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </section>
            )}
            <ApplyBlock policies={policies} advert={advert} />
          </article>
        )}
        <LicenceStatusNote policies={policies} className="mt-10 text-center" />
      </main>
    </>
  );
}

export default function Careers() {
  const { slug } = useParams<{ slug?: string }>();
  const policies = usePolicies();
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {slug ? <Detail slug={slug} policies={policies} /> : <List policies={policies} />}
      <Footer />
    </div>
  );
}
