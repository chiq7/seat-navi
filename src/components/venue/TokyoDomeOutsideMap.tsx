"use client";

import { useEffect, useRef, useState } from "react";
import { TrainFront, X, ExternalLink } from "lucide-react";
import type { DomeGuideMapZone, DomeGuideSpot } from "@/data/tokyoDomeVisitorGuide";
import { OUTSIDE_EVIDENCE, OUTSIDE_GATES, OUTSIDE_GATE_GROUPS, OUTSIDE_STATIONS, OUTSIDE_RING_EDGES } from "@/data/tokyoDomeOutsideGuide";
import { outsideMapLayout, outsideFacilityKind } from "@/lib/domeOutsideMapDisplay";
import { DOME_FACILITY_SIGNS, StairsSign } from "./DomeFacilitySigns";
import VenueLandmarkSearch from "./template/VenueLandmarkSearch";
import controls from "./template/VenueFacilityFinder.module.css";
import styles from "./TokyoDomeOutsideMap.module.css";

const kindNames = { mixed: "トイレ", accessible: "バリアフリートイレ", locker: "ロッカー", baby: "授乳", atm: "ATM", information: "案内", food: "飲食" };
const domeOutline = "M155 395 Q195 305 325 305 Q445 295 520 400 Q565 480 535 580 Q505 665 420 710 Q310 745 230 685 Q145 630 135 530 Q125 465 155 395Z";

export default function TokyoDomeOutsideMap({ spots, selectedZone, selectedSpotId, onSelectZone, compact=false, onNearby }: {
  compact?: boolean;
  onNearby?: (stationId: string | null) => void;
  spots: readonly DomeGuideSpot[];
  selectedZone: DomeGuideMapZone | null;
  selectedSpotId: string | null;
  onSelectZone: (zone: DomeGuideMapZone) => void;
}) {
  const [stationId, setStationId] = useState("");
  const [gateNumber, setGateNumber] = useState("");
  const [gateGroupId, setGateGroupId] = useState("");
  const [size, setSize] = useState({ width: 341, height: 540 });
  const mapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const layout = outsideMapLayout(spots, size.width, size.height);
  const selectedGate = OUTSIDE_GATES.find(gate => gate.number === gateNumber);
  const selectedStation = OUTSIDE_STATIONS.find(station => station.id === stationId);
  const selectedGroup = layout.groups.find(group => group.id === selectedZone || group.members.some(spot => spot.id === selectedSpotId));
  const pendingGateGroup = OUTSIDE_GATE_GROUPS.find(group => group.id === gateGroupId);
  const pendingGateMarker = layout.labels.find(marker => marker.id === gateGroupId);
  function chooseStation(id: string) {
    const next = stationId === id ? "" : id;
    setStationId(next); setGateNumber(""); setGateGroupId("");
    onNearby?.(next || null);
  }
  function chooseGate(number: string) { setGateNumber(number); setGateGroupId(""); setStationId(""); onNearby?.(null); }
  function clearPlace() { setStationId(""); setGateNumber(""); setGateGroupId(""); onNearby?.(null); }
  return <section className={styles.guide} aria-label="場外・入場前の地図">
    <div className={styles.heading}><strong>駅・ゲート・入場前の設備</strong><span>東京ドーム周辺</span></div>
    {compact&&<div className={controls.panelHeading}><VenueLandmarkSearch landmarks={OUTSIDE_GATES.map(gate=>({id:gate.number,kind:"gate",label:`${gate.number}ゲート`}))} onShow={chooseGate}/></div>}
    {!compact && <div className={styles.stationChoices} aria-label="駅周辺の設備">{OUTSIDE_STATIONS.map(station => <button key={station.id} type="button" aria-pressed={stationId === station.id} onClick={() => chooseStation(station.id)}>{station.name}・{station.exit}</button>)}</div>}
    <div className={styles.routeSummary} aria-live="polite">
      <span>{selectedStation ? `${selectedStation.name} ${selectedStation.exit}周辺` : selectedGate ? `${selectedGate.number}ゲート付近` : pendingGateGroup ? "ゲートを選んでください" : "駅周辺・ゲート付近を探す"}</span>
      {(stationId || gateNumber || gateGroupId) && <button type="button" aria-label="目印の選択を解除" onClick={clearPlace}><X size={18}/></button>}
    </div>
    <div ref={mapRef} className={styles.map} data-map-interaction="selection-only" data-outside-map="true" data-nearby-station={stationId} data-selected-gate={gateNumber}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true" className={styles.drawing}>
        <g transform={`translate(${layout.offset.x} ${layout.offset.y}) scale(${layout.scale.x} ${layout.scale.y})`}>
          <path d="M10 250H80V850H15Z" fill="#e6f0e9"/>
          <text x="45" y="600" textAnchor="middle" fill="#6a8773" fontSize="25" transform="rotate(-90 45 600)">小石川後楽園</text>
          <path d="M30 65H900M970 40V1200M35 1125H980" fill="none" stroke="#eae5e9" strokeWidth="32"/>
          <path d="M5 1205H995" stroke="#b9b4bd" strokeWidth="6" strokeDasharray="12 9"/>
          <text x="550" y="1235" textAnchor="middle" fill="#8c8390" fontSize="25">JR中央・総武線</text>
          {OUTSIDE_RING_EDGES.map(edge => <polyline key={edge.from} points={edge.points.map(point=>point.join(",")).join(" ")} fill="none" stroke="#e8e3e7" strokeWidth="40" strokeLinejoin="round" strokeLinecap="round"/>)}
          {OUTSIDE_STATIONS.map(station => <polyline key={station.id} points={station.points.map(point=>point.join(",")).join(" ")} fill="none" stroke="#e8e3e7" strokeWidth="25" strokeLinejoin="round" strokeLinecap="round"/>)}
          <path d={domeOutline} fill="#fcf9fb" stroke="#d3b7c5" strokeWidth="6"/>
          <path d="M195 415Q345 330 485 435M165 490Q350 385 525 495M165 565Q345 445 520 550M200 630Q355 525 475 630" fill="none" stroke="#eddee6" strokeWidth="8"/>
          <rect x="420" y="105" width="425" height="155" rx="35" fill="#f1e8dc" stroke="#d3c2af" strokeWidth="4"/>
          <rect x="715" y="505" width="195" height="220" rx="28" fill="#e7eeed" stroke="#c4d4d1" strokeWidth="4"/>
          <rect x="170" y="805" width="205" height="110" rx="17" fill="#eee6ed" stroke="#d2c3cd" strokeWidth="4"/>
          <rect x="145" y="970" width="195" height="105" rx="17" fill="#fff0ca" stroke="#e1c884" strokeWidth="4"/>
          <rect x="565" y="895" width="145" height="205" rx="20" fill="#e9e9f4" stroke="#c7c5db" strokeWidth="4"/>
          <rect x="815" y="910" width="125" height="165" rx="20" fill="#f3e4de" stroke="#dcc6bd" strokeWidth="4"/>
          <rect x="455" y="800" width="180" height="70" rx="13" fill="#f0edf1" stroke="#d7d0db" strokeWidth="3"/>
          <text x="545" y="842" textAnchor="middle" fill="#958a96" fontSize="23">プリズムホール</text>

        </g>
        <text x={layout.project(335,515).x} y={layout.project(335,515).y} textAnchor="middle" fill="#a93164" fontSize={size.width<500?14:22} fontWeight="800">東京ドーム</text>
        <text x={layout.project(335,515).x} y={layout.project(335,515).y+20} textAnchor="middle" fill="#9f8d98" fontSize="10">入場前</text>
        {[{id:"laqua",name:"ラクーア",x:650,y:180},{id:"korakuen-hall",name:"後楽園ホール",x:280,y:850},{id:"yellow-building",name:"黄色いビル",x:240,y:1020},{id:"attractions",name:"ジオポリス",x:810,y:640},{id:"dome-hotel",name:"ドームホテル",x:650,y:1010},{id:"meets-port",name:"ミーツポート",x:890,y:1000}].filter(building=>!layout.groups.some(group=>group.id===building.id)).map(building=><text key={building.id} {...layout.project(building.x,building.y)} textAnchor="middle" fill="#897b86" fontSize="10">{building.name}</text>)}
        {layout.labels.map(marker => <g key={marker.id} data-outside-anchor={marker.id}><line x1={marker.x} y1={marker.y} x2={marker.left} y2={marker.top} stroke={marker.kind==="facility"?"#c7a6b8":"#d1cbd0"} strokeWidth="1"/><circle cx={marker.x} cy={marker.y} r="2.5" fill={marker.kind==="facility"?"#a93164":"#6c5b65"}/></g>)}
      </svg>
      {layout.labels.map(marker => {
        const position = { left: marker.left, top: marker.top, width: marker.width, height: marker.height };
        const station = OUTSIDE_STATIONS.find(item=>item.id===marker.id);
        if(station) return <button key={marker.id} type="button" style={position} className={styles.station} aria-pressed={stationId===station.id} aria-label={`${station.name} ${station.exit}周辺の設備`} onClick={()=>chooseStation(station.id)} data-outside-station={station.id}><span><TrainFront size={14} aria-hidden="true"/>{station.name}</span><strong>{station.exit}</strong></button>;
        const gate = OUTSIDE_GATE_GROUPS.find(item=>item.id===marker.id);
        if(gate) {
          const group=layout.groups.find(item=>item.id===layout.mergedZones[gate.id]);
          const primary=selectedGate?.group===gate.id?selectedGate.number:gate.gates.join("・");
          return <button key={marker.id} type="button" style={position} className={styles.gate} aria-pressed={selectedGate?.group===gate.id || gateGroupId === gate.id} aria-label={`${gate.gates.join("・")}ゲート付近を選ぶ${group?`：${group.kinds.map(kind=>kindNames[kind]).join("・")}`:""}`} onClick={()=>{if (gate.gates.length === 1) chooseGate(gate.gates[0]); else { setGateNumber(""); setGateGroupId(gate.id); setStationId(""); onNearby?.(null); } if(group)onSelectZone(group.id);}} data-outside-gate={gate.id} data-outside-zone={group?.id} data-visible-facility-types={group?.kinds.length}><strong>{primary}<small>G</small>{group&&group.kinds.map(kind=>{const Icon=DOME_FACILITY_SIGNS[kind];return <Icon key={kind} size={18} data-facility-kind={kind} aria-hidden="true"/>;})}</strong></button>;
        }
        const group=layout.groups.find(item=>item.id===marker.id)!;
        return <button key={marker.id} type="button" style={position} className={styles.facilities} data-outside-zone={group.id} data-visible-facility-types={group.kinds.length} aria-label={`${group.label}：${group.kinds.map(kind=>kindNames[kind]).join("・")}`} aria-pressed={selectedGroup?.id===group.id} onClick={()=>{clearPlace();onSelectZone(group.id);}}><span className={styles.icons}>{group.kinds.map(kind=>{const Icon=DOME_FACILITY_SIGNS[kind];return <span key={kind} data-facility-kind={kind} title={kindNames[kind]}><Icon size={22} aria-hidden="true"/>{kind==="atm"&&<small>ATM</small>}</span>;})}</span><span className={styles.caption}>{group.short}</span></button>;
      })}
      {pendingGateGroup && pendingGateMarker && <div className={styles.gateChoices} style={{left:Math.max(144,Math.min(size.width-144,pendingGateMarker.left)),top:Math.max(8,Math.min(size.height-104,pendingGateMarker.top+pendingGateMarker.height/2+8))}} role="group" aria-label="個別ゲートを選ぶ"><strong>ゲートを選ぶ</strong><div>{pendingGateGroup.gates.map(number => <button key={number} type="button" onClick={() => chooseGate(number)}>{number}ゲート</button>)}</div></div>}
    </div>
    {selectedGate && <div className={styles.gateDetail}><strong>{selectedGate.number}ゲート · {selectedGate.level}</strong><span>{selectedGate.side}</span>{["3F","4F"].includes(selectedGate.level)&&<span><StairsSign size={20} aria-hidden="true"/>上階ゲート</span>}</div>}
    {!compact && selectedGroup && <div className={styles.selectedFacilities} aria-label="選択中の場外施設"><strong>{selectedGroup.label}</strong>{selectedGroup.members.map(spot=>{const kind=outsideFacilityKind(spot);const Icon=DOME_FACILITY_SIGNS[kind];return <span key={spot.id}><Icon size={18} aria-hidden="true"/><span>{spot.location}</span></span>;})}</div>}
    <div className={styles.mapFooter}><span>方向・位置関係の目安</span><a href={OUTSIDE_EVIDENCE.access} target="_blank" rel="noopener noreferrer">段差のない経路<ExternalLink size={12} aria-hidden="true"/></a></div>
    {selectedStation&&"warning" in selectedStation&&<p className={styles.warning}>{selectedStation.warning}</p>}
  </section>;
}
