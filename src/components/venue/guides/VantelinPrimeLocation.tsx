"use client";

import { vantelinPrimeLocations } from "@/data/venueGuides/vantelin-dome/prime-location";
import styles from "./VantelinPrimeLocation.module.css";

export default function VantelinPrimeLocation({ onRegion }: { onRegion: (level: string, area: string) => void }) {
  return <div className={styles.location}>
    <div className={styles.map}>
      <svg viewBox="0 0 500 470" role="img" aria-label="プライム席の位置関係。ホームが下、センターが上。左が3塁側、右が1塁側。">
        <ellipse cx="250" cy="238" rx="219" ry="218" fill="#f5f0f3" stroke="#d3c1ca" />
        <ellipse cx="250" cy="238" rx="158" ry="161" fill="#fff" stroke="#e2d4dc" />
        <path d="M250 147 L355 249 L250 357 L145 249 Z" fill="#e3efdf" />
        {vantelinPrimeLocations.map(region => <path key={region.id} d={region.path} fill={region.color} stroke="#fff" strokeWidth="2" />)}
        {vantelinPrimeLocations.map(region => <line key={`${region.id}-label`} x1={region.anchor[0]} y1={region.anchor[1]} x2={region.point[0]} y2={region.point[1]} stroke="#8b6c7b" strokeWidth="1.5" />)}
        <text x="250" y="235" textAnchor="middle">グラウンド</text>
        <text x="250" y="387" textAnchor="middle">ホーム側</text>
        <text x="390" y="17" textAnchor="middle">センター側</text>
      </svg>
      {vantelinPrimeLocations.map(region => <button key={region.id} type="button" data-prime-location={region.id} aria-label={`${region.label}の番号図へ`} style={{ left: `${region.point[0] / 5}%`, top: `${region.point[1] / 4.7}%` }} onClick={() => onRegion(region.level, region.area)}>{region.label}<small>{region.floor}</small></button>)}
    </div>
    <p>席種を選ぶと番号図へ進みます。位置関係の略図です。個別番号の球場内位置や、通り抜けできる経路は示していません。</p>
  </div>;
}
