"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

interface ScrollExpandMediaProps {
  mediaType?: "video" | "image";
  mediaSrc: string;
  posterSrc?: string;
  bgImageSrc?: string;
  title?: string;
  subtitle?: string;
  scrollToExpand?: string;
  textBlend?: boolean;
  children?: ReactNode;
}

export default function ScrollExpandMedia({
  mediaType = "image",
  mediaSrc,
  posterSrc,
  bgImageSrc,
  title = "WEATHER ANALYTICS",
  subtitle = "Understand the weather through data.",
  scrollToExpand = "Scroll to explore",
  textBlend = false,
  children,
}: ScrollExpandMediaProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Ref เก็บค่าล่าสุดให้ event listener อ่านได้ทันที
  const progressRef = useRef(0);
  const touchYRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const reduceMotion = useReducedMotion();
  const expanded = scrollProgress >= 1 || Boolean(reduceMotion);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  // Deep links and native scrollbar navigation can bypass the wheel animation.
  // Reset or reveal in the same frame so source changes cannot race the reveal.
  useEffect(() => {
    const isPastHero = () => {
      const section = sectionRef.current;
      return Boolean(section && section.getBoundingClientRect().top <= -window.innerHeight * 0.5);
    };
    const revealPastHero = () => {
      if (isPastHero() && progressRef.current < 1) {
        progressRef.current = 1;
        setScrollProgress(1);
      }
    };
    const frame = requestAnimationFrame(() => {
      const initialProgress = isPastHero() ? 1 : 0;
      progressRef.current = initialProgress;
      setScrollProgress(initialProgress);
    });
    window.addEventListener("scroll", revealPastHero, { passive: true });
    window.addEventListener("resize", revealPastHero);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", revealPastHero);
      window.removeEventListener("resize", revealPastHero);
    };
  }, [mediaType, mediaSrc]);

  useEffect(() => {
    if (reduceMotion) return;

    const isAtHeroTop = () => {
      const section = sectionRef.current;
      if (!section) return false;

      return Math.abs(section.getBoundingClientRect().top) <= 5;
    };

    const updateProgress = (delta: number) => {
      const nextProgress = Math.min(
        Math.max(progressRef.current + delta, 0),
        1,
      );

      progressRef.current = nextProgress;
      setScrollProgress(nextProgress);
    };

    const shouldExpand = (delta: number) => {
      if (!isAtHeroTop()) return false;

      return progressRef.current < 1 || delta < 0;
    };

    const handleWheel = (event: WheelEvent) => {
      // ปล่อยให้ผู้ใช้ซูมด้วย Ctrl + scroll ได้ตามปกติ
      if (event.ctrlKey) return;
      if (!shouldExpand(event.deltaY)) return;

      event.preventDefault();
      updateProgress(event.deltaY * 0.0009);
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchYRef.current =
        event.touches.length === 1
          ? event.touches[0].clientY
          : null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        touchYRef.current = null;
        return;
      }

      const currentY = event.touches[0].clientY;
      const previousY = touchYRef.current;

      touchYRef.current = currentY;

      if (previousY === null) return;

      const delta = previousY - currentY;

      if (!shouldExpand(delta)) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      updateProgress(delta * 0.005);
    };

    const handleTouchEnd = () => {
      touchYRef.current = null;
    };

    window.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    window.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    window.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [reduceMotion]);

  const progress = reduceMotion ? 1 : scrollProgress;

  // เริ่มเป็นภาพแนวตั้ง แล้วขยายตามพื้นที่หน้าจอ
  const mediaWidth = isMobile
    ? `calc(280px + (100vw - 280px) * ${progress})`
    : `calc(340px + (100vw - 340px) * ${progress})`;

  const mediaHeight = `calc(420px + (100dvh - 420px) * ${progress})`;
  const textOffset = progress * 110;
  const titleOpacity = Math.max(0, 1 - progress);

  const words = title.trim().split(/\s+/);
  const firstWord = words[0];
  const remainingWords = words.slice(1).join(" ");

  const revealContent = () => {
    progressRef.current = 1;
    setScrollProgress(1);
  };

  return (
    <div
      ref={sectionRef}
      className="overflow-x-clip bg-slate-950 text-white"
    >
      <section
        aria-label="Weather Analytics introduction"
        className="relative flex min-h-dvh items-center justify-center"
      >
        {/* ภาพพื้นหลังจะค่อย ๆ จางเมื่อภาพตรงกลางขยาย */}
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: 1 - progress }}
          transition={{ duration: 0.1 }}
        >
          {bgImageSrc && (
      <Image
    src={bgImageSrc}
    alt=""
    fill
    priority
    sizes="100vw"
    className="object-cover"
  />
)}

          <div className="absolute inset-0 bg-slate-950/75" />
        </motion.div>

        {/* ภาพหรือวิดีโอตรงกลาง */}
        <div
          className="absolute left-1/2 top-1/2 overflow-hidden shadow-2xl"
          style={{
            width: mediaWidth,
            height: mediaHeight,
            maxWidth: "100vw",
            maxHeight: "100dvh",
            transform: "translate(-50%, -50%)",
            borderRadius: `${24 * (1 - progress)}px`,
          }}
        >
          {mediaType === "video" ? (
            <video
              src={mediaSrc}
              poster={posterSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={mediaSrc}
              alt="บรรยากาศท้องฟ้าและสภาพอากาศ"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}

          <div className="absolute inset-0 bg-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        </div>

        {/* ชื่อแยกออกสองฝั่งเมื่อเลื่อน */}
        <div
          className={`pointer-events-none relative z-10 flex w-full flex-col items-center gap-2 px-4 text-center ${
            textBlend ? "mix-blend-difference" : ""
          }`}
        >
          <h1
  className="text-4xl font-bold tracking-tight text-blue-100 sm:text-6xl lg:text-8xl"
  style={{ opacity: titleOpacity }}
>
            <span
              className="block"
              style={{
                transform: `translateX(-${textOffset}vw)`,
              }}
            >
              {firstWord}
            </span>

            <span
              className="block"
              style={{
                transform: `translateX(${textOffset}vw)`,
              }}
            >
              {remainingWords}
            </span>
          </h1>

          <p
            className="mt-5 max-w-sm text-sm text-blue-100/90 sm:text-base"
            style={{ opacity: 1 - progress }}
          >
            {subtitle}
          </p>
        </div>

        {/* กดปุ่มได้ด้วย จึงไม่จำเป็นต้องใช้เมาส์เลื่อนเท่านั้น */}
        <button
          type="button"
          onClick={revealContent}
          aria-label="ขยายภาพเพื่อสำรวจเนื้อหา"
          className="absolute bottom-10 z-20 rounded-full border border-white/25 bg-slate-950/30 px-5 py-3 text-sm text-blue-100 backdrop-blur-sm transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
        >
          {expanded ? "Explore below ↓" : `${scrollToExpand} ↓`}
        </button>
      </section>

      {/* เนื้อหาของเว็บที่จะส่งเข้ามาผ่าน children */}
      <motion.section
        className="relative mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24"
        initial={false}
        animate={{ opacity: expanded ? 1 : 0.35 }}
        transition={{ duration: reduceMotion ? 0 : 0.7 }}
      >
        {children}
      </motion.section>
    </div>
  );
}
