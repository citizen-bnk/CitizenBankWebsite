import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ecosystemDestination } from "utils/ecosystem";
export default function ServiceRedirect(){const {pathname,search,hash}=useLocation();const target=ecosystemDestination(pathname);useEffect(()=>{if(target)window.location.replace(target+search+hash);},[target,search,hash]);return <main role="status" className="flex min-h-screen flex-col items-center justify-center gap-4"><p>{target?"Opening your Citizen service…":"This Citizen service is currently unavailable."}</p><a href="/">Back to Citizen Bank website</a></main>;}
