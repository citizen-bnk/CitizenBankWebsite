import { APP_BASE_PATH, mode, Mode } from "app";

const FRONTEND_DOMAIN_PROD = window.location.origin;
const FRONTEND_DOMAIN_DEV = "https://databutton.com";
const FRONTEND_PATH_DEV = "_projects/4e911b3d-b027-4c6a-8f76-c90e63535892/dbtn/devx/ui";

const API_DOMAIN_PROD = window.location.origin;
const API_DOMAIN_DEV = "https://api.databutton.com";
const API_PATH_DEV = "_projects/4e911b3d-b027-4c6a-8f76-c90e63535892/dbtn/devx/app/routes";

export function getFrontendBaseUrl(): string {
  if (mode === Mode.PROD) {
    return FRONTEND_DOMAIN_PROD;
  }
  return `${FRONTEND_DOMAIN_DEV}/${FRONTEND_PATH_DEV}`;
}

export function getFrontendPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (mode === Mode.PROD) {
    return `${FRONTEND_DOMAIN_PROD}${normalizedPath}`;
  }
  return `${FRONTEND_DOMAIN_DEV}/${FRONTEND_PATH_DEV}${normalizedPath}`;
}

export function getApiBaseUrl(): string {
  if (mode === Mode.PROD) {
    return `${API_DOMAIN_PROD}/api`;
  }
  return `${API_DOMAIN_DEV}/${API_PATH_DEV}`;
}

export function getApiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (mode === Mode.PROD) {
    return `${API_DOMAIN_PROD}${normalizedPath}`;
  }
  return `${API_DOMAIN_DEV}/${API_PATH_DEV}${normalizedPath}`;
}

export function getShortLinkUrl(token: string): string {
  return `${getFrontendBaseUrl()}/l/${token}`;
}

export function getShareSubscriptionUrl(subscriptionId?: string): string {
  if (!subscriptionId) {
    return `${getFrontendPath("/share-subscription")}`;
  }
  const search = `subscription=${encodeURIComponent(subscriptionId)}`;
  const base = getFrontendPath("/share-subscription");
  return `${base}?${search}`;
}

export function getMySubscriptionsUrl(subscriptionId?: string): string {
  const base = getFrontendPath("/my-subscriptions");
  if (!subscriptionId) {
    return base;
  }
  return `${base}?subscription=${encodeURIComponent(subscriptionId)}`;
}

export function getBoardDocumentsUrl(): string {
  return getFrontendPath("/board-documents");
}

export function getBoardPortalUrl(path: string = ""): string {
  return getFrontendPath(`/board-portal${path}`);
}

export function getInviteAcceptanceUrl(token: string): string {
  return `${getFrontendPath("/invite-acceptance")}?token=${token}`;
}

export function isProd(): boolean {
  return mode === Mode.PROD;
}

export function getAppBasePath(): string {
  return APP_BASE_PATH;
}
