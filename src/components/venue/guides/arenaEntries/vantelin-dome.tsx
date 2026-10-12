"use client";
import ArenaGuideContent from '../ArenaGuideContent';
import definition from '../arenaData/vantelin-dome';
import VantelinPrimeLocation from '../VantelinPrimeLocation';
export default function VenueGuide({embedded=false}:{embedded?:boolean}){return <ArenaGuideContent definition={definition} embedded={embedded} primeLocation={VantelinPrimeLocation}/>;}
