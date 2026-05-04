import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const SHORT_LABELS = {
  jump_height_cm: 'Jump',
  knee_flexion_angle_deg: 'Knee°',
  knee_angular_velocity_deg_s: 'Ang.Vel',
  horizontal_displacement_m: 'H.Disp',
  ball_speed_kmh: 'Speed',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        fontSize: 12,
      }}>
        <div style={{ color: '#f0f2f5', fontWeight: 700, marginBottom: 6 }}>{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: {typeof p.value === 'number' && p.value < 2 ? p.value.toFixed(2) : p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ComparisonBar({ userFeatures, proBaseline, comparison, metrics }) {
  const data = metrics.map((m) => ({
    name: SHORT_LABELS[m.key] || m.key,
    You: userFeatures[m.key],
    Pro: proBaseline[m.key],
    delta: comparison[m.key],
  }));

  return (
    <div className="chart-card" aria-label="Bar comparison chart">
      <div className="chart-title">
        <div className="chart-title-dot" style={{ background: '#c97c40' }} />
        You vs Pro Baseline
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#8b95a1', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8b95a1', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#8b95a1' }} />
          <Bar dataKey="Pro" fill="#ff4d6d" fillOpacity={0.85} radius={[4, 4, 0, 0]} name="Pro Baseline" />
          <Bar dataKey="You" fill="#d4f56a" radius={[4, 4, 0, 0]} name="You">
            {data.map((entry, i) => (
              <Cell
                key={`cell-you-${i}`}
                fill='#d4f56a'
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
