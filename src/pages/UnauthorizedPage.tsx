import { ErrorPage } from "components/ErrorPage";

export default function UnauthorizedPage() {
  return (
    <ErrorPage
      title="401 - Unauthorized"
      message="You need to be logged in to access this page. Please sign in to continue."
      showHomeButton={true}
      showPortalButton={false}
      showBackButton={true}
      showLoginButton={true}
    />
  );
}
