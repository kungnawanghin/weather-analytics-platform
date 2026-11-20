"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const [videoState, setVideoState] = useState<"paused" | "playing" | "blocked" | "error">("paused");
  const reduceMotion = useReducedMotion();
  // All input devices use native document scrolling. No wheel/touch interception.
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.6 });
  // Both modes retain the scroll track and user-controlled expansion. Reduced
  // motion follows the wheel directly, without spring lag or flying text.
  const progress = useTransform(() => Math.min(1, Math.max(0,
    reduceMotion ? scrollYProgress.get() : smoothProgress.get(),
  )));
  // Interpolate coefficients in JS; CSS only adds lengths. This avoids nested
  // length multiplication and uses the stage width rather than scrollbar width.
  const width = useTransform(progress, (v) => `calc(${100 * v}% + min(${340 * (1 - v)}px, ${85 * (1 - v)}vw))`);
  const height = useTransform(progress, (v) => `calc(${100 * v}% + min(${420 * (1 - v)}px, ${60 * (1 - v)}%))`);
  const borderRadius = useTransform(progress, [0, 1], [24, 0]);
  const titleOpacity = useTransform(progress, [0, 0.65], [1, 0]);
  const leftText = useTransform(progress, (value) => `${reduceMotion ? 0 : -75 * value}vw`);
  const rightText = useTransform(progress, (value) => `${reduceMotion ? 0 : 75 * value}vw`);
  const backgroundOpacity = useTransform(progress, [0, 1], [1, 0]);
  const words = title.trim().split(/\s+/);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduceMotion) video.pause();
    else void video.play().then(() => {
      // Autoplay may begin before React attaches media event listeners.
      if (!video.paused) setVideoState("playing");
    }).catch(() => { setVideoState("blocked"); });
  }, [reduceMotion, mediaSrc]);

  async function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) video.pause();
    else {
      try { await video.play(); }
      catch { setVideoState(video.error ? "error" : "blocked"); }
    }
  }

  function explore() {
    document.getElementById("weather-map")?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth" });
  }

  return (
    <div className="observatory-shell text-white">
      <div ref={trackRef} className="hero-scroll-track relative">
        <section aria-label="Weather Analytics introduction" className="hero-scroll-stage sticky top-0 flex items-center justify-center overflow-hidden">
          <motion.div className="absolute inset-0" style={{ opacity: backgroundOpacity }}>
            {bgImageSrc && <Image src={bgImageSrc} alt="" fill priority sizes="100vw" className="object-cover" />}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#153348_0%,#060e19_70%)]" />
          </motion.div>
          <motion.div className="absolute left-1/2 top-1/2 h-[min(420px,60vh)] w-[min(340px,85vw)] overflow-hidden shadow-2xl" style={{ width, height, borderRadius, x: "-50%", y: "-50%" }}>
            {mediaType === "video" ? (
              <video ref={videoRef} src={mediaSrc} poster={posterSrc} autoPlay={!reduceMotion} muted loop playsInline preload="metadata" onPlaying={() => setVideoState("playing")} onPause={() => setVideoState("paused")} onError={() => setVideoState("error")} className="h-full w-full object-cover" />
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
          {mediaType === "video" && (
            <div className="absolute right-5 top-28 z-20 max-w-56 text-right sm:right-10">
              <button type="button" onClick={toggleVideo} aria-label={videoState === "playing" ? "หยุดวิดีโอพื้นหลัง" : "เล่นวิดีโอพื้นหลัง"} className="min-h-11 rounded-full border border-white/25 bg-slate-950/70 px-4 py-2 text-xs text-blue-50 backdrop-blur-sm hover:bg-slate-900">
                {videoState === "playing" ? "หยุดวิดีโอ Ⅱ" : "เล่นวิดีโอ ▶"}
              </button>
              <p role="status" className="mt-2 text-xs leading-5 text-slate-300">
                {videoState === "error" ? "โหลดวิดีโอไม่สำเร็จ ลองรีเฟรชหน้า" : videoState === "blocked" ? "เบราว์เซอร์พักวิดีโอ กดเล่นเพื่อเริ่ม" : reduceMotion && videoState !== "playing" ? "พักวิดีโอตามการตั้งค่าลดการเคลื่อนไหว กดเล่นได้" : ""}
              </p>
            </div>
          )}
          <button type="button" onClick={explore} aria-label="สำรวจแผนที่สภาพอากาศ" className="primary-action absolute bottom-20 z-20">{scrollToExpand} ↓</button>
          <div className="absolute inset-x-5 bottom-5 flex justify-between border-t border-white/10 pt-3 text-[9px] uppercase tracking-[.16em] text-slate-400 sm:inset-x-10"><span>06 provinces / 79 districts</span><span>Explore · Observe · Understand</span></div>
        </section>
      </div>
      <section className="relative mx-auto max-w-[1440px] px-5 py-14 sm:px-10 lg:px-16 md:py-20">{children}</section>
    </div>
  );
}
