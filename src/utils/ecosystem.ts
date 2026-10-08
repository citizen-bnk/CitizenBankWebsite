import { hubBase, MOVED_TO_HUB } from "./hub";
const env = import.meta.env;
export function ecosystemDestination(path: string): string | null {
 const hub = hubBase();
 const banking = env.VITE_BANKING_URL as string | undefined;
 const app = env.VITE_BANKING_APP_URL as string | undefined;
 if (["/customer-portal","/customerportal"].includes(path)) return banking ? new URL("/",banking).href : null;
 if (path === "/auth/sign-up" || path === "/open-account") return banking ? new URL("/register",banking).href : null;
 if (path === "/mobile-banking") return app ? new URL("/login",app).href : null;
 if (!hub) return null;
 if (path === "/demo/launch") return hub + "/";
 if (path === "/demo" || path.startsWith("/auth/") || path.startsWith("/board-meetings/") || MOVED_TO_HUB.includes(path)) return hub + path;
 return null;
}
