import type {Metadata} from 'next';

import {Header} from '@/components/Header';
import './globals.css';
export const metadata:Metadata={title:{default:'Citizen Bank · Built around you',template:'%s · Citizen Bank'},icons:{icon:'/brand/logo.webp'},description:'Discover Citizen Bank and connect to banking, investment and governance services.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip" href="#main">Skip to content</a><Header/><main id="main">{children}</main><footer><a className="brand" href="/">citizen bank</a><p>A connected future. Built around you.</p><div><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/hub">Citizen Hub ↗</a></div><small>Citizen Bank is in the pre-licensing stage. Banking services are demonstrations; they do not accept deposits or move real money.</small></footer></body></html>;}
