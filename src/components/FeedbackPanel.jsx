export default function FeedbackPanel({ feedback }) {
  if (!feedback || feedback.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No specific feedback available.
      </div>
    );
  }

  const icons = ['🎯', '💪', '🔄', '⚡', '🏃'];

  return (
    <div className="feedback-section">
      <ul className="feedback-list" aria-label="Coach recommendations">
        {feedback.map((item, i) => (
          <li key={i} className="feedback-item">
            <span className="feedback-icon" aria-hidden="true">
              {icons[i % icons.length]}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
