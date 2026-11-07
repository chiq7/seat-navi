"use client";

import { useState } from "react";
import DiscoveryLink from "@/components/common/DiscoveryLink";
import { ArrowUpRight, Building2, ChevronRight } from "lucide-react";
import styles from "./HomeVenueDirectory.module.css";

type Props = {
  regions: readonly { id: string; label: string }[];
  venues: readonly { id: string; name: string; region: string; href: string }[];
};

// Keep venue-name units together on narrow screens without shortening the name.
const venueNameParts: Readonly<Record<string, readonly string[]>> = {
  "sapporo-dome": ["大和ハウス ", "プレミスト", "ドーム", "（札幌ドーム）"],
  "miyagi-arena": ["セキスイハイム", "スーパー", "アリーナ"],
  "saitama-super-arena": ["さいたま", "スーパー", "アリーナ"],
  "zozo-marine": ["ZOZOマリン", "スタジアム"],
  "mufg-stadium": ["MUFG", "スタジアム", "（国立競技場）"],
  "tokyo-garden-theater": ["東京ガーデン", "シアター"],
  "vantelin-dome": ["バンテリン", "ドーム", "ナゴヤ"],
  "gaishi-hall": ["クロコくん", "ホール", "（旧日本", "ガイシホール）"],
  "paypay-dome": ["みずほ", "PayPay", "ドーム福岡"],
  "edion-arena": ["エディオン", "アリーナ大阪"],
  "marine-messe": ["マリンメッセ", "福岡A館"],
};

export default function HomeVenueDirectory({ regions, venues }: Props) {
  const [region, setRegion] = useState("all");
  const visibleVenues = region === "all" ? venues : venues.filter(venue => venue.region === region);
  return (
    <section className={styles.section} aria-labelledby="home-venues-title">
      <div className="zr-container">
        <div className={styles.heading}>
          <h2 id="home-venues-title"><Building2 size={22} aria-hidden="true" /><span><span className={styles.keepTogether}>会場から</span><span className={styles.keepTogether}>座席表を探す</span></span></h2>
          <DiscoveryLink href="/venues" className="zr-focus" discovery={{ source: "home_directory", destination: "directory", destinationId: "venues" }}>全{venues.length}会場<ArrowUpRight size={15} aria-hidden="true" /></DiscoveryLink>
        </div>
        <div className={styles.filters} aria-label="会場の地域で絞り込む">
          {[{ id: "all", label: "全国" }, ...regions].map(item => (
            <button key={item.id} type="button" className="zr-focus" aria-pressed={region === item.id} aria-controls="home-venues-links" onClick={() => setRegion(item.id)}>{item.label}</button>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">{visibleVenues.length}会場を表示しています</p>
        <ul id="home-venues-links" className={styles.list}>
          {visibleVenues.map(venue => {
            const parts = venueNameParts[venue.id];
            const label = parts?.join("") === venue.name ? parts : [venue.name];
            return <li key={venue.id}><DiscoveryLink className="zr-focus" href={venue.href} discovery={{ source: "home_directory", destination: "venue", destinationId: venue.id }} aria-label={`${venue.name}の座席表を見る`}><span>{label.map((part, index) => <span className={styles.keepTogether} key={index}>{part}</span>)}</span><ChevronRight size={16} aria-hidden="true" /></DiscoveryLink></li>;
          })}
        </ul>
      </div>
    </section>
  );
}
