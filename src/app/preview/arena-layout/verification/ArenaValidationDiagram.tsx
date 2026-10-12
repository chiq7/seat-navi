"use client";

import { containsPoint, localToWorld, type ArenaLayout, type Point, type Shape, type Bounds } from "@/lib/arena-map/layoutModel";
import { type LayoutConsensus, type SeatRelation } from "@/lib/arena-map/layoutConsensus";
import styles from "./verification.module.css";

function Stage({shape}:{shape:Shape}) {
  return shape.kind === "circle" ? <circle cx={shape.center.x} cy={shape.center.y} r={shape.radius}/> : <polygon points={shape.points.map(p=>`${p.x},${p.y}`).join(" ")}/>;
}
const dotPath = (points:Point[],radius:number)=>points.map(p=>`M${p.x-radius},${p.y}a${radius},${radius} 0 1 0 ${radius*2},0a${radius},${radius} 0 1 0 ${-radius*2},0`).join(" ");
export function ArenaValidationDiagram({layout,points,chairs,title,consensus,self,viewportBounds,outlines=false,comparison,alternateSelf}:{layout:ArenaLayout;points:Point[];chairs?:Point[];title:string;consensus?:LayoutConsensus;self?:SeatRelation;viewportBounds?:Bounds;outlines?:boolean;comparison?:ArenaLayout;alternateSelf?:Point}) {
  const bottom = Math.max(...layout.blocks.flatMap(block=>block.outline.map(p=>localToWorld(block,p).y)), ...layout.landmarks.flatMap(l=>l.shape.kind === "circle" ? [l.shape.center.y+l.shape.radius] : l.shape.points.map(p=>p.y)), ...points.map(p=>p.y));
  const b=viewportBounds ?? (outlines ? {...layout.bounds,height:Math.max(240,bottom+14-layout.bounds.y)} : layout.bounds);
  return <svg viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`} role="img" aria-label={title} className={styles.diagram}>
    <rect x={b.x} y={b.y} width={b.width} height={b.height} fill="#fcfafb"/>
    {outlines && <g fill="white" stroke="#ded4dc" strokeWidth=".75">{layout.blocks.map(block=><polygon key={block.id} transform={`translate(${block.origin.x} ${block.origin.y}) rotate(${block.rotation})`} points={block.outline.map(p=>`${p.x},${p.y}`).join(" ")}/>)}</g>}
    {chairs && <g fill="#d1d8db">{outlines && chairs.length>250 ? <path d={dotPath(chairs,1.25)}/> : chairs.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="1.25"/>)}</g>}
    {consensus && <><path d={consensus.possiblePath} fill="#ded2e3" fillOpacity=".7"/><path d={consensus.commonPath} fill="#695778" fillOpacity=".9"/></>}
    <g fill="#695778" fillOpacity=".9" stroke="#695778" strokeWidth="1" strokeDasharray="3 2">{layout.landmarks.filter(l=>l.kind !== "passage" && (!consensus || l.kind === "main")).map(l=><Stage key={l.id} shape={l.shape}/>)}</g>
    <g fill="#c5e2df" stroke="#36788a" strokeWidth="1" strokeDasharray="2 2">{layout.landmarks.filter(l=>l.kind === "passage").map(l=><Stage key={l.id} shape={l.shape}/>)}</g>
    {comparison && <g fill="none" stroke="#1593a2" strokeWidth="2.5" strokeDasharray="6 3"><title>完成図の舞台</title>{comparison.landmarks.filter(l=>l.kind !== "main").map(l=><Stage key={l.id} shape={l.shape}/>)}</g>}
    <g fill="#36788a" stroke="white" strokeWidth=".4">{outlines && points.length>250 ? <path d={dotPath(points,2.6)}/> : points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="2.6"/>)}</g>
    {layout.blocks.filter(block=>!outlines || !layout.landmarks.some(l=>containsPoint(l.shape,block.labelAt))).map(block=><text key={block.id} x={block.labelAt.x} y={block.labelAt.y} textAnchor="middle" fontSize={outlines ? 12 : 10} fontWeight="700" fill="#695778" stroke="#fcfafb" strokeWidth="2.5" paintOrder="stroke">{block.id}</text>)}
    {layout.landmarks.filter(l=>l.kind === "main").map(l=><text key={l.id} x={l.labelAt.x} y={l.labelAt.y+4} textAnchor="middle" fill="white" fontSize="15" fontWeight="700">メイン</text>)}
    {outlines && layout.landmarks.filter(l=>l.kind === "center" || l.kind === "equipment").map(l=><text key={l.id} x={l.labelAt.x} y={l.labelAt.y+3} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">{l.label}</text>)}
    {outlines && layout.landmarks.filter(l=>l.kind === "passage").map(l=><text key={l.id} x={l.labelAt.x} y={l.labelAt.y+3} textAnchor="middle" fill="#245e6b" fontSize="10" fontWeight="700">{l.label}</text>)}
    {self?.bounds && <g stroke="#c12d69" strokeWidth="2" fill="#c12d69" fillOpacity=".12">
      {self.bounds.width || self.bounds.height ? <rect x={self.bounds.x-4} y={self.bounds.y-4} width={self.bounds.width+8} height={self.bounds.height+8} rx="4" strokeDasharray="3 2"/> : <circle cx={self.bounds.x} cy={self.bounds.y} r={outlines ? 8 : 6}/>}
    </g>}
    {outlines && self?.representative && <text x={self.representative.x} y={self.representative.y-13} textAnchor="middle" fontSize="15" fontWeight="800" fill="#c12d69" stroke="white" strokeWidth="4" paintOrder="stroke">自分</text>}
    {alternateSelf && <g fill="none" stroke="#c12d69" strokeWidth="2" strokeDasharray="3 2"><circle cx={alternateSelf.x} cy={alternateSelf.y} r="8"/><text x={alternateSelf.x} y={alternateSelf.y+22} textAnchor="middle" fontSize="12" fill="#c12d69" stroke="white" strokeWidth="3" paintOrder="stroke">逆向き</text></g>}
  </svg>;
}
