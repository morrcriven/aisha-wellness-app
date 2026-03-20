import ProgressChart from './ProgressChart'

export default function GraphScreen({ sessions, onHome }) {
  const lastSession = sessions[sessions.length - 1]
  const hasMemory = lastSession?.memoryTotal > 0

  return (
    <div className="screen graph-screen">
      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#4bbfbf' }} />
          Raw Score
        </span>
        {hasMemory && (
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#1a1a6e' }} />
            Memory Score
          </span>
        )}
      </div>

      <div className="chart-wrap">
        <ProgressChart sessions={sessions} />
      </div>

      <p className="keep-going-text">Keep going!<br />Play again tomorrow 🌱</p>

      <button className="home-btn" onClick={onHome} aria-label="Go home">
        <span className="home-btn-label">Home</span>
        <HomeIcon />
      </button>

      <div className="home-indicator" />
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M6 16L18 6L30 16V30H23V22H13V30H6V16Z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="15" y="22" width="6" height="8" rx="1"
        stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
