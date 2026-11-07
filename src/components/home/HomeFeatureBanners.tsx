"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import DiscoveryLink from "@/components/common/DiscoveryLink";
import styles from "./HomeFeatureBanners.module.css";

const banners = [
  {
    image: "/images/home-features/tixrepo-arena-prediction-final.png",
    alt: "アリーナ予想。センステの形と、自分の席の位置を予想",
    href: "/search",
    action: "公演を探す",
    directory: "artists",
  },
  {
    image: "/images/home-features/tixrepo-seating-chart.png",
    alt: "座席表。会場の座席表で、自分の席を調べる",
    href: "/venues",
    action: "会場の座席表を見る",
    directory: "venues",
  },
  {
    image: "/images/home-features/tixrepo-onsite-reports.png",
    alt: "現地レポ。参加者の写真や感想で、会場の雰囲気を知る",
    href: "/news/how-to-use-tixrepo",
    action: "現地レポの見方",
  },
];

const edgeCount = 2;
const slides = [...banners.slice(-edgeCount), ...banners, ...banners.slice(0, edgeCount)];
const autoplayDelay = 6000;
const motionPreference = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const media = window.matchMedia(motionPreference);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function prefersReducedMotion() {
  return window.matchMedia(motionPreference).matches;
}

function centeredSlideIndex(rail: HTMLUListElement) {
  const center = rail.scrollLeft + rail.clientWidth / 2;
  let nearest = 0;
  let closest = Infinity;
  Array.from(rail.children).forEach((child, index) => {
    const slide = child as HTMLElement;
    const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
    if (distance < closest) {
      closest = distance;
      nearest = index;
    }
  });
  return nearest;
}

function centerSlide(rail: HTMLUListElement, index: number, behavior: ScrollBehavior) {
  const slide = rail.children.item(index) as HTMLElement | null;
  if (slide) rail.scrollTo({ left: slide.offsetLeft + (slide.offsetWidth - rail.clientWidth) / 2, behavior });
}

export default function HomeFeatureBanners() {
  const railRef = useRef<HTMLUListElement>(null);
  const [autoplay, setAutoplay] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, () => false);
  const playing = autoplay ?? !reducedMotion;

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    rail.dataset.ready = "true";
    centerSlide(rail, edgeCount, "instant");
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let settle: ReturnType<typeof setTimeout>;
    function wrapAtRest() {
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (!rail) return;
        const index = centeredSlideIndex(rail);
        if (index < edgeCount) centerSlide(rail, index + banners.length, "instant");
        if (index >= edgeCount + banners.length) centerSlide(rail, index - banners.length, "instant");
      }, 140);
    }
    rail.addEventListener("scroll", wrapAtRest, { passive: true });
    return () => {
      clearTimeout(settle);
      rail.removeEventListener("scroll", wrapAtRest);
    };
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !playing) return;
    const timer = window.setInterval(() => {
      const { top, bottom } = rail.getBoundingClientRect();
      const hovering = window.matchMedia("(hover: hover)").matches && rail.matches(":hover");
      if (document.hidden || hovering || bottom <= 0 || top >= window.innerHeight) return;
      centerSlide(rail, centeredSlideIndex(rail) + 1, reducedMotion ? "instant" : "smooth");
    }, autoplayDelay);
    return () => window.clearInterval(timer);
  }, [playing, reducedMotion]);

  function pauseOnInteraction() {
    setAutoplay(false);
  }

  return (
    <section className={styles.section} aria-labelledby="home-feature-banners-title">
      <div className={`zr-container ${styles.container}`}>
        <h1 id="home-feature-banners-title" className="sr-only">ちけレポでできること</h1>
        <ul id="home-feature-banners" className={styles.rail} role="list" ref={railRef} onPointerDown={pauseOnInteraction} onWheel={pauseOnInteraction} onFocus={pauseOnInteraction}>
          {slides.map(({ image, alt, href, action, directory }, index) => {
            const isEdge = index < edgeCount || index >= edgeCount + banners.length;
            const linkLabel = `${alt}。${action}`;
            const card = (
              <Image
                src={image}
                alt={isEdge ? "" : alt}
                width={1536}
                height={1024}
                sizes="(min-width: 800px) 670px, 85vw"
                preload={index === edgeCount}
                draggable={false}
                className={styles.image}
              />
            );
            return (
              <li className={styles.slide} key={`${image}-${index}`} aria-hidden={isEdge || undefined}>
                {isEdge ? <span className={styles.card}>{card}</span> : directory ? (
                  <DiscoveryLink href={href} prefetch={false} className={styles.card} aria-label={linkLabel} discovery={{ source: "home_hero", destination: "directory", destinationId: directory }}>
                    {card}
                  </DiscoveryLink>
                ) : (
                  <Link href={href} prefetch={false} className={styles.card} aria-label={linkLabel}>{card}</Link>
                )}
              </li>
            );
          })}
        </ul>
        <div className={styles.controls}>
          <button type="button" className={`zr-focus ${styles.playback}`} aria-controls="home-feature-banners" aria-label={playing ? "バナーの自動切り替えを停止" : "バナーの自動切り替えを再生"} onClick={() => setAutoplay(!playing)}>
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </section>
  );
}
