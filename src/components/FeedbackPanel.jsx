export default function FeedbackPanel({ feedback }) {
  if (!feedback || feedback.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No specific feedback available.
      </div>
    );
  }

  const coloredFeedback = [
  {
    text: "Excellent jump height! Your vertical leap is already at a professional level.",
    color: "#d4f56a" // Green (your color)
  },
  {
    text: "Consider adding more arm swing momentum during the takeoff phase.",
    color: "#ff4d6d" // Red (area to improve)
  },
  {
    text: "Knee flexion angle shows good control, but aim for a slightly deeper squat.",
    color: "#ff4d6d"
  },
  {
    text: "Your landing impact is well-distributed across both feet, which reduces injury risk.",
    color: "#d4f56a"
  },
  {
    text: "Work on hip mobility to increase the range of motion during the loading phase.",
    color: "#ff4d6d"
  }
];

  return (
    <div className="feedback-section">
      <ul className="feedback-list" aria-label="Coach recommendations">
        {feedback.map((item, i) => (
          <li key={i} className="feedback-item" style={{ color: coloredFeedback[i].color }}>
            {coloredFeedback[i].text}
          </li>
        ))}
      </ul>
    </div>
  );
}
