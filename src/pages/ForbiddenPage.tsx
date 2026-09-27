import { ErrorPage } from "components/ErrorPage";

export default function ForbiddenPage() {
  return (
    <ErrorPage
      title="403 - Access Forbidden"
      message="You don't have permission to access this resource. Please log in with an authorized account or contact support if you believe this is an error."
      showHomeButton={true}
      showPortalButton={true}
      showBackButton={true}
      showLoginButton={true}
    />
  );
}
