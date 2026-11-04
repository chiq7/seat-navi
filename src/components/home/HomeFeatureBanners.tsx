import Image from "next/image";
import Link from "next/link";
import styles from "./HomeFeatureBanners.module.css";

const banners = [
  {
    image: "/images/home-features/tixrepo-arena-prediction-final.png",
    alt: "アリーナ予想。センステの形と、自分の席の位置を予想",
    href: "/search",
    action: "公演を探す",
  },
  {
    image: "/images/home-features/tixrepo-seating-chart.png",
    alt: "座席表。会場の座席表で、自分の席を調べる",
    href: "/venues",
    action: "会場の座席表を見る",
  },
  {
    image: "/images/home-features/tixrepo-onsite-reports.png",
    alt: "現地レポ。参加者の写真や感想で、会場の雰囲気を知る",
    href: "/news/how-to-use-tixrepo",
    action: "現地レポの見方",
  },
];

export default function HomeFeatureBanners() {
  return (
    <section className={styles.section} aria-labelledby="home-feature-banners-title">
      <div className={`zr-container ${styles.container}`}>
        <h2 id="home-feature-banners-title" className={styles.title}>ちけレポでできること</h2>
        <ul className={styles.grid} role="list">
          {banners.map(({ image, alt, href, action }) => (
            <li key={image}>
              <Link href={href} prefetch={false} className={styles.card}>
                <Image
                  src={image}
                  alt={alt}
                  width={1536}
                  height={1024}
                  sizes="(min-width: 1200px) 372px, (min-width: 900px) calc((100vw - 88px) / 3), (min-width: 600px) 560px, calc(100vw - 32px)"
                  className={styles.image}
                />
                <span className={styles.action}>
                  {action}<span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
