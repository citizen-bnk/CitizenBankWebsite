import { RouterProvider } from "react-router-dom";
import { Head } from "./internal-components/Head";
import { OuterErrorBoundary } from "./prod-components/OuterErrorBoundary";
import { router } from "./router";
import { ThemeProvider } from "./internal-components/ThemeProvider";
import { DEFAULT_THEME } from "./constants/default-theme";
import { StackProvider} from "@stackframe/react";
import { stackClientApp } from "./app/auth/stack";
import DemoBanner from "components/DemoBanner";
import { Suspense } from "react";


export const AppWrapper = () => {
  return (
    <OuterErrorBoundary>
      <Suspense fallback={<main role="status" className="flex min-h-screen items-center justify-center">Loading Citizen Bank…</main>}>
      <StackProvider app={stackClientApp}>
      <ThemeProvider defaultTheme={DEFAULT_THEME}>
        <RouterProvider router={router} />
        <Head />
        <DemoBanner />
      </ThemeProvider>
      </StackProvider>
      </Suspense>
    </OuterErrorBoundary>
  );
};
