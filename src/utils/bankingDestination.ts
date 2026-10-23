const bankingOrigin = (import.meta.env.VITE_BANKING_URL || "https://banking.citizenbank.co.ls").replace(/\/$/, "");
const appOrigin = (import.meta.env.VITE_APP_URL || "https://app.citizenbank.co.ls").replace(/\/$/, "");

/** Handheld customers open the app experience; desktop customers open internet banking. */
export function bankingDestination(path: "/register" | "/login" = "/register") {
  const handheld = typeof window !== "undefined" &&
    (window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  return `${handheld ? appOrigin : bankingOrigin}${path}`;
}
