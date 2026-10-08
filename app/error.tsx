"use client";
import {Recovery} from '@/components/Recovery';
export default function ErrorPage({error}:{error:Error&{digest?:string}}){return <Recovery message="The website could not complete this page request. Retry, go back, or return home." reference={error.digest}/>;}
