import { lazy, type ReactNode, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { userRoutes } from "./user-routes.tsx";
import { AppProvider } from "./components/AppProvider.tsx";

export const SuspenseWrapper = ({ children }: { children: ReactNode }) => {
  return <Suspense fallback={<main role="status" className="flex min-h-screen items-center justify-center">Loading Citizen Bank…</main>}>{children}</Suspense>;
};

const NotFoundPage = lazy(() => import("./pages/NotFoundPage.tsx"));
const SomethingWentWrongPage = lazy(
  () => import("./pages/SomethingWentWrongPage.tsx"),
);

export const router = createBrowserRouter(
  [
    {
      element: (
        <SuspenseWrapper>
          <AppProvider>
            <Outlet />
          </AppProvider>
        </SuspenseWrapper>
      ),
      children: userRoutes
    },
    {
      path: "*",
      element: (
        <SuspenseWrapper>
          <NotFoundPage />
        </SuspenseWrapper>
      ),
      errorElement: (
        <SuspenseWrapper>
          <SomethingWentWrongPage />
        </SuspenseWrapper>
      ),
    },
  ]
);
