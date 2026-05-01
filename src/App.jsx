import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import ResultsDashboard from './components/ResultsDashboard';
import HeroVideo from "./components/HeroVideo";
import { ErrorBoundary } from "./components/ErrorBoundary";



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
  const fileInputRef = useRef(null);

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
      <nav className={`nav ${isScrolled ? 'scrolled' : ''}`}>
        <motion.a 
          className="nav-logo" 
          href="/" 
          aria-label="TennisAI Home"
          whileHover={{ scale: 1.05, rotate: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="nav-logo-icon" aria-hidden="true">🎾</div>
          <span className="nav-logo-text">TennisAI</span>
        </motion.a>
      </nav>

      {/* Hero Sections — Simplified for performance */}
      <div style={{ display: results ? 'none' : 'block' }}>
        <HeroVideo />

        <section className="hero-static">
            <div className="main">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="hero-title">
                  Ready to<br />
                  <span>Analyze?</span>
                </h2>
                <p className="hero-sub">
                  Our Computer vision model is Designed to assist players and coaches in improving their tennis game by providing detailed feedback on their technique and performance. Choose your surface and upload your match footage below 
                  to see how you stack up against the legends.
                </p>
              </motion.div>
            </div>
          </section>
      </div>





      {/* Main */}
      <main className="main" id="main-content">


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
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <ResultsDashboard data={results} court={court} onReset={reset} />
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </ErrorBoundary>
    </div>
  );
}


