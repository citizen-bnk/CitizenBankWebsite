import { useRouteError } from "react-router-dom";
import { RecoveryPage, recoveryFor } from "../prod-components/RecoveryPage";

export default function SomethingWentWrongPage() {
  const recovery = recoveryFor(useRouteError());
  return <RecoveryPage {...recovery} retry={() => window.location.reload()} />;
}
