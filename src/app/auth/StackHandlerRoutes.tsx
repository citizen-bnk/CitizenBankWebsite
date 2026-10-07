import { APP_BASE_PATH } from "@/constants";
import { StackHandler, StackTheme } from "@stackframe/react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { stackClientApp } from "./stack";
import { joinPaths } from "./utils";
import DemoSignIn from "@/pages/DemoSignIn";
import { getPlatformConfig } from "utils/platform";
import { isSignInPath, wantsManualSignIn } from "utils/demoSignIn";

export const StackHandlerRoutes = () => {
  const location = useLocation();
  // In the demonstration environment the sign-in screen is the account picker, unless the visitor asks for the plain form.
  const [demo, setDemo] = useState<boolean | undefined>(undefined);
  const wantsPicker = isSignInPath(location.pathname) && !wantsManualSignIn(location.search);
  useEffect(() => {
    if (wantsPicker) getPlatformConfig().then((c) => setDemo(c.demo_mode));
  }, [wantsPicker]);
  if (wantsPicker && demo === undefined) return null;
  if (wantsPicker && demo) return <DemoSignIn />;

  return (
    <StackTheme>
      <StackHandler
        app={stackClientApp}
        location={joinPaths(APP_BASE_PATH, location.pathname)}
        fullPage={true}
      />
    </StackTheme>
  );
};
