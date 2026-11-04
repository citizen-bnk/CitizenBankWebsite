import { useStackApp } from "@stackframe/react";
import { Navigate } from "react-router-dom";
import { identify } from "app/analytics";
import { useEffect, useState } from "react";
import { readLoginDestination, rememberLoginDestination } from "./loginIntent";

export const LoginRedirect = () => {
  const app = useStackApp();

  const [next] = useState(() => readLoginDestination(window.location.search));

  useEffect(() => { rememberLoginDestination(null); }, []);

  // Identify user in analytics if logged in
  const user = app.useUser();
  useEffect(() => {
    if (user) identify(user.id, { email: user.primaryEmail || undefined, name: user.displayName || undefined });
  }, [user?.id, user?.primaryEmail, user?.displayName]);

  if (next) {
    return <Navigate to={next} replace={true} />;
  }

  return <Navigate to="/" replace={true} />;
};
