import type { Metadata } from "next";
import { formatVacancyDeadline, openVacancies } from "@/lib/vacancies";

export const metadata: Metadata = {
  title: "Careers at Citizen Bank",
  description: "Explore published recruitment opportunities with Citizen Digital Ltd and the proposed Citizen Bank."
};

export default function Careers() {
  const currentVacancies = openVacancies();

  return (
    <section className="section careers-page">
      <span className="eyebrow">CITIZEN DIGITAL LTD · REG. 99073</span>
      <h1>Build the next chapter with us.</h1>
      <p>
        Citizen Digital Ltd is preparing the proposed Citizen Bank for its pre-licensing stage and future operations.
        The opportunities below reflect published role briefs and closing dates currently recorded for recruitment.
      </p>

      {currentVacancies.length > 0 ? (
        <div className="progress-cards careers-list" aria-label="Current vacancies">
          {currentVacancies.map(vacancy => (
            <article key={vacancy.title}>
              <span className="eyebrow">APPLICATIONS OPEN</span>
              <h2>{vacancy.title}</h2>
              <p>{vacancy.context}</p>
              <p><strong>Apply by {formatVacancyDeadline(vacancy.deadline)}</strong></p>
              <div className="vacancy-actions">
                <a className="button" href={vacancy.source_link} target="_blank" rel="noreferrer">
                  View role brief ↗
                </a>
                <a
                  className="button primary"
                  href={`mailto:${vacancy.email}?subject=${encodeURIComponent(`Application — ${vacancy.title}`)}`}
                >
                  Apply by email
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="service-card vacancy-empty">
          <h2>No currently open vacancies</h2>
          <p>There are no active public vacancies listed at present. Check back for approved recruitment announcements.</p>
        </div>
      )}

      <p>
        Appointments are subject to company governance and any applicable regulatory assessment. Recruitment
        announcements do not imply that Citizen Bank holds a banking licence or has begun banking operations.
      </p>
      <div className="actions">
        <a className="button quiet" href="/hub">Existing institutional members: open Citizen Hub ↗</a>
        <a className="button" href="/">Back to website</a>
      </div>
    </section>
  );
}
