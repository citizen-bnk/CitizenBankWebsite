import { useStackApp } from "@stackframe/react";
import { Navigate } from "react-router-dom";
import { identify } from "app/analytics";

const popFromLocalStorage = (key: string): string | null => {
  if (typeof window !== "undefined" && window.localStorage) {
    const value = localStorage.getItem(key);
    localStorage.removeItem(key);
    return value;
  }

  return null;
};

export const LoginRedirect = () => {
  const app = useStackApp();

  const queryParams = new URLSearchParams(window.location.search);

  // Identify user in analytics if logged in
  const user = app.useUser();
  if (user) {
    identify(user.id, {
      email: user.primaryEmail || undefined,
      name: user.displayName || undefined,
    });
  }

  const candidate = queryParams.get("next") || popFromLocalStorage("dtbn-login-next");
  const next = candidate && candidate.startsWith("/") && !candidate.startsWith("//") &&
    !candidate.includes("\\") && !/[\u0000-\u001f\u007f]/.test(candidate) ? candidate : null;

  if (next) {
    return <Navigate to={next} replace={true} />;
  }

  return <Navigate to="/" replace={true} />;
};
