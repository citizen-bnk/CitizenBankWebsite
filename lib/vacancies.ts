export const vacancies = [
  {
    title: "CEO",
    source_link: "https://drive.google.com/file/d/1IKitiu1E6FWVhqNR--7Ud1YrqI6Vczk4/view",
    deadline: "2026-10-15",
    context: "Succession / replacement across pre- and post-licensing phases",
    email: "careers@citizenbank.co.ls"
  },
  {
    title: "CFO",
    source_link: "https://drive.google.com/file/d/1S5pokr1KUK4JiQiIDNfJQiig17BqVlCO/view",
    deadline: "2026-10-20",
    context: "Pre-licensing recruitment; appointment subject to governance and applicable regulatory assessment",
    email: "careers@citizenbank.co.ls"
  },
  {
    title: "CRO",
    source_link: "https://drive.google.com/file/d/1Qp1R4snxyJkWrEOAjiVPRY3G5KYeYf9v/view",
    deadline: "2026-10-20",
    context: "Pre-licensing recruitment; appointment subject to governance and applicable regulatory assessment",
    email: "careers@citizenbank.co.ls"
  },
  {
    title: "COO",
    source_link: "https://drive.google.com/file/d/1C3c0VqmiVkXPKHB-4vKFN2yYOKTfLO_s/view",
    deadline: "2026-10-22",
    context: "Pre-licensing recruitment; appointment subject to governance and applicable regulatory assessment",
    email: "careers@citizenbank.co.ls"
  },
  {
    title: "Chief Internal Auditor",
    source_link: "https://drive.google.com/file/d/1cvUMNbxWzs2uzrAgwQ-2ridF4UiKX74m/view",
    deadline: "2026-10-25",
    context: "Pre-licensing recruitment; appointment subject to governance and applicable regulatory assessment",
    email: "careers@citizenbank.co.ls"
  },
  {
    title: "Compliance Officer & MLRO",
    source_link: "https://drive.google.com/file/d/1NJcJ3TimwLIO6ezHObMLAvOho5LrjuY5/view",
    deadline: "2026-10-25",
    context: "Pre-licensing recruitment; appointment subject to governance and applicable regulatory assessment",
    email: "careers@citizenbank.co.ls"
  },
  {
    title: "Board Chair",
    source_link: "https://drive.google.com/file/d/1kNx6_4gCuazecd0_ni_BHj_awShsbnob/view",
    deadline: "2026-11-05",
    context: "Succession / replacement across pre- and post-licensing phases",
    email: "careers@citizenbank.co.ls"
  },
  {
    title: "Board Members",
    source_link: "https://drive.google.com/file/d/14UEG6_Q-C-rvoQ1iujPtAroMnyApMEpe/view",
    deadline: "2026-11-05",
    context: "Pre-licensing recruitment; appointment subject to governance and applicable regulatory assessment",
    email: "careers@citizenbank.co.ls"
  }
] as const;

function southAfricanDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find(part => part.type === "year")?.value ?? "0000";
  const month = parts.find(part => part.type === "month")?.value ?? "00";
  const day = parts.find(part => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

/** A vacancy remains available through its published closing date in South African local time. */
export function openVacancies(now: Date = new Date()) {
  const today = southAfricanDateKey(now);
  return vacancies.filter(vacancy => vacancy.deadline >= today);
}

export function formatVacancyDeadline(deadline: string): string {
  const [year, month, day] = deadline.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
