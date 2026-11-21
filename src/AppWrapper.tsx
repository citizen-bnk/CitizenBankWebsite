import { RouterProvider } from "react-router-dom";
import { Head } from "./internal-components/Head";
import { OuterErrorBoundary } from "./prod-components/OuterErrorBoundary";
import { router } from "./router";
import { ThemeProvider } from "./internal-components/ThemeProvider";
import { DEFAULT_THEME } from "./constants/default-theme";
import { StackProvider} from "@stackframe/react";
import { stackClientApp } from "./app/auth/stack";
import ServiceNotice from "components/ServiceNotice";
import DemoBanner from "components/DemoBanner";


export const AppWrapper = () => {
  return (
    <OuterErrorBoundary>
      <StackProvider app={stackClientApp}>
      <ThemeProvider defaultTheme={DEFAULT_THEME}>
        <ServiceNotice statusUrl="/api/health/ready" websiteUrl="/"/>
        <RouterProvider router={router} />
        <Head />
        <DemoBanner />
      </ThemeProvider>
      </StackProvider>
    </OuterErrorBoundary>
  );
};