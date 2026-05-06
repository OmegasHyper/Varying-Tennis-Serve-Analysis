import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:5000';

const LEGEND = [
  { color: '#52f5d4', label: 'Joints (hip · knee · ankle)' },
  { color: '#32dc64', label: 'Skeleton connections' },
];

export default function AnnotatedVideoPlayer({ videoId }) {
  const videoRef       = useRef(null);
  const [blobUrl, setBlobUrl]       = useState(null);
  const [fetchState, setFetchState] = useState('idle');  // idle | loading | ready | error
  const [fetchPct, setFetchPct]     = useState(0);
  const [playing, setPlaying]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [duration, setDuration]     = useState(0);

  // Fetch video as blob so the browser has the full file before playback
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    let objectUrl = null;

    setFetchState('loading');
    setFetchPct(0);
    setBlobUrl(null);

    const url = `${API_BASE}/video/${videoId}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const total = Number(res.headers.get('Content-Length')) || 0;
        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;

        const pump = () =>
          reader.read().then(({ done, value }) => {
            if (cancelled) return;
            if (done) {
              const blob = new Blob(chunks, { type: 'video/mp4' });
              objectUrl = URL.createObjectURL(blob);
              setBlobUrl(objectUrl);
              setFetchState('ready');
              return;
            }
            chunks.push(value);
            received += value.length;
            if (total) setFetchPct(Math.round((received / total) * 100));
            return pump();
          });

        return pump();
      })
      .catch(() => {
        if (!cancelled) setFetchState('error');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v?.duration) setProgress(v.currentTime / v.duration);
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setProgress(ratio);
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  if (!videoId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        marginBottom: '2rem',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,12,16,0.6)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,245,106,0.06)',
      }}
    >
      {/* ── Title bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.85rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        flexWrap: 'wrap', rowGap: '0.4rem',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d4f56a', boxShadow: '0 0 8px #d4f56a88', flexShrink: 0 }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Pose Landmark Overlay
        </span>
      </div>

      {/* ── Video area ── */}
      <div style={{ position: 'relative', background: '#000', lineHeight: 0, minHeight: 200 }}>
        {/* Video element — only mounted when blob is ready */}
        {blobUrl && (
          <video
            ref={videoRef}
            src={blobUrl}
            style={{ width: '100%', maxHeight: '480px', objectFit: 'contain', display: 'block' }}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
            onEnded={() => setPlaying(false)}
            playsInline
          />
        )}

        {/* Click overlay */}
        {blobUrl && (
          <div
            onClick={togglePlay}
            style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <AnimatePresence>
              {!playing && (
                <motion.div
                  key="play-btn"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                    border: '2px solid rgba(212,245,106,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem',
                  }}
                >▶</motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Loading state */}
        <AnimatePresence>
          {fetchState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '1rem', background: 'rgba(0,0,0,0.7)',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Preparing annotated video… {fetchPct > 0 ? `${fetchPct}%` : ''}
              </div>
              <div style={{ width: 200, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                <motion.div
                  animate={{ width: `${fetchPct}%` }}
                  style={{ height: '100%', background: 'linear-gradient(90deg,#a8d94a,#d4f56a)', borderRadius: 99 }}
                />
              </div>
            </motion.div>
          )}

          {fetchState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', fontSize: '0.85rem', color: '#ff4d6d',
              }}
            >
              ⚠ Could not load annotated video
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls bar (only when ready) ── */}
      {fetchState === 'ready' && (
        <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(0,0,0,0.3)' }}>
          {/* Scrubber */}
          <div
            onClick={seek}
            style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, cursor: 'pointer', marginBottom: '0.65rem' }}
          >
            <div style={{ height: '100%', width: `${progress * 100}%`, background: 'linear-gradient(90deg,#a8d94a,#d4f56a)', borderRadius: 99, transition: 'width 0.1s linear' }} />
          </div>
          {/* Play + time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={togglePlay}
              style={{
                background: 'rgba(212,245,106,0.12)', border: '1px solid rgba(212,245,106,0.3)',
                borderRadius: 8, padding: '0.3rem 0.75rem', cursor: 'pointer',
                color: '#d4f56a', fontSize: '0.85rem', fontWeight: 700,
              }}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(progress * duration)} / {fmt(duration)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
