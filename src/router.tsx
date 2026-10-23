import { lazy, type ReactNode, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { userRoutes } from "./user-routes.tsx";
import { AppProvider } from "./components/AppProvider.tsx";

export const SuspenseWrapper = ({ children }: { children: ReactNode }) => {
  return <Suspense fallback={<div role="status" style={{ minHeight: "40vh", display: "grid", placeItems: "center", color: "#5a4289" }}>Opening page…</div>}>{children}</Suspense>;
};

const NotFoundPage = lazy(() => import("./pages/NotFoundPage.tsx"));
import SomethingWentWrongPage from "./pages/SomethingWentWrongPage.tsx";

export const router = createBrowserRouter(
  [
    {
      element: (
        <AppProvider>
          <SuspenseWrapper>
            <Outlet />
          </SuspenseWrapper>
        </AppProvider>
      ),
      errorElement: <SomethingWentWrongPage />,
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
