/**
 * Where the Citizen Hub lives and which screens have moved there.
 *
 * VITE_HUB_URL is the Hub's address (e.g. https://hub.citizenbank.co.ls). While it is unset nothing moves: every screen is
 * still served here. Once it is set, the paths below redirect to the same path on the Hub, which serves them in its own
 * theme. Keep MOVED_TO_HUB in step with the Hub's routes (citizen-hub src/user-routes.tsx).
 */
export const MOVED_TO_HUB: readonly string[] = [
  "/account",
  "/account/setup",
  "/admin-board-positions",
  "/admin-dashboard",
  "/admin-user-detail",
  "/admin-users",
  "/admin/positions",
  "/admin/users",
  "/adminboardpositions",
  "/admindashboard",
  "/adminuserdetail",
  "/adminusers",
  "/back-office-achievements",
  "/back-office-admin-subscriptions",
  "/back-office-bank-accounts",
  "/back-office-board-documents",
  "/back-office-board-investments",
  "/back-office-board-mapping",
  "/back-office-board-members",
  "/back-office-certificate-templates",
  "/back-office-certificates",
  "/back-office-crypto-wallets",
  "/back-office-dashboard",
  "/back-office-data-room",
  "/back-office-data-room-access",
  "/back-office-engagement",
  "/back-office-investor-leads",
  "/back-office-invitations",
  "/back-office-license-documents",
  "/back-office-media-releases",
  "/back-office-sent-items",
  "/back-office-share-classes",
  "/back-office-subscribe-on-behalf",
  "/back-office-subscriptions",
  "/backofficeachievements",
  "/backofficeadminsubscriptions",
  "/backofficebankaccounts",
  "/backofficeboarddocuments",
  "/backofficeboardinvestments",
  "/backofficeboardmapping",
  "/backofficeboardmembers",
  "/backofficecertificates",
  "/backofficecertificatetemplates",
  "/backofficecryptowallets",
  "/backofficedashboard",
  "/backofficedataroom",
  "/backofficedataroomaccess",
  "/backofficeengagement",
  "/backofficeinvestorleads",
  "/backofficeinvitations",
  "/backofficelicensedocuments",
  "/backofficemediareleases",
  "/backofficesentitems",
  "/backofficeshareclasses",
  "/backofficesubscribeonbehalf",
  "/backofficesubscriptions",
  "/board-documents",
  "/board-investment",
  "/board-meetings",
  "/board-member-detail",
  "/board-onboarding",
  "/board-portal",
  "/board-portal-invitations",
  "/boarddocuments",
  "/boardinvestment",
  "/boardmeetings",
  "/boardmemberdetail",
  "/boardonboarding",
  "/boardportal",
  "/boardportalinvitations",
  "/citizen-ai",
  "/communication-portal",
  "/communicationportal",
  "/communications",
  "/complete-profile",
  "/completeprofile",
  "/compliance",
  "/create-meeting",
  "/createmeeting",
  "/data-room",
  "/data-room-access",
  "/dataroom",
  "/dataroomaccess",
  "/decisions",
  "/documents",
  "/finance",
  "/governance",
  "/governance-admin",
  "/governanceadmin",
  "/invest",
  "/invitations",
  "/licensing",
  "/meeting-details",
  "/meetingdetails",
  "/meetings",
  "/meetings/new",
  "/my-agreements",
  "/my-subscriptions",
  "/myagreements",
  "/mysubscriptions",
  "/newsletters",
  "/notification-preferences",
  "/notificationpreferences",
  "/notifications",
  "/office/board",
  "/office/certificates",
  "/office/certificates/templates",
  "/office/communications",
  "/office/compliance",
  "/office/content",
  "/office/data-room",
  "/office/decisions",
  "/office/leads",
  "/office/settings",
  "/office/subscriptions",
  "/office/subscriptions/new",
  "/people-careers",
  "/portfolio",
  "/portfolio/buy",
  "/profile",
  "/projects",
  "/risk",
  "/share-subscription",
  "/sharesubscription",
  "/sign-certificate",
  "/signcertificate"
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
