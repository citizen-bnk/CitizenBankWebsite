import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { RecoveryPage, recoveryFor } from "./RecoveryPage";

interface Props {
  children: ReactNode;
}

export const OuterErrorBoundary = ({ children }: Props) => {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => {
        const recovery = recoveryFor(error);
        return <RecoveryPage {...recovery} retry={() => {
          if (recovery.code === "PAGE_VERSION_CHANGED") window.location.reload();
          else resetErrorBoundary();
        }} />;
      }}
      onError={(error) => console.error("Website render failed", { message: error.message })}
    >
      {children}
    </ErrorBoundary>
  );
};
