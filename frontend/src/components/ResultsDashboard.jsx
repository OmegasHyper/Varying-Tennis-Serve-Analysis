import { motion } from 'framer-motion';
import MetricCard from './MetricCard';
import ComparisonRadar from './ComparisonRadar';
import ComparisonBar from './ComparisonBar';
import ProjectionPanel from './ProjectionPanel';
import FeedbackPanel from './FeedbackPanel';

const COURT_CLASS = { clay: 'court-clay', grass: 'court-grass', hard: 'court-hard' };
const COURT_EMOJI = { clay: '🟫', grass: '🟩', hard: '🟦' };
const COURT_LABEL = { clay: 'Clay', grass: 'Grass', hard: 'Hard' };

const METRICS = [
  { key: 'jump_height_cm',             label: 'Jump Height',          unit: 'cm' },
  { key: 'knee_flexion_angle_deg',     label: 'Knee Flexion',         unit: '°' },
  { key: 'knee_angular_velocity_deg_s',label: 'Knee Angular Vel.',    unit: '°/s' },
  { key: 'horizontal_displacement_m',  label: 'Horizontal Disp.',     unit: 'm' },
  { key: 'ball_speed_kmh',             label: 'Ball Speed',           unit: 'km/h' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function ResultsDashboard({ data, court, onReset }) {
  const { metadata, user_features, pro_baseline, comparison_to_pro, court_projection, feedback } = data;

  return (
    <motion.section 
      className="results-section" 
      aria-label="Analysis results"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="results-header" variants={itemVariants}>
        <div>
          <h2 className="results-title">Analysis Results</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <span className={`meta-pill ${COURT_CLASS[metadata.court_type] || 'court-clay'}`}>
              {COURT_EMOJI[metadata.court_type]} {COURT_LABEL[metadata.court_type]} Court
            </span>
            <span className="meta-pill" style={{ color: "#ff4d6d", borderColor: "#ff4d6d", background: "rgba(255, 77, 109, 0.15)" }}>
              🏆 vs {metadata.reference_player}
            </span>
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
      </motion.div>

      {/* Metric cards */}
      <motion.p className="section-title" variants={itemVariants}>Your Metrics</motion.p>
      <div className="stats-grid" role="list" aria-label="Your movement metrics">
        {METRICS.map((m, i) => (
          <MetricCard
            key={m.key}
            metricKey={m.key}
            index={i}
            label={m.label}
            unit={m.unit}
            value={user_features[m.key]}
            delta={comparison_to_pro[m.key]}
            proValue={pro_baseline[m.key]}
          />
        ))}
      </div>

      {/* Charts */}
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

      {/* Court projection */}
      <motion.p className="section-title" variants={itemVariants}>Court Surface Projections</motion.p>
      <motion.div variants={itemVariants}>
        <ProjectionPanel projections={court_projection} currentCourt={metadata.court_type} />
      </motion.div>

      {/* Feedback */}
      <motion.p className="section-title" variants={itemVariants}>Coach Recommendations</motion.p>
      <motion.div variants={itemVariants}>
        <FeedbackPanel feedback={feedback} />
      </motion.div>
    </motion.section>
  );
}
