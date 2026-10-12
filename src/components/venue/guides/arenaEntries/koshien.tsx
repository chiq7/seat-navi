"use client";
import ArenaGuideContent from '../ArenaGuideContent';
import definition from '../arenaData/koshien';
export default function VenueGuide({embedded=false}:{embedded?:boolean}){return <ArenaGuideContent definition={definition} embedded={embedded}/>;}
