import { Link as RouterLink, type LinkProps } from "react-router-dom";
import { ecosystemDestination } from "utils/ecosystem";
export function Link({to,...props}:LinkProps) {
 const raw = typeof to === "string" ? to : (to.pathname || "") + (to.search || "") + (to.hash || "");
 const url = new URL(raw,window.location.origin);
 const target = url.origin === window.location.origin ? ecosystemDestination(url.pathname) : null;
 return target ? <a {...props} href={target + url.search + url.hash} /> : <RouterLink {...props} to={to} />;
}
