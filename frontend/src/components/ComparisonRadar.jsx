import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

const SHORT_LABELS = {
  jump_height_cm:              'Peak Jump',
  knee_flexion_angle_deg:      'Min Knee°',
  knee_angular_velocity_deg_s: 'Angular Vel',
  horizontal_displacement_m:   'Lateral Disp',
  ball_speed_kmh:              'Ball Speed',
};

const MAXES = {
  jump_height_cm:              60,
  knee_flexion_angle_deg:      180,
  knee_angular_velocity_deg_s: 800,
  horizontal_displacement_m:   150,
  ball_speed_kmh:              250,
};

function normalize(value, key) {
  if (value == null || value === 0) return 0;
  const max = MAXES[key] || value * 1.5;
  return Math.min(100, Math.round((value / max) * 100));
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        fontSize: 12,
      }}>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: {p.value}%
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ComparisonRadar({ userFeatures, proBaseline, metrics }) {
  // Filter out metrics where both user and pro values are null (e.g. ball_speed_kmh)
  const validMetrics = metrics.filter(
    (m) => userFeatures[m.key] != null || proBaseline[m.key] != null
  );

  const data = validMetrics.map((m) => ({
    subject: SHORT_LABELS[m.key] || m.key,
    You: normalize(userFeatures[m.key], m.key),
    Pro: normalize(proBaseline[m.key], m.key),
  }));

  return (
    <div className="chart-card" aria-label="Radar comparison chart">
      <div className="chart-title">
        <div className="chart-title-dot" style={{ background: '#d4f56a' }} />
        Performance Radar
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#8b95a1', fontSize: 11 }}
          />
          <Radar
            name="You"
            dataKey="You"
            stroke="#d4f56a"
            fill="#d4f56a"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Radar
            name="Pro Baseline"
            dataKey="Pro"
            stroke="#ff4d6d"
            fill="#ff4d6d"
            fillOpacity={0.15}
            strokeWidth={2}
            strokeDasharray="5 3"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 16, fontSize: 12, color: '#8b95a1' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
