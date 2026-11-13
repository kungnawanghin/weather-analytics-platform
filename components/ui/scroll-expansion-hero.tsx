"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

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
  mediaType = "image", mediaSrc, posterSrc, bgImageSrc,
  title = "WEATHER ANALYTICS", subtitle = "Understand the weather through data.",
  scrollToExpand = "Scroll to explore", textBlend = false, children,
}: ScrollExpandMediaProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  // All input devices use native document scrolling. No wheel/touch interception.
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.6 });
  const progress = useTransform(smoothProgress, (value) => reduceMotion ? 1 : Math.min(1, Math.max(0, value)));
  const width = useTransform(progress, (v) => `calc(min(340px, 85vw) + (100vw - min(340px, 85vw)) * ${v})`);
  const height = useTransform(progress, (v) => `calc(min(420px, 60svh) + (100svh - min(420px, 60svh)) * ${v})`);
  const borderRadius = useTransform(progress, [0, 1], [24, 0]);
  const titleOpacity = useTransform(progress, [0, 0.65], [1, 0]);
  const leftText = useTransform(progress, [0, 1], ["0vw", "-75vw"]);
  const rightText = useTransform(progress, [0, 1], ["0vw", "75vw"]);
  const backgroundOpacity = useTransform(progress, [0, 1], [1, 0]);
  const words = title.trim().split(/\s+/);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduceMotion) video.pause();
    else void video.play().catch(() => { /* Browser autoplay can be blocked. */ });
  }, [reduceMotion, mediaSrc]);

  function explore() {
    document.getElementById("weather-map")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
  }

  return (
    <div className="observatory-shell text-white">
      <div ref={trackRef} className={reduceMotion ? "relative h-svh" : "relative h-[220svh]"}>
        <section aria-label="Weather Analytics introduction" className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
          <motion.div className="absolute inset-0" style={{ opacity: backgroundOpacity }}>
            {bgImageSrc && <Image src={bgImageSrc} alt="" fill priority sizes="100vw" className="object-cover" />}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#153348_0%,#060e19_70%)]" />
          </motion.div>
          <motion.div className="absolute left-1/2 top-1/2 overflow-hidden shadow-2xl" style={{ width, height, borderRadius, x: "-50%", y: "-50%" }}>
            {mediaType === "video" ? (
              <video ref={videoRef} src={mediaSrc} poster={posterSrc} autoPlay={!reduceMotion} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : <Image src={mediaSrc} alt="บรรยากาศท้องฟ้าและสภาพอากาศ" fill priority sizes="100vw" className="object-cover" />}
            <div className="absolute inset-0 bg-slate-950/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
          </motion.div>
          <div className={`pointer-events-none relative z-10 flex w-full flex-col items-center gap-2 px-4 text-center ${textBlend ? "mix-blend-difference" : ""}`}>
            <motion.p className="eyebrow mb-6" style={{ opacity: titleOpacity }}>Bangkok & metropolitan weather observatory</motion.p>
            <motion.h1 className="text-[clamp(2.6rem,7.5vw,7.5rem)] font-medium leading-[.98] tracking-[-.055em] text-blue-50" style={{ opacity: titleOpacity }}>
              <motion.span className="block" style={{ x: leftText }}>{words[0]}</motion.span>
              <motion.span className="block" style={{ x: rightText }}>{words.slice(1).join(" ")}</motion.span>
            </motion.h1>
            <motion.p className="mt-6 max-w-md text-sm leading-7 text-blue-100/80 sm:text-base" style={{ opacity: titleOpacity }}>{subtitle}</motion.p>
          </div>
          <button type="button" onClick={explore} aria-label="สำรวจแผนที่สภาพอากาศ" className="primary-action absolute bottom-20 z-20">{scrollToExpand} ↓</button>
          <div className="absolute inset-x-5 bottom-5 flex justify-between border-t border-white/10 pt-3 text-[9px] uppercase tracking-[.16em] text-slate-400 sm:inset-x-10"><span>06 provinces / 79 districts</span><span>Explore · Observe · Understand</span></div>
        </section>
      </div>
      <section className="relative mx-auto max-w-[1440px] px-5 py-14 sm:px-10 lg:px-16 md:py-20">{children}</section>
    </div>
  );
}
