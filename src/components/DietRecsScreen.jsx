const MIND_TARGETS = { fruitsVeg: 40, protein: 25, fibreCarbs: 25, fats: 10 }

const MIND_RECS = {
  fruitsVeg: {
    label: 'Fruits & Vegetables',
    low: 'Aim for 40% of your plate from fruits and vegetables. Include leafy greens daily and berries at least twice a week — both are MIND diet staples that support brain health.',
  },
  protein: {
    label: 'Quality Protein',
    low: 'Aim for 25% quality protein. MIND diet recommends fish or seafood at least once a week, poultry twice a week, and legumes like lentils and beans regularly.',
  },
  fibreCarbs: {
    label: 'Fibre-Rich Carbohydrates',
    low: 'Aim for 25% fibre-rich carbohydrates. Choose whole grains, oats, and lentils over refined carbs — they provide sustained energy and support gut health.',
  },
  fats: {
    label: 'Healthy Fats',
    high: 'Keep fats to around 10% of your plate. Prioritise olive oil as your main fat source and include 5+ servings of nuts per week. Limit butter, red meat, and fried food.',
  },
}

export default function DietRecsScreen({ logs, onBack, onHome }) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const weekLogs = logs.filter((l) => new Date(l.date + 'T12:00:00') >= sevenDaysAgo)

  const hasLogs = weekLogs.length > 0

  let avgMacros = null
  if (hasLogs) {
    const sum = weekLogs.reduce(
      (acc, l) => ({
        fruitsVeg:  acc.fruitsVeg  + (l.macros?.fruitsVeg  ?? 0),
        protein:    acc.protein    + (l.macros?.protein    ?? 0),
        fibreCarbs: acc.fibreCarbs + (l.macros?.fibreCarbs ?? 0),
        fats:       acc.fats       + (l.macros?.fats       ?? 0),
      }),
      { fruitsVeg: 0, protein: 0, fibreCarbs: 0, fats: 0 }
    )
    const n = weekLogs.length
    avgMacros = {
      fruitsVeg:  Math.round(sum.fruitsVeg  / n),
      protein:    Math.round(sum.protein    / n),
      fibreCarbs: Math.round(sum.fibreCarbs / n),
      fats:       Math.round(sum.fats       / n),
    }
  }

  // Compute which macros need attention (>5pp off target)
  const recs = []
  if (avgMacros) {
    if (avgMacros.fruitsVeg < MIND_TARGETS.fruitsVeg - 5) {
      recs.push({ key: 'fruitsVeg', avg: avgMacros.fruitsVeg, target: MIND_TARGETS.fruitsVeg, dir: 'low' })
    }
    if (avgMacros.protein < MIND_TARGETS.protein - 5) {
      recs.push({ key: 'protein', avg: avgMacros.protein, target: MIND_TARGETS.protein, dir: 'low' })
    }
    if (avgMacros.fibreCarbs < MIND_TARGETS.fibreCarbs - 5) {
      recs.push({ key: 'fibreCarbs', avg: avgMacros.fibreCarbs, target: MIND_TARGETS.fibreCarbs, dir: 'low' })
    }
    if (avgMacros.fats > MIND_TARGETS.fats + 5) {
      recs.push({ key: 'fats', avg: avgMacros.fats, target: MIND_TARGETS.fats, dir: 'high' })
    }
  }

  const isOnTrack = hasLogs && recs.length === 0

  return (
    <div className="screen diet-recs-screen">
      <button className="btn-back" onClick={onBack} aria-label="Back">
        <BackIcon />
      </button>

      <h1 className="diet-heading">Recommendations</h1>
      <p className="diet-recs-sub">Based on your MIND diet alignment this week</p>

      {!hasLogs && (
        <div className="diet-loading-state">
          <p className="diet-empty-state">Log some meals this week to get personalised recommendations.</p>
          <button className="start-btn" onClick={onBack} style={{ marginTop: 24 }}>
            Back to Diet
          </button>
        </div>
      )}

      {isOnTrack && (
        <div className="diet-recs-success">
          <div className="diet-recs-success-icon">🌿</div>
          <p>Your diet is well balanced and closely follows MIND diet principles. Keep it up!</p>
        </div>
      )}

      {hasLogs && recs.length > 0 && (
        <div className="diet-rec-list">
          {recs.map(({ key, avg, target, dir }) => {
            const info = MIND_RECS[key]
            const text = dir === 'low' ? info.low : info.high
            return (
              <div key={key} className="diet-rec-card">
                <div className="diet-rec-header">
                  <span className="diet-rec-macro-name">{info.label}</span>
                  <span className="diet-rec-delta">
                    {avg}% {dir === 'low' ? '↓' : '↑'} (target {target}%)
                  </span>
                </div>
                <p className="diet-rec-text">{text}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* MIND diet at a glance */}
      <div className="diet-mind-summary">
        <p className="diet-mind-summary-title">MIND Diet at a glance</p>
        {MIND_TIPS.map((tip, i) => (
          <div key={i} className="diet-mind-tip">
            <span className="diet-mind-tip-icon">{tip.icon}</span>
            <p className="diet-mind-tip-text">{tip.text}</p>
          </div>
        ))}
      </div>

      <button className="diet-recs-btn" style={{ marginTop: 16 }} onClick={onHome}>
        Home
      </button>
    </div>
  )
}

const MIND_TIPS = [
  { icon: '🐟', text: 'Fish or seafood at least once a week' },
  { icon: '🍗', text: 'Poultry (e.g. chicken or turkey) twice a week' },
  { icon: '🫐', text: 'Berries at least twice a week — blueberries are ideal' },
  { icon: '🥬', text: 'Leafy greens (salad, spinach, kale) daily' },
  { icon: '🫘', text: '4+ servings of legumes per week' },
  { icon: '🥜', text: '5+ servings of nuts per week' },
  { icon: '🫒', text: 'Use olive oil as your main cooking fat' },
  { icon: '🚫', text: 'Limit red meat, butter, cheese, pastries, and fried food' },
]

function BackIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M19 7L11 15L19 23" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
