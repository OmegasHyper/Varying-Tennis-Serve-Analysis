import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './App.css';
import ResultsDashboard from './components/ResultsDashboard';
import HeroVideo from "./components/HeroVideo";
import { ErrorBoundary } from "./components/ErrorBoundary";




gsap.registerPlugin(ScrollTrigger);

const API_BASE = 'http://localhost:8000';

const COURTS = [
  {
    id: 'clay',
    label: 'Clay',
    sub: 'Roland Garros style',
    emoji: '🟫',
    color: '#c97c40',
    colorRgb: '201,124,64',
  },
  {
    id: 'grass',
    label: 'Grass',
    sub: 'Wimbledon style',
    emoji: '🟩',
    color: '#4a7c59',
    colorRgb: '74,124,89',
  },
  {
    id: 'hard',
    label: 'Hard',
    sub: 'US Open style',
    emoji: '🟦',
    color: '#2563a8',
    colorRgb: '37,99,168',
  },
];

const BackgroundAtmosphere = ({ court }) => {
  const spotlightRef = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    const spotlight = spotlightRef.current;
    if (!spotlight) return;

    const selected = COURTS.find(c => c.id === court);
    const color = selected ? selected.colorRgb : '212, 245, 106';

    const handleMove = (e) => {
      // Disable spotlight updates in the heavy video section to save resources
      if (window.scrollY < 2000) return;
      if (rafId.current) return;

      rafId.current = requestAnimationFrame(() => {
        spotlight.style.background = `radial-gradient(800px circle at ${e.clientX}px ${e.clientY}px, rgba(${color}, 0.07), transparent 80%)`;
        rafId.current = null;
      });
    };


    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [court]);

  return (
    <div className="hero-bg" aria-hidden="true">
      <div className="court-lines" />
      <div ref={spotlightRef} className="global-spotlight" />
    </div>
  );
};


function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const [court, setCourt] = useState('clay');
  const [videoFile, setVideoFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const NAV_LINKS = results ? [
    { label: 'Results',   href: '#results'      },
    { label: 'Footer',    href: '#footer-section' },
  ] : [
    { label: 'Home',    href: '#hero-video'   },
    { label: 'Analyse', href: '#main-content' },
    { label: 'Footer',  href: '#footer-section' },
  ];

  const FOOTER_NAV_LINKS = results ? [
    { label: 'Results', href: '#results'      },
  ] : [
    { label: 'Home', href: '#hero-video'   },
    { label: 'Analyse', href: '#main-content' },
  ];

  const handleNavLink = (href) => {
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const LOADING_STEPS = ["Uploading match footage...", "Processing skeletal points...", "Comparing with pros...", "Generating biomechanical report..."];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [loading]);


  useEffect(() => {
    // Kill any stale tweens and reset all element positions immediately
    // This prevents old GSAP inline styles from previous runs from persisting
    gsap.killTweensOf([".tennis-ball-wrapper", ".tennis-ball-transition", ".hero-static", ".reveal-content-wrapper"]);
    gsap.set(".tennis-ball-wrapper", { clearProps: "all" }); // wipes inline style completely
    gsap.set(".tennis-ball-transition", { clearProps: "all" });

    if (results) {
      gsap.set(".reveal-content-wrapper", { opacity: 1, y: 0 });
      gsap.set(".hero-static", { opacity: 1, x: 0 });
      return;
    }

    // Now enforce the correct initial hidden state
    gsap.set(".tennis-ball-wrapper", { display: "none" });
    gsap.set(".tennis-ball-transition", { scale: 0, opacity: 0, x: 0, rotate: 0 });
    gsap.set(".hero-static", { opacity: 1, x: 0 }); // Section visible to show the ball
    gsap.set(".hero-static-content", { opacity: 0, x: 0 }); // Only text starts hidden
    gsap.set(".reveal-content-wrapper", { opacity: 0, y: 60 });

    let tl = null;

    const setupAnimation = () => {
      ScrollTrigger.refresh();

      tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".hero-static",
          start: "top top",
          end: "+=1200",
          pin: true,
          pinSpacing: true,
          scrub: 1.2,
          anticipatePin: 1,
          onEnter: () => gsap.set(".tennis-ball-wrapper", { display: "flex" }),
          onLeaveBack: () => {
            gsap.set(".tennis-ball-wrapper", { display: "none" });
            gsap.set(".tennis-ball-transition", { scale: 0, opacity: 0, x: 0, rotate: 0 });
            gsap.set(".hero-static-content", { opacity: 0, x: 0 });
            gsap.set(".reveal-content-wrapper", { opacity: 0, y: 60 });
          },

        }
      });

      // Step 1: Ball pops in at center (wrapper centers it via CSS flexbox)
      tl.fromTo(".tennis-ball-transition",
        { scale: 0, opacity: 0, rotate: 0, x: 0 },
        { scale: 1, opacity: 1, rotate: 180, duration: 1.2, ease: "back.out(1.7)" }
      )
      // Step 2: Ball holds, then slides left (Ending at -20vw as requested)
      .to(".tennis-ball-transition", {
        x: "-18vw",
        rotate: -180,
        duration: 4,
        ease: "power2.in"
      }, "+=3")
      // Step 3: Hero-static text fades in (Targeting content only, so it doesn't move the ball)
      .fromTo(".hero-static-content",
        { opacity: 0, x: -30 },
        { opacity: 1, x: 200, duration: 1.8, ease: "power2.out" },
        "<3" 
      )
      // Step 4: Upload form reveals
      .fromTo(".reveal-content-wrapper",
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
        "-=0.4"
      );
    };

    // Wait for HeroVideo pin to be ready before calculating scroll positions
    const onPinReady = () => setupAnimation();
    window.addEventListener('hero-pin-ready', onPinReady, { once: true });

    // Fallback for hot reloads where the event already fired
    const fallbackTimeout = setTimeout(() => {
      if (!tl) setupAnimation();
    }, 1500);


    return () => {
      window.removeEventListener('hero-pin-ready', onPinReady);
      clearTimeout(fallbackTimeout);
      if (tl) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
    };
  }, [results]);



  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please upload a video file (MP4, MOV, AVI, etc.)');
      return;
    }
    setError(null);
    setVideoFile(file);
    setResults(null);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('court_type', court);
      const { data } = await axios.post(`${API_BASE}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResults(data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Analysis failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults(null);
    setVideoFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);

    const selected = COURTS.find(c => c.id === court);
    if (selected) {
      card.style.setProperty('--card-glow-color', selected.colorRgb);
    }
  };


  return (
    <div className="app">
      <ErrorBoundary>
        <BackgroundAtmosphere court={court} />





        {/* Nav */}
        <nav className={`nav ${isScrolled ? 'scrolled' : ''} ${menuOpen ? 'menu-open' : ''}`}>
          <motion.a
            className="nav-logo"
            href="/"
            aria-label="ServeSense Home"
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="nav-logo-icon" aria-hidden="true">🎾</div>
            <span className="nav-logo-text">ServeSense</span>
          </motion.a>

          {/* Hamburger button */}
          <motion.button
            id="hamburger-btn"
            className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <span className="ham-bar" />
            <span className="ham-bar" />
            <span className="ham-bar" />
          </motion.button>
        </nav>

        {/* Mobile/hamburger slide-out menu */}
        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                className="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />

              {/* Panel */}
              <motion.nav
                className="menu-panel"
                aria-label="Site navigation"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: '0%', opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {/* Panel header */}
                <div className="menu-panel-header">
                  <div className="menu-panel-logo">
                    <div className="nav-logo-icon" aria-hidden="true" style={{ width: 40, height: 40, fontSize: '1.3rem' }}>🎾</div>
                    <span className="nav-logo-text" style={{ fontSize: '1.6rem' }}>ServeSense</span>
                  </div>
                  <motion.button
                    className="menu-close-btn"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ✕
                  </motion.button>
                </div>

                {/* Divider */}
                <div className="menu-divider" />

                {/* Nav links */}
                <ul className="menu-links" role="list">
                  {NAV_LINKS.map((link, i) => (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ delay: 0.08 * i, duration: 0.28, ease: 'easeOut' }}
                    >
                      <button
                        className="menu-link"
                        onClick={() => handleNavLink(link.href)}
                      >
                        {/* <span className="menu-link-emoji" aria-hidden="true">{link.emoji}</span> */}
                        <span className="menu-link-label">{link.label}</span>
                        <span className="menu-link-arrow" aria-hidden="true">→</span>
                      </button>
                    </motion.li>
                  ))}
                </ul>

                {/* Footer badge */}
                <div className="menu-panel-footer">
                  <span className="menu-badge">MediaPipe Powered</span>
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>

        {/* Hero Sections — Simplified for performance */}
        <div className="hero-sections-wrapper" style={{ display: results ? 'none' : 'block' }}>
          <div id="hero-video"><HeroVideo /></div>

          <section className="hero-static">
            {/* Wrapper centers ball via flexbox; GSAP only needs to animate x/scale on the ball */}
            {!results && (
              <div className="tennis-ball-wrapper" aria-hidden="true">
                <div className="tennis-ball-transition" />
              </div>
            )}
            <div className="main">
              <div className="hero-static-content">
                <h2 className="hero-title">
                  Ready to<br />
                  <span>Analyze?</span>
                </h2>
                <p className="hero-sub">
                  Our Computer vision model is Designed to assist players and coaches in improving their tennis game by providing detailed feedback on their technique and performance. Choose your surface and upload your match footage below
                  to see how you stack up against the legends.
                </p>
              </div>
            </div>
          </section>
        </div>


        {/* Main */}
        <main className="main" id="main-content">
          <div className="reveal-content-wrapper">


            {/* Upload form */}
            <AnimatePresence mode="wait">
              {!results && (
                <motion.section
                  className="upload-section"
                  aria-label="Upload and analyze"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="card" onMouseMove={handleMouseMove}>
                    {/* Court selector */}

                    <p className="section-label">Select Court Surface</p>
                    <div
                      className="court-selector"
                      role="radiogroup"
                      aria-label="Court surface type"
                    >
                      {COURTS.map((c, i) => (
                        <motion.button
                          key={c.id}
                          id={`court-${c.id}`}
                          className={`court-btn${court === c.id ? ' active' : ''}`}
                          onClick={() => setCourt(c.id)}
                          role="radio"
                          aria-checked={court === c.id}
                          style={{
                            '--court-color': c.color,
                            '--court-color-rgb': c.colorRgb,
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          whileHover={{
                            y: -5,
                            scale: 1.02,
                            boxShadow: `0 10px 25px rgba(${c.colorRgb}, 0.2)`
                          }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <motion.div
                            className="court-icon-wrap"
                            aria-hidden="true"
                            animate={court === c.id ? { scale: 1.1 } : { scale: 1 }}
                          >
                            {c.emoji}
                          </motion.div>
                          <div className="court-name">{c.label}</div>
                          <div className="court-sub">{c.sub}</div>
                        </motion.button>
                      ))}
                    </div>

                    {/* Drop zone */}
                    <p className="section-label">Upload Video</p>
                    <motion.div
                      className={`drop-zone${dragOver ? ' drag-over' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      aria-label="Click or drag to upload video"
                      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                      whileHover={{ borderColor: 'var(--accent)' }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        id="video-upload"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                        aria-label="Select video file"
                        style={{ display: 'none' }}
                      />
                      <motion.div
                        className="drop-icon"
                        aria-hidden="true"
                        animate={dragOver ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
                      >🎬</motion.div>
                      <div className="drop-title">
                        {videoFile ? videoFile.name : 'Drop your video here'}
                      </div>
                      <div className="drop-hint">
                        Supports MP4, MOV, AVI · Max recommended 500MB
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {videoFile && (
                        <motion.div
                          className="file-selected"
                          role="status"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <motion.span
                            aria-hidden="true"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          >✅</motion.span>
                          <span className="file-selected-name">{videoFile.name}</span>
                          <span className="file-selected-size">
                            {formatBytes(videoFile.size)}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {error && !loading && (
                      <motion.div
                        className="error-banner"
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        <span aria-hidden="true">⚠️</span>
                        {error}
                      </motion.div>
                    )}

                    {loading ? (
                      <div className="loading-container" aria-live="polite" aria-busy="true">
                        <motion.div
                          className="tennis-ball-spinner"
                          aria-hidden="true"
                          animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 180, 360]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={loadingStep}
                            className="loading-text"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                          >
                            {LOADING_STEPS[loadingStep]}
                          </motion.div>
                        </AnimatePresence>
                        <div className="loading-steps" aria-hidden="true">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="loading-dot"
                              animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <motion.button
                        id="analyze-btn"
                        className="analyze-btn"
                        onClick={handleAnalyze}
                        disabled={!videoFile}
                        aria-disabled={!videoFile}
                        whileHover={!videoFile ? {} : { scale: 1.03, filter: 'brightness(1.1)' }}
                        whileTap={!videoFile ? {} : { scale: 0.96 }}
                      >
                        <span aria-hidden="true">🔬</span>
                        Analyze Movement
                      </motion.button>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence>
              {results && !loading && (
                <motion.div
                  id="results"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginBottom: '1.25rem' }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <ResultsDashboard data={results} court={court} onReset={reset} />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </main>

        {/* ── About Footer ── */}
        <footer id="footer-section" className="site-footer" aria-label="About ServeSense">
          {/* Top shimmer line */}
          <div className="footer-shimmer" aria-hidden="true" />

          <div className="footer-inner">

            {/* Brand column */}
            <div className="footer-brand">
              <div className="footer-logo">
                <div className="nav-logo-icon" style={{ width: 42, height: 42, fontSize: '1.4rem' }} aria-hidden="true">🎾</div>
                <span className="nav-logo-text" style={{ fontSize: '1.7rem' }}>ServeSense</span>
              </div>
              <p className="footer-desc">
                We deliver a biomechanical analysis tool for tennis players and coaches.
                Upload your footage, choose your surface, and get instant professional-grade
                insights. <br/>Powered by MediaPipe pose estimation.
              </p>
              <div className="footer-badges">
                <span className="footer-badge">🦴 MediaPipe</span>
                <span className="footer-badge">⚡ Real-Time</span>
              </div>
            </div>

            {/* Tech stack column */}
            <div className="footer-col">
              <h3 className="footer-col-title">Tech Stack</h3>
              <ul className="footer-tech-list" role="list">
                {[
                  { icon: '⚛️', name: 'React',         sub: 'UI framework'         },
                  { icon: '🐍', name: 'FastAPI',        sub: 'Backend API'          },
                  { icon: '🦴', name: 'MediaPipe',      sub: 'Pose estimation'      },
                  { icon: '🎞️', name: 'Framer Motion & GSAP',  sub: 'Animations'           },
                  { icon: '📈', name: 'Recharts',       sub: 'Data visualisation'   },
                ].map((t) => (
                  <li key={t.name} className="footer-tech-item">
                    <span className="footer-tech-icon" aria-hidden="true">{t.icon}</span>
                    <span className="footer-tech-name">{t.name}</span>
                    <span className="footer-tech-sub">{t.sub}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Courts column */}
            <div className="footer-col">
              <h3 className="footer-col-title">Supported Surfaces</h3>
              <ul className="footer-courts-list" role="list">
                {[
                  { emoji: '🟫', name: 'Clay',  desc: 'Roland Garros style' },
                  { emoji: '🟩', name: 'Grass', desc: 'Wimbledon style'     },
                  { emoji: '🟦', name: 'Hard',  desc: 'US Open style'       },
                ].map((c) => (
                  <li key={c.name} className="footer-court-item">
                    <span aria-hidden="true">{c.emoji}</span>
                    <div>
                      <div className="footer-court-name">{c.name}</div>
                      <div className="footer-court-desc">{c.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>

              <h3 className="footer-col-title" style={{ marginTop: '1.75rem' }}>Quick Links</h3>
              <ul className="footer-links-list" role="list">
                {FOOTER_NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <button className="footer-nav-link" onClick={() => handleNavLink(l.href)}>
                      <span className="footer-link-arrow" aria-hidden="true">→</span>
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="footer-bottom">
            <span className="footer-copy">
              © {new Date().getFullYear()} ServeSense &mdash; Built for athletes, by athletes.
            </span>
            <span className="footer-bottom-badge">Team 5 &nbsp;·&nbsp; Assistive Technologies</span>
          </div>
        </footer>

      </ErrorBoundary>
    </div>
  );
}


