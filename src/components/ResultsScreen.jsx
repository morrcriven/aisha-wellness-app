import { getRecommendation } from '../data/questions'

export default function ResultsScreen({ score, total, memoryScore, memoryTotal, onViewGraph, onHome }) {
  const recommendation = getRecommendation(score, total)
  const rawPct    = Math.round((score / total) * 100)
  const memPct    = memoryTotal > 0 ? Math.round((memoryScore / memoryTotal) * 100) : null

  return (
    <div className="screen">
      <h2 className="results-heading">Well done! Your total score was</h2>

      {/* Raw score */}
      <div className="score-block">
        <span className="score-num">{score}</span>
        <span className="score-sep">/</span>
        <span className="score-total">{total}</span>
      </div>

      {/* Memory score (only shown when there were repeat questions) */}
      {memPct !== null && (
        <div className="memory-score-block">
          <p className="memory-score-label">Memory improvement score</p>
          <div className="memory-score-bar-track">
            <div
              className="memory-score-bar-fill"
              style={{ width: `${memPct}%` }}
            />
          </div>
          <p className="memory-score-value">
            {memoryScore}/{memoryTotal} revisited questions correct ({memPct}%)
          </p>
        </div>
      )}

      <div className="rec-section">
        <p className="rec-heading">My recommendations for you</p>
        <p className="rec-text">{recommendation}</p>
      </div>

      <p className="graph-prompt">Do you want to view your progress graph?</p>

      <div className="yn-row">
        <button className="yn-btn" onClick={onViewGraph}>Yes</button>
        <button className="yn-btn" onClick={onHome}>No</button>
      </div>

      <div className="home-indicator" style={{ marginTop: 'auto' }} />
    </div>
  )
}
