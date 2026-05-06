// Map performance band → colour token
const BAND_COLOR = {
  elite:      '#d4f56a',
  proficient: '#a8d94a',
  developing: '#f5c842',
  needs_work: '#ff8c42',
  critical:   '#ff4d6d',
};

const BAND_ICON = {
  elite:      '✅',
  proficient: '🟢',
  developing: '🟡',
  needs_work: '🟠',
  critical:   '🔴',
};

export default function FeedbackPanel({ feedback }) {
  if (!feedback || feedback.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No specific feedback available.
      </div>
    );
  }

  return (
    <div className="feedback-section">
      <ul className="feedback-list" aria-label="Coach recommendations">
        {feedback.map((item, i) => {
          const color = BAND_COLOR[item.band] ?? '#aab8cc';
          const icon  = BAND_ICON[item.band]  ?? '⚪';
          return (
            <li key={i} className="feedback-item" style={{ color }}>
              <span className="feedback-icon" aria-hidden="true">{icon}</span>
              <div style={{ flex: 1 }}>
                {/* Label row with score badge and z-score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <strong>{item.label}</strong>

                  {/* Performance score badge */}
                  {item.score != null && (
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '0.1rem 0.45rem', borderRadius: '99px',
                      background: `${color}22`,
                      border: `1px solid ${color}55`,
                      color,
                    }}>
                      {item.score}/100
                    </span>
                  )}
                </div>

                {/* Coaching tip */}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {item.tip}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
