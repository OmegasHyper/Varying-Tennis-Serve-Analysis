import { motion } from 'framer-motion';
import MetricCard from './MetricCard';
import ComparisonRadar from './ComparisonRadar';
import ComparisonBar from './ComparisonBar';
import ProjectionPanel from './ProjectionPanel';
import FeedbackPanel from './FeedbackPanel';
import AnnotatedVideoPlayer from './AnnotatedVideoPlayer';

const COURT_CLASS = { clay: 'court-clay', grass: 'court-grass', hard: 'court-hard' };
const COURT_EMOJI = { clay: '🟫', grass: '🟩', hard: '🟦' };
const COURT_LABEL = { clay: 'Clay', grass: 'Grass', hard: 'Hard' };

// Maps dashboard metric key → backend feature_analysis key
const METRIC_TO_FEATURE = {
  jump_height_cm:              'max_jump',
  knee_flexion_angle_deg:      'min_knee',
  knee_angular_velocity_deg_s: 'max_vel',
  horizontal_displacement_m:   'lat_disp',
  ball_speed_kmh:              null,
};

// 5 metric cards (4 from backend + 1 placeholder for ball_speed)
const METRICS = [
  { key: 'jump_height_cm',              label: 'Peak Jump Height',  unit: 'cm'   },
  { key: 'knee_flexion_angle_deg',      label: 'Min Knee Flexion',  unit: '°'    },
  { key: 'knee_angular_velocity_deg_s', label: 'Peak Angular Vel.', unit: '°/s'  },
  { key: 'horizontal_displacement_m',   label: 'Lateral Disp.',     unit: 'cm'   },
  { key: 'ball_speed_kmh',              label: 'Ball Speed',         unit: 'km/h' },
];

function scoreColor(s) {
  if (s >= 85) return '#d4f56a';
  if (s >= 70) return '#a8d94a';
  if (s >= 50) return '#f5c842';
  if (s >= 30) return '#ff8c42';
  return '#ff4d6d';
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ResultsDashboard({ data, court, onReset }) {
  const {
    metadata,
    user_features,
    pro_baseline,
    comparison_to_pro,
    court_projection,
    feedback,
    feature_analysis,
  } = data;

  const score = metadata.overall_score ?? 0;
  const sColor = scoreColor(score);

  return (
    <motion.section
      className="results-section"
      aria-label="Analysis results"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div className="results-header" variants={itemVariants}>
        <div>
          <h2 className="results-title">Analysis Results</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <span className={`meta-pill ${COURT_CLASS[metadata.court_type] || 'court-clay'}`}>
              {COURT_EMOJI[metadata.court_type]} {COURT_LABEL[metadata.court_type]} Court
            </span>
            <span className="meta-pill" style={{ color: '#ff4d6d', borderColor: '#ff4d6d', background: 'rgba(255,77,109,0.15)' }}>
              🏆 vs {metadata.reference_player}
            </span>
          </div>
        </div>

        {/* Overall score ring + reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Conic-gradient score ring */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: `conic-gradient(${sColor} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${sColor}44`,
            }}>
              <div style={{
                width: 58, height: 58, borderRadius: '50%',
                background: 'var(--bg-card)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: sColor, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>/ 100</span>
              </div>
            </div>
            <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginTop: '0.3rem', letterSpacing: '0.04em' }}>
              OVERALL
            </div>
          </div>

          <motion.button
            className="reset-btn"
            onClick={onReset}
            id="reset-btn"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
            whileTap={{ scale: 0.95 }}
          >
            <span aria-hidden="true">↩</span>
            New Analysis
          </motion.button>
        </div>
      </motion.div>

      {/* ── Annotated video ── */}
      {metadata.video_id && (
        <motion.div variants={itemVariants}>
          <AnnotatedVideoPlayer videoId={metadata.video_id} />
        </motion.div>
      )}

      {/* ── Metric cards ── */}
      <motion.p className="section-title" variants={itemVariants}>Your Metrics</motion.p>
      <div className="stats-grid" role="list" aria-label="Your movement metrics">
        {METRICS.map((m, i) => {
          const fKey = METRIC_TO_FEATURE[m.key];
          const fa   = fKey && feature_analysis ? feature_analysis[fKey] : null;
          return (
            <MetricCard
              key={m.key}
              metricKey={m.key}
              index={i}
              label={m.label}
              unit={m.unit}
              value={user_features[m.key]}
              delta={comparison_to_pro[m.key]}
              proValue={pro_baseline[m.key]}
              band={fa?.band}
              performanceScore={fa?.performance_score}
              zScore={fa?.z_score}
              proStd={fa?.pro_std}
              proN={fa?.pro_n}
            />
          );
        })}
      </div>

      {/* ── Charts ── */}
      <motion.p className="section-title" variants={itemVariants}>Performance Analysis</motion.p>
      <motion.div className="charts-grid" variants={itemVariants}>
        <ComparisonRadar
          userFeatures={user_features}
          proBaseline={pro_baseline}
          metrics={METRICS}
        />
        <ComparisonBar
          userFeatures={user_features}
          proBaseline={pro_baseline}
          comparison={comparison_to_pro}
          metrics={METRICS}
        />
      </motion.div>

      {/* ── Court projection ── */}
      <motion.p className="section-title" variants={itemVariants}>Court Surface Projections</motion.p>
      <motion.div variants={itemVariants}>
        <ProjectionPanel projections={court_projection} currentCourt={metadata.court_type} />
      </motion.div>

      {/* ── Feedback ── */}
      <motion.p className="section-title" variants={itemVariants}>Coach Recommendations</motion.p>
      <motion.div variants={itemVariants}>
        <FeedbackPanel feedback={feedback} />
      </motion.div>
    </motion.section>
  );
}
