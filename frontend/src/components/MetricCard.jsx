import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { 
  ArrowUpToLine, 
  RotateCcw, 
  Zap, 
  MoveHorizontal, 
  Gauge 
} from 'lucide-react';

const METRIC_ICONS = {
  jump_height_cm: <ArrowUpToLine size={16} />,
  knee_flexion_angle_deg: <RotateCcw size={16} />,
  knee_angular_velocity_deg_s: <Zap size={16} />,
  horizontal_displacement_m: <MoveHorizontal size={16} />,
  ball_speed_kmh: <Gauge size={16} />,
};

function CountUp({ value, duration = 2 }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return value < 1 ? latest.toFixed(2) : Math.round(latest);
  });

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, duration, count]);

  return <motion.span>{rounded}</motion.span>;
}

export default function MetricCard({ label, unit, value, delta, proValue, index = 0, metricKey }) {
  const isNeg = delta < 0;
  const pct = Math.min(100, (value / (proValue || value)) * 100);
  const accentColor = isNeg ? '#ff4d6d' : '#d4f56a';

  return (
    <motion.div 
      className="stat-card" 
      role="listitem"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -5, borderColor: 'rgba(255,255,255,0.15)' }}
    >
      <div className="stat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div className="stat-label" style={{ margin: 0 }}>{label}</div>
        <div className="stat-icon" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          {METRIC_ICONS[metricKey]}
        </div>
      </div>
      
      <div className="stat-value" style={{ color: '#f0f2f5', fontSize: '1.8rem', fontWeight: 800 }}>
        <CountUp value={value} />
        <span className="stat-unit" style={{ fontSize: '0.8rem', opacity: 0.5 }}> {unit}</span>
      </div>

      <div className="progress-bar-wrap" style={{ height: '4px', margin: '1rem 0' }}>
        <motion.div
          className="progress-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.5 + (index * 0.1), ease: "easeOut" }}
          style={{
            height: '100%',
            borderRadius: '99px',
            background: `linear-gradient(90deg, ${accentColor}44, ${accentColor})`,
            boxShadow: `0 0 10px ${accentColor}33`
          }}
        />
      </div>

      <motion.div 
        className={`stat-delta ${isNeg ? 'neg' : 'pos'}`} 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 + (index * 0.1) }}
        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
      >
        {isNeg ? '▼' : '▲'} {Math.abs(delta).toFixed(1)}% vs pro
      </motion.div>
    </motion.div>
  );
}
