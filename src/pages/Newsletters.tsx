import { useEffect, useState } from "react";
import { Calendar, Download, ExternalLink, FileText, Loader2, Newspaper } from "lucide-react";
import { Header } from "components/Header";
import { Footer } from "components/Footer";
import { LicenceStatusNote } from "components/LicenceStatusNote";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listNewsletters, newsletterFileUrl } from "utils/publicContentApi";
import {
  formatBytes, issueDateLabel, issueLabel, safeExternalUrl, type PublicNewsletter,
} from "utils/publicContent";

export default function Newsletters() {
  const [issues, setIssues] = useState<PublicNewsletter[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reading, setReading] = useState<PublicNewsletter | null>(null);

  const load = () => {
    setFailed(false);
    setIssues(null);
    listNewsletters().then(setIssues).catch(() => setFailed(true));
  };
  useEffect(load, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-gradient-to-r from-[#6d52a2] to-[#5a4289] text-white py-16 pt-[calc(88px+4rem)] sm:pt-[calc(96px+4rem)] lg:pt-[calc(104px+4rem)]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Newsletters</h1>
            <p className="text-lg sm:text-xl text-white/90">Published issues of the Citizen Digital newsletter and reviews.</p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {failed ? (
          <div role="alert" className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-700 mb-4">We could not load the newsletters. Please try again.</p>
            <Button variant="outline" onClick={load}>Try again</Button>
          </div>
        ) : issues === null ? (
          <div className="flex justify-center py-12" role="status" aria-label="Loading newsletters">
            <Loader2 className="h-8 w-8 animate-spin text-[#6d52a2]" aria-hidden="true" />
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900">No newsletters are published yet</h2>
          </div>
        ) : (
          <ul className="space-y-5" aria-label="Newsletter issues">
            {issues.map((issue) => {
              const link = safeExternalUrl(issue.external_url);
              const headings = issue.sections.map((s) => s.heading).filter((h): h is string => !!h);
              return (
                <li key={issue.id} className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6">
                  <p className="text-sm font-medium text-[#6d52a2]">{issueLabel(issue)}</p>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">{issue.title}</h2>
                  {issueDateLabel(issue) && (
                    <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      {issueDateLabel(issue)}
                    </p>
                  )}
                  {issue.summary && <p className="mt-3 text-gray-700 leading-relaxed">{issue.summary}</p>}
                  {headings.length > 0 && (
                    <details className="mt-3 text-sm text-gray-700">
                      <summary className="cursor-pointer text-[#6d52a2] font-medium">In this issue</summary>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        {headings.map((h) => <li key={h}>{h}</li>)}
                      </ul>
                    </details>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {issue.has_file && (
                      <>
                        <Button onClick={() => setReading(issue)} className="bg-[#6d52a2] hover:bg-[#5a4289]">
                          <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                          Read
                        </Button>
                        <Button asChild variant="outline">
                          <a href={newsletterFileUrl(issue.id, true)} download>
                            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                            Download{issue.file_bytes ? ` (PDF, ${formatBytes(issue.file_bytes)})` : " (PDF)"}
                          </a>
                        </Button>
                      </>
                    )}
                    {link && (
                      <Button asChild variant="outline">
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                          Open the issue
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <LicenceStatusNote className="mt-10 text-center" />
      </main>

      <Dialog open={reading !== null} onOpenChange={(open) => !open && setReading(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col gap-3">
          {reading && (
            <>
              <DialogHeader>
                <DialogTitle>{reading.title}</DialogTitle>
                <DialogDescription>{issueDateLabel(reading)}</DialogDescription>
              </DialogHeader>
              <object
                data={newsletterFileUrl(reading.id)}
                type="application/pdf"
                aria-label={`${reading.title} (PDF)`}
                className="flex-1 w-full min-h-0 rounded border border-gray-200"
              >
                <div className="p-6 text-center text-gray-700">
                  <p className="mb-3">Your browser cannot show this PDF here.</p>
                  <a className="text-[#6d52a2] underline" href={newsletterFileUrl(reading.id, true)} download>
                    Download the PDF
                  </a>
                </div>
              </object>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
