import { APP_BASE_PATH } from "@/constants";
import {
  type CurrentInternalServerUser,
  type CurrentUser,
  useStackApp,
  useUser,
} from "@stackframe/react";
import type * as React from "react";
import { createContext, useContext } from "react";
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { stackClientApp } from "app/auth";

type UserGuardContextType = {
  user: CurrentUser | CurrentInternalServerUser;
};

const UserGuardContext = createContext<UserGuardContextType | undefined>(
  undefined,
);

/**
 * Hook to access the logged in user from within a <UserGuard> component.
 */
export const useUserGuardContext = () => {
  const context = useContext(UserGuardContext);

  if (context === undefined) {
    throw new Error("useUserGuardContext must be used within a <UserGuard>");
  }

  return context;
};

export const UserGuard = (props: {
  children: React.ReactNode;
}) => {
  const app = useStackApp();
  const user = useUser();

  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!user) return;
    const limit = 10 * 60 * 1000;
    let last = Date.now();
    const key = 'citizen_last_activity';
    try { localStorage.setItem(key, String(last)); } catch { /* storage unavailable */ }
    let ending = false;
    const signOutForIdle = async () => {
      try { last = Math.max(last, Number(localStorage.getItem(key) || 0)); } catch { /* storage unavailable */ }
      if (ending || Date.now() - last <= limit) return;
      ending = true;
      await stackClientApp.signOut().catch(() => {});
      window.location.replace('/login?reason=timeout');
    };
    const activity = () => {
      try { last = Math.max(last, Number(localStorage.getItem(key) || 0)); } catch { /* storage unavailable */ }
      if (Date.now() - last > limit) void signOutForIdle();
      else { last = Date.now(); try { localStorage.setItem(key, String(last)); } catch { /* storage unavailable */ } }
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    const timer = window.setInterval(() => void signOutForIdle(), 20000);
    document.addEventListener('visibilitychange', signOutForIdle);
    return () => {
      events.forEach((event) => window.removeEventListener(event, activity));
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', signOutForIdle);
    };
  }, [user?.id]);

  if (!user) {
    const queryParams = new URLSearchParams(window.location.search);

    // Don't set the next param if the user is logging out
    // to avoid ending up in an infinite redirect loop
    if (pathname !== app.urls.signOut) {
      queryParams.set("next", pathname + search);
    }

    const queryString = queryParams.toString();

    return (
      <Navigate
        to={`${app.urls.signIn.replace(APP_BASE_PATH, "/").replace("//", "/")}?${queryString}`}
        replace={true}
      />
    );
  }

  return (
    <UserGuardContext.Provider value={{ user }}>
      {props.children}
    </UserGuardContext.Provider>
  );
};
