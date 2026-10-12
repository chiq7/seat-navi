"use client";
import ArenaGuideContent from '../ArenaGuideContent';
import definition from '../arenaData/pia-arena-mm';
export default function VenueGuide({embedded=false}:{embedded?:boolean}){return <ArenaGuideContent definition={definition} embedded={embedded}/>;}
