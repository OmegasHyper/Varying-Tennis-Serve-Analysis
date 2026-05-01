const COURT_CONFIG = {
  grass: {
    label: 'Grass Court',
    emoji: '🟩',
    accent: '#4a7c59',
    accentLight: '#6db88a',
  },
  hard: {
    label: 'Hard Court',
    emoji: '🟦',
    accent: '#2563a8',
    accentLight: '#4a9fd4',
  },
};

const PROJ_LABELS = {
  jump_height_cm:         { label: 'Jump Height',     unit: 'cm' },
  knee_flexion_angle_deg: { label: 'Knee Flexion',    unit: '°' },
  horizontal_displacement_m: { label: 'H. Displacement', unit: 'm' },
  ball_speed_kmh:         { label: 'Ball Speed',      unit: 'km/h' },
};

export default function ProjectionPanel({ projections, currentCourt }) {
  return (
    <div className="projection-section">
      <div className="projection-grid">
        {Object.entries(projections).map(([courtKey, metrics]) => {
          const cfg = COURT_CONFIG[courtKey];
          if (!cfg) return null;
          return (
            <div key={courtKey} className={`proj-card ${courtKey}`} aria-label={`${cfg.label} projection`}>
              <div className="proj-card-title">
                <span aria-hidden="true">{cfg.emoji}</span>
                {cfg.label} Projection
              </div>
              {Object.entries(metrics).map(([k, v]) => {
                const meta = PROJ_LABELS[k];
                if (!meta) return null;
                return (
                  <div key={k} className="proj-row">
                    <span className="proj-row-label">{meta.label}</span>
                    <span className="proj-row-val" style={{ color: cfg.accentLight }}>
                      {typeof v === 'number' && v < 1 ? v.toFixed(2) : v}
                      <span style={{ fontSize: '0.7rem', color: '#4a5568', marginLeft: 2 }}>{meta.unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
