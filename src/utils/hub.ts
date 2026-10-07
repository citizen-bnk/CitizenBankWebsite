/**
 * Where the Citizen Hub lives and which screens have moved there.
 *
 * VITE_HUB_URL is the Hub's address (e.g. https://hub.citizenbank.co.ls). While it is unset nothing moves: every screen is
 * still served here. Once it is set, the paths below redirect to the same path on the Hub, which serves them in its own
 * theme. Keep MOVED_TO_HUB in step with the Hub's routes (citizen-hub src/user-routes.tsx).
 */
export const MOVED_TO_HUB: readonly string[] = [
  "/admin-audit",
  "/adminaudit",
  "/admin-board-positions",
  "/adminboardpositions",
  "/admin-dashboard",
  "/admindashboard",
  "/admin-setup-guide",
  "/adminsetupguide",
  "/admin-user-detail",
  "/adminuserdetail",
  "/admin-users",
  "/adminusers",
  "/back-office-achievements",
  "/backofficeachievements",
  "/back-office-admin-subscriptions",
  "/backofficeadminsubscriptions",
  "/back-office-bank-accounts",
  "/backofficebankaccounts",
  "/back-office-board-documents",
  "/backofficeboarddocuments",
  "/back-office-board-investments",
  "/backofficeboardinvestments",
  "/back-office-board-mapping",
  "/backofficeboardmapping",
  "/back-office-board-members",
  "/backofficeboardmembers",
  "/back-office-certificate-templates",
  "/backofficecertificatetemplates",
  "/back-office-certificates",
  "/backofficecertificates",
  "/back-office-crypto-wallets",
  "/backofficecryptowallets",
  "/back-office-dashboard",
  "/backofficedashboard",
  "/back-office-data-room",
  "/backofficedataroom",
  "/back-office-data-room-access",
  "/backofficedataroomaccess",
  "/back-office-engagement",
  "/backofficeengagement",
  "/back-office-investor-leads",
  "/backofficeinvestorleads",
  "/back-office-invitations",
  "/backofficeinvitations",
  "/back-office-license-documents",
  "/backofficelicensedocuments",
  "/back-office-media-releases",
  "/backofficemediareleases",
  "/back-office-sent-items",
  "/backofficesentitems",
  "/back-office-share-classes",
  "/backofficeshareclasses",
  "/back-office-subscribe-on-behalf",
  "/backofficesubscribeonbehalf",
  "/back-office-subscriptions",
  "/backofficesubscriptions",
  "/board-documents",
  "/boarddocuments",
  "/board-investment",
  "/boardinvestment",
  "/board-meetings",
  "/boardmeetings",
  "/board-member-detail",
  "/boardmemberdetail",
  "/board-onboarding",
  "/boardonboarding",
  "/board-portal",
  "/boardportal",
  "/board-portal-invitations",
  "/boardportalinvitations",
  "/communication-portal",
  "/communicationportal",
  "/create-meeting",
  "/createmeeting",
  "/data-room",
  "/dataroom",
  "/data-room-access",
  "/dataroomaccess",
  "/governance",
  "/governance-admin",
  "/governanceadmin",
  "/invest",
  "/meeting-details",
  "/meetingdetails",
  "/my-agreements",
  "/myagreements",
  "/my-subscriptions",
  "/mysubscriptions",
  "/share-subscription",
  "/sharesubscription",
  "/sign-certificate",
  "/signcertificate",
  "/profile",
  "/complete-profile",
  "/completeprofile",
  "/notification-preferences",
  "/notificationpreferences"
];

/** Set by the Hub when it sends a path back here, so a path it does not serve is shown here instead of bouncing again. */
export const FROM_HUB_PARAM = "from_hub";

/** The Hub's address without a trailing slash, or null when the Hub is not configured. */
export function hubBase(raw: string | undefined = import.meta.env.VITE_HUB_URL as string | undefined): string | null {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(value) ? value : null;
}

/** The full Hub address for a path, or null when the Hub is not configured. */
export function hubUrl(path: string, base: string | null = hubBase()): string | null {
  if (!base) return null;
  return `${base}${path.startsWith("/") && !path.startsWith("//") ? path : "/"}`;
}

/**
 * Where a visit to `pathname` should be sent on the Hub, or null to serve it here (not a moved path, Hub not configured,
 * or the Hub itself sent the visitor back).
 */
export function hubRedirectTarget(
  pathname: string, search: string, hash: string, base: string | null = hubBase(),
): string | null {
  if (!base) return null;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!MOVED_TO_HUB.includes(path.toLowerCase())) return null;
  const params = new URLSearchParams(search);
  if (params.has(FROM_HUB_PARAM)) return null;
  return `${base}${path}${search}${hash}`;
}

/** Where to open a workspace: its Hub address if it has moved there and the Hub is configured, otherwise null (open it here). */
export function workspaceHref(path: string, base: string | null = hubBase()): string | null {
  return MOVED_TO_HUB.includes(path) ? hubUrl(path, base) : null;
}
