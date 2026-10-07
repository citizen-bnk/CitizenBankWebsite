import { useEffect, useState } from "react";
import { loadPublicPolicies } from "utils/publicContentApi";
import { licenceStatus, type Policies } from "utils/publicContent";

/** The licence-status sentence (policy `legal.licence_status`, with a built-in default if the policy is unavailable). */
export function LicenceStatusNote({ policies, className = "" }: { policies?: Policies | null; className?: string }) {
  const [loaded, setLoaded] = useState<Policies | null>(null);
  useEffect(() => {
    if (policies === undefined) loadPublicPolicies().then(setLoaded);
  }, [policies]);
  return (
    <p className={`text-sm text-gray-600 ${className}`} data-testid="licence-status">
      {licenceStatus(policies === undefined ? loaded : policies)}
    </p>
  );
}
