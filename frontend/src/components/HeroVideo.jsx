import { useLayoutEffect, useRef } from "react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useScroll, useTransform } from "framer-motion";
import heroVideo from "../assets/hero.mp4";

gsap.registerPlugin(ScrollTrigger);

const SLIDES = [
  {
    title: <>Analyze Your<br /><span>Tennis Game</span></>,
    sub: "Upload your match footage and let us compare your biomechanics against elite professionals on any court surface.",
    range: [0, 0.05, 0.25, 0.35]
  },
  {
    title: <>Precision<br /><span>Biomechanics</span></>,
    sub: "Our AI extracts 3D skeletal data to track knee flexion, angular velocity, and jump height frame-by-frame.",
    range: [0.35, 0.45, 0.6, 0.7]
  },
  {
    title: <>Pro-Level<br /><span>Insights</span></>,
    sub: "Discover your exact performance deficits compared to Federer, Djokovic, and Nadal.",
    range: [0.7, 0.8, 0.9, 1.0]
  }
];

function HeroSlide({ slide, progress }) {
  const opacity = useTransform(progress, slide.range, [0, 1, 1, 0]);
  const y = useTransform(progress, slide.range, [60, 0, 0, -60]);

  return (
    <motion.div
      style={{
        opacity,
        y,
        position: 'absolute',
        width: '100%',
        maxWidth: '800px',
        padding: '0 2rem'
      }}
    >
      <h1 className="hero-title">{slide.title}</h1>
      <p className="hero-sub">{slide.sub}</p>
    </motion.div>
  );
}

export default function HeroVideo() {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });


  useLayoutEffect(() => {

    const video = videoRef.current;
    if (!video) return;

    let isSeeking = false;
    let pendingTime = null;
    let rafId = null;

    const performSeek = () => {
      if (pendingTime !== null && !isSeeking) {
        isSeeking = true;
        const timeToSeek = pendingTime;
        pendingTime = null;
        video.currentTime = timeToSeek;
      }
      rafId = null;
    };

    const requestSeek = (time) => {
      pendingTime = time;
      if (!rafId && !isSeeking) {
        rafId = requestAnimationFrame(performSeek);
      }
    };

    const onSeeked = () => {
      isSeeking = false;
      if (pendingTime !== null) {
        requestSeek(pendingTime);
      }
    };

    video.addEventListener("seeked", onSeeked);

    let ctx = gsap.context(() => {
      const setupScrub = () => {
        const duration = video.duration;
        if (!duration || isNaN(duration)) return;

        video.pause();

        ScrollTrigger.create({
          trigger: containerRef.current,
          start: "top top",
          end: "+=2000",
          pin: true,
          scrub: true,
          pinSpacing: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            requestSeek(self.progress * duration);
          },
          onRefresh: (self) => {
            if (video) requestSeek(self.progress * duration);
          }
        });

        // Signal to other components that the pin spacer is ready
        window.dispatchEvent(new CustomEvent('hero-pin-ready'));
      };

      if (video.readyState >= 1) {
        setupScrub();
        setTimeout(() => ScrollTrigger.refresh(), 100);
      } else {
        const onLoaded = () => {
          setupScrub();
          setTimeout(() => ScrollTrigger.refresh(), 100);
        };
        video.addEventListener("loadedmetadata", onLoaded);
        // Clean up the event listener when context reverts
        return () => video.removeEventListener("loadedmetadata", onLoaded);
      }
    }, containerRef);

    return () => {
      video.removeEventListener("seeked", onSeeked);
      if (rafId) cancelAnimationFrame(rafId);
      ctx.revert(); // This safely restores the DOM, removing pin-spacers so React can unmount cleanly.
    };
  }, []);


  return (
    <div className="hero-stable-wrapper">
      <section ref={containerRef} className="hero-video-section">
        <video
          ref={videoRef}
          src={heroVideo}
          muted
          playsInline
          preload="auto"
          className="hero-video"
        />
        <div className="hero-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {SLIDES.map((slide, i) => (
            <HeroSlide key={i} slide={slide} progress={scrollYProgress} />
          ))}
        </div>

      </section>
    </div>
  );
}