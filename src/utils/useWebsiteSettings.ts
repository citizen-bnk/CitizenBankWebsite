import {useQuery} from '@tanstack/react-query';
const defaults={site_name:'Citizen Bank',company_name:'Citizen Digital Ltd',contact_email:'admin@citizenbank.co.ls',notice:'Citizen Bank is in pre-licensing. Banking services are not yet licensed for real-money operations.'};
export function useWebsiteSettings(){return useQuery({queryKey:['website-settings'],queryFn:async()=>{const r=await fetch('/api/website-settings/public');if(!r.ok)throw Error('Settings unavailable');return {...defaults,...await r.json()} as typeof defaults;},staleTime:60000,retry:1}).data||defaults;}
