"use client";
import dynamic from 'next/dynamic';
import GuideLoadBoundary,{GuideLoading} from './GuideLoadBoundary';
import type {ArenaVenueId} from './arenaEntryIds';
const entries={
  "toki-messe": dynamic(()=>import('./arenaEntries/toki-messe'),{loading:GuideLoading}),
  "hiroshima-arena": dynamic(()=>import('./arenaEntries/hiroshima-arena'),{loading:GuideLoading}),
  "miyagi-arena": dynamic(()=>import('./arenaEntries/miyagi-arena'),{loading:GuideLoading}),
  "edion-arena": dynamic(()=>import('./arenaEntries/edion-arena'),{loading:GuideLoading}),
  "makuhari-messe": dynamic(()=>import('./arenaEntries/makuhari-messe'),{loading:GuideLoading}),
  "nissan-stadium": dynamic(()=>import('./arenaEntries/nissan-stadium'),{loading:GuideLoading}),
  "mufg-stadium": dynamic(()=>import('./arenaEntries/mufg-stadium'),{loading:GuideLoading}),
  "koshien": dynamic(()=>import('./arenaEntries/koshien'),{loading:GuideLoading}),
  "zozo-marine": dynamic(()=>import('./arenaEntries/zozo-marine'),{loading:GuideLoading}),
  "belluna-dome": dynamic(()=>import('./arenaEntries/belluna-dome'),{loading:GuideLoading}),
  "sapporo-dome": dynamic(()=>import('./arenaEntries/sapporo-dome'),{loading:GuideLoading}),
  "paypay-dome": dynamic(()=>import('./arenaEntries/paypay-dome'),{loading:GuideLoading}),
  "vantelin-dome": dynamic(()=>import('./arenaEntries/vantelin-dome'),{loading:GuideLoading}),
  "gaishi-hall": dynamic(()=>import('./arenaEntries/gaishi-hall'),{loading:GuideLoading}),
  "marine-messe": dynamic(()=>import('./arenaEntries/marine-messe'),{loading:GuideLoading}),
  "budokan": dynamic(()=>import('./arenaEntries/budokan'),{loading:GuideLoading}),
  "yoyogi": dynamic(()=>import('./arenaEntries/yoyogi'),{loading:GuideLoading}),
  "saitama-super-arena": dynamic(()=>import('./arenaEntries/saitama-super-arena'),{loading:GuideLoading}),
  "ariake-arena": dynamic(()=>import('./arenaEntries/ariake-arena'),{loading:GuideLoading}),
  "pia-arena-mm": dynamic(()=>import('./arenaEntries/pia-arena-mm'),{loading:GuideLoading}),
  "tokyo-garden-theater": dynamic(()=>import('./arenaEntries/tokyo-garden-theater'),{loading:GuideLoading}),
  "yokohama-arena": dynamic(()=>import('./arenaEntries/yokohama-arena'),{loading:GuideLoading}),
  "osaka-jo-hall": dynamic(()=>import('./arenaEntries/osaka-jo-hall'),{loading:GuideLoading}),
};
export default function ArenaGuide({venue,embedded=false}:{venue:ArenaVenueId;embedded?:boolean}){const Entry=entries[venue];return <GuideLoadBoundary key={venue}><Entry embedded={embedded}/></GuideLoadBoundary>;}
