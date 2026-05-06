import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArrowUpToLine,
  RotateCcw,
  Zap,
  MoveHorizontal,
  Gauge,
  TrendingUp,
  Activity,
} from 'lucide-react';

const METRIC_ICONS = {
  jump_height_cm:              <ArrowUpToLine size={16} />,
  mean_jump_cm:                <TrendingUp size={16} />,
  knee_flexion_angle_deg:      <RotateCcw size={16} />,
  mean_knee_deg:               <Activity size={16} />,
  knee_angular_velocity_deg_s: <Zap size={16} />,
  mean_vel_deg_s:              <Zap size={16} />,
  horizontal_displacement_m:   <MoveHorizontal size={16} />,
  ball_speed_kmh:              <Gauge size={16} />,
};

const BAND_COLOR = {
  elite:      '#d4f56a',
  proficient: '#a8d94a',
  developing: '#f5c842',
  needs_work: '#ff8c42',
  critical:   '#ff4d6d',
};

const BAND_LABEL = {
  elite:      'Elite',
  proficient: 'Proficient',
  developing: 'Developing',
  needs_work: 'Needs Work',
  critical:   'Critical',
};

function CountUp({ value, duration = 2 }) {
  const count   = useMotionValue(0);
  const rounded = useTransform(count, (latest) =>
    value < 1 ? latest.toFixed(2) : Math.round(latest)
  );

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [value, duration, count]);

  return <motion.span>{rounded}</motion.span>;
}

export default function MetricCard({
  label, unit, value, delta, proValue,
  index = 0, metricKey,
  band, performanceScore, zScore, proStd, proN,
}) {
  const isNull      = value == null;
  const isNeg       = !isNull && delta < 0;
  const pct         = isNull ? 0 : Math.min(100, (value / (proValue || value || 1)) * 100);
  const accentColor = isNeg ? '#ff4d6d' : '#d4f56a';
  const bandColor   = BAND_COLOR[band] ?? '#aab8cc';

  return (
    <motion.div
      className="stat-card"
      role="listitem"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, borderColor: 'rgba(255,255,255,0.15)' }}
    >
      {/* ── Header: label + icon + band pill ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
        <div className="stat-label" style={{ margin: 0, lineHeight: 1.3 }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          <div style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            {METRIC_ICONS[metricKey]}
          </div>
          {band && !isNull && (
            <span style={{
              fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.06em',
              padding: '0.15rem 0.45rem', borderRadius: '99px',
              background: `${bandColor}22`, color: bandColor,
              border: `1px solid ${bandColor}55`, textTransform: 'uppercase',
            }}>
              {BAND_LABEL[band] ?? band}
            </span>
          )}
        </div>
      </div>

      {/* ── Value ── */}
      <div
        className="stat-value"
        style={{ color: isNull ? 'var(--text-muted)' : '#f0f2f5', fontSize: '1.8rem', fontWeight: 800 }}
      >
        {isNull
          ? <span style={{ fontSize: '1.2rem', opacity: 0.4 }}>N/A</span>
          : <CountUp value={value} />
        }
        {!isNull && (
          <span className="stat-unit" style={{ fontSize: '0.8rem', opacity: 0.5 }}>{' '}{unit}</span>
        )}
      </div>

      {/* ── z-score + performance score row ── */}
      {!isNull && (zScore != null || performanceScore != null) && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap' }}>
          {performanceScore != null && (
            <span style={{
              fontSize: '0.68rem', fontWeight: 700,
              color: BAND_COLOR[band] ?? '#aab8cc',
              background: `${bandColor}18`,
              padding: '0.1rem 0.4rem', borderRadius: '6px',
            }}>
              {performanceScore}/100
            </span>
          )}
        </div>
      )}

      {/* ── Progress bar ── */}
      <div style={{ height: '4px', margin: '0.75rem 0', background: 'rgba(255,255,255,0.05)', borderRadius: '99px' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isNull ? '0%' : `${pct}%` }}
          transition={{ duration: 1, delay: 0.5 + index * 0.1, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: '99px',
            background: isNull ? 'transparent' : `linear-gradient(90deg, ${accentColor}44, ${accentColor})`,
            boxShadow: isNull ? 'none' : `0 0 10px ${accentColor}33`,
          }}
        />
      </div>

      {/* ── Delta badge ── */}
      {isNull ? (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.5 }}>Not tracked</div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <motion.div
            className={`stat-delta ${isNeg ? 'neg' : 'pos'}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + index * 0.1 }}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          >
            {isNeg ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}% vs pro
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
