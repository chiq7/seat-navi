import type { ComponentType, SVGProps } from "react";
import { Info, Milk, Ticket } from "lucide-react";

type SignProps = SVGProps<SVGSVGElement> & { size?: number };
export type DomeSignIcon = ComponentType<SignProps>;
function Sign({size=26,children,...props}:SignProps) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}
function Person({woman=false}:{woman?:boolean}) {
  return <g fill="currentColor" stroke="none"><circle cx="7" cy="5" r="3"/>{woman?<path d="M4 10h6l4 12h-4v8H7v-8H6v8H3v-8H0z"/>:<path d="M3 10h8l3 12h-3l-1-8v16H7V20H6v10H3V14l-1 8H0z"/>}</g>;
}
export function WomenSign(props:SignProps) { return <Sign {...props}><g transform="translate(9 0)"><Person woman/></g></Sign>; }
export function MenSign(props:SignProps) { return <Sign {...props}><g transform="translate(9 0)"><Person/></g></Sign>; }
export function ToiletSign(props:SignProps) { return <Sign {...props}><g transform="translate(1 1) scale(.85)"><Person/></g><g transform="translate(19 1) scale(.85)"><Person woman/></g></Sign>; }
export function AccessibleSign(props:SignProps) { return <Sign {...props}><circle cx="15" cy="5" r="3" fill="currentColor" stroke="none"/><path d="M14 10v10h9l5 9M14 14h9M14 10l-3 9" strokeWidth="3"/><path d="M10 16a8 8 0 1 0 12 10" strokeWidth="2.5"/></Sign>; }
export function LockerSign(props:SignProps) { return <Sign {...props}><rect x="3" y="3" width="26" height="27" rx="2"/><path d="M16 4v25M5 12h9M18 12h9"/><path d="M12 17v4M20 17v4" strokeWidth="2.6"/><circle cx="12" cy="24" r=".8" fill="currentColor"/><circle cx="20" cy="24" r=".8" fill="currentColor"/></Sign>; }
export function FoodSign(props:SignProps) { return <Sign {...props}><path d="M2 18c0-8 17-8 17 0zM2 22h17M3 26h15M3 29h15M23 11h7l-1 18h-6zM25 11l2-8h4"/><path d="M6 16h.1M12 16h.1" strokeWidth="2.5"/></Sign>; }
export function AtmSign(props:SignProps) { return <Sign {...props}><rect x="3" y="3" width="26" height="27" rx="2"/><path d="M7 8h18v9H7zM7 22h18M18 22v5h-9v-5"/><circle cx="16" cy="12.5" r="2"/></Sign>; }
export function WashSign(props:SignProps) { return <Sign {...props}><path d="M3 11h15V8h-5V4M9 4h9M18 11v4M4 24h24l-4 5H8zM9 21l6-3 8 3"/><path d="M18 17v2M23 17v2" strokeWidth="2.4"/></Sign>; }
export function ChargeSign(props:SignProps) { return <Sign {...props}><rect x="2" y="8" width="25" height="20" rx="3"/><path d="M3 14h23M7 22h5M24 2v10M19 7h10" strokeWidth="2.5"/></Sign>; }
export function StairsSign(props:SignProps) { return <Sign {...props}><path d="M3 29h8v-8h8v-8h8V5h3M4 15L16 3M4 5v10h10" strokeWidth="2.5"/></Sign>; }
export function ElevatorSign(props:SignProps) { return <Sign {...props}><path d="M10 8V2M7 5l3-3 3 3M22 2v6M19 5l3 3 3-3" strokeWidth="2.4"/><rect x="3" y="11" width="26" height="20" rx="2" strokeWidth="2.2"/><g transform="translate(11 13) scale(.55)"><Person/></g></Sign>; }
export function StrollerSign(props:SignProps) { return <Sign {...props}><path d="M4 15V4a12 11 0 0 1 12 11zM4 17h20c-1 6-5 8-10 8s-9-3-10-8zM23 17l4-12h4" strokeWidth="2.2"/><circle cx="8" cy="29" r="2" fill="currentColor"/><circle cx="23" cy="29" r="2" fill="currentColor"/></Sign>; }
export function ChangingSign(props:SignProps) { return <Sign {...props}><circle cx="9" cy="11" r="3"/><path d="M13 14h7l4 4M16 14l3-5M14 17l4 3 4-2M3 23h26M6 23v6M26 23v6" strokeWidth="2.3"/></Sign>; }
export const DOME_FACILITY_SIGNS = {
  women:WomenSign,men:MenSign,mixed:ToiletSign,unisex:ToiletSign,accessible:AccessibleSign,
  locker:LockerSign,baby:Milk,atm:AtmSign,stairs:StairsSign,information:Info,wash:WashSign,charge:ChargeSign,ticket:Ticket,food:FoodSign,
} satisfies Record<string,DomeSignIcon>;

export const DOME_FACILITY_CAPTIONS = {women:"女",men:"男",mixed:"男女",unisex:"共用",accessible:"WC",locker:"",baby:"",atm:"ATM",stairs:"",information:"",wash:"",charge:"IC",ticket:"",food:""};
