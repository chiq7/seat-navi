import { Search } from "lucide-react";
import Link from "next/link";
import styles from "./HomeQuickSearch.module.css";

export default function HomeQuickSearch() {
  return (
    <section className={styles.section} aria-label="公演・会場の検索">
      <form action="/search" method="get" className={styles.form} role="search">
        <label htmlFor="home-search" className="sr-only">会場・アーティストを探す</label>
        <Search size={18} aria-hidden="true" className={styles.icon} />
        <input id="home-search" name="q" type="search" placeholder="会場・アーティスト" enterKeyHint="search" />
        <button type="submit">検索</button>
      </form>
      <Link href="/venues#seat-photos" className={styles.venues}>座席表・写真</Link>
    </section>
  );
}
