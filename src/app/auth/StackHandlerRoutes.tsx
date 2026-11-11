import { AccountRecovery } from "@/pages/InviteAcceptance";
import { Link } from "react-router-dom";
import "./access.css";
import { APP_BASE_PATH } from "@/constants";
import { StackHandler, StackTheme } from "@stackframe/react";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { stackClientApp } from "./stack";
import { joinPaths } from "./utils";
import { rememberLoginDestination } from "./loginIntent";

export const StackHandlerRoutes = () => {
  const location = useLocation();
  const initialEntry = React.useRef(true);
  React.useLayoutEffect(() => {
    if (/\/(sign-in|sign-up)\/?$/.test(location.pathname)) {
      const next = new URLSearchParams(location.search).get("next");
      if (next || initialEntry.current) rememberLoginDestination(next);
    }
    initialEntry.current = false;
  }, [location.pathname, location.search]);

  return (
    <main className="citizen-access"><section className="citizen-access-brand"><img src="/brand/logo.png" alt="Citizen Bank"/><h1>One Citizen account</h1><p>Your banking, investments and board services.</p></section><section className="citizen-access-form"><StackTheme>
      {location.pathname.endsWith("/forgot-password") ? <AccountRecovery/> : <StackHandler
        app={stackClientApp}
        location={joinPaths(APP_BASE_PATH, location.pathname)}
        fullPage={false}
      />}
    </StackTheme><div className="citizen-access-actions"><Link to="/">Back to website</Link><Link to="/investor-invitation-help">Resend investor invitation</Link></div></section></main>
  );
};
