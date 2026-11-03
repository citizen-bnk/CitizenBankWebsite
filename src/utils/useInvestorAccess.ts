import { useUser } from "@stackframe/react";
import { useQuery } from "@tanstack/react-query";
import { auth } from "app/auth";

/** Navigation follows the website's server-side invitation and ownership check. */
export function useInvestorAccess() {
  const user = useUser();
  let invite: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const url = new URL(window.location.href);
      invite = url.searchParams.get("invite") || url.searchParams.get("token") || sessionStorage.getItem("citizen_investor_invite");
    } catch { /* Access checks still run without a stored invitation. */ }
  }
  const { data } = useQuery({
    queryKey: ["websiteInvestorAccess", user?.id, invite],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const authorization = await auth.getAuthHeaderValue();
      const url = new URL("/api/subscriptions/core/access", window.location.origin);
      if (invite) url.searchParams.set("invite", invite);
      const response = await fetch(url, {
        headers: authorization ? { Authorization: authorization } : {},
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Investor access unavailable");
      const result = await response.json();
      return result.eligible === true;
    },
    staleTime: 60_000,
    retry: 1,
  });
  return Boolean(data);
}
