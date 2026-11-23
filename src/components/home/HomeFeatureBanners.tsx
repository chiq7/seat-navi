"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import DiscoveryLink from "@/components/common/DiscoveryLink";
import styles from "./HomeFeatureBanners.module.css";

const banners = [
  {
    image: "/images/home-features/tixrepo-seating-chart.webp",
    alt: "座席表。会場の座席表で、自分の席を調べる",
    href: "/venues",
    action: "会場の座席表を見る",
    directory: "venues",
  },
  {
    image: "/images/home-features/tixrepo-arena-prediction-final.webp",
    alt: "アリーナ予想。ステージの形と、自分の席の位置を予想",
    href: "/#upcoming-events",
    action: "開催が近い公演の座席情報を見る",
  },
  {
    image: "/images/home-features/tixrepo-onsite-reports.webp",
    alt: "現地レポ。参加者の写真や感想で、会場の雰囲気を知る",
    href: "/venues#seat-photos",
    action: "会場の写真を見る",
  },
];

const edgeCount = 2;
const slides = [...banners.slice(-edgeCount), ...banners, ...banners.slice(0, edgeCount)];
// Each banner rests 2 s, then glides to the next over 1.2 s (the browser's own smooth scroll felt abrupt).
const restMs = 2000;
const glideMs = 1200;

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

function slideLeft(rail: HTMLUListElement, index: number) {
  const slide = rail.children.item(index) as HTMLElement | null;
  return slide ? slide.offsetLeft + (slide.offsetWidth - rail.clientWidth) / 2 : null;
}

function centerSlide(rail: HTMLUListElement, index: number, behavior: ScrollBehavior) {
  const left = slideLeft(rail, index);
  if (left !== null) rail.scrollTo({ left, behavior });
}

/** Eased scroll to a slide. Snapping is off while it runs so the browser does not cut the glide short. Returns a cancel. */
function glideToSlide(rail: HTMLUListElement, index: number) {
  const to = slideLeft(rail, index);
  if (to === null) return () => {};
  const from = rail.scrollLeft;
  const start = performance.now();
  let frame = 0;
  rail.style.scrollSnapType = "none";
  const finish = () => { rail.style.scrollSnapType = ""; };
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / glideMs);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    rail.scrollLeft = from + (to - from) * eased;
    if (t < 1) frame = requestAnimationFrame(step); else finish();
  };
  frame = requestAnimationFrame(step);
  return () => { cancelAnimationFrame(frame); finish(); };
}

export default function HomeFeatureBanners() {
  const railRef = useRef<HTMLUListElement>(null);
  // Slides on its own, also when the OS asks for reduced motion (owner's choice). Touching, scrolling or focusing
  // the banners stops it for good.
  const [stopped, setStopped] = useState(false);
  const playing = !stopped;

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
    let cancelGlide = () => {};
    const timer = window.setInterval(() => {
      const { top, bottom } = rail.getBoundingClientRect();
      const hovering = window.matchMedia("(hover: hover)").matches && rail.matches(":hover");
      if (document.hidden || hovering || bottom <= 0 || top >= window.innerHeight) return;
      cancelGlide = glideToSlide(rail, centeredSlideIndex(rail) + 1);
    }, restMs + glideMs);
    return () => {
      window.clearInterval(timer);
      cancelGlide();
    };
  }, [playing]);

  function pauseOnInteraction() {
    setStopped(true);
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
                unoptimized
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
      </div>
    </section>
  );
}
