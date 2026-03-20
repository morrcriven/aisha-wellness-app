import { useState } from 'react'

const MIND_TARGETS = { fruitsVeg: 40, protein: 25, fibreCarbs: 25, fats: 10 }

const COLORS = {
  fruitsVeg:  '#5b9bd5',
  protein:    '#6ab04c',
  fibreCarbs: '#c87941',
  fats:       '#9179c0',
}

const LABELS = {
  fruitsVeg:  'Fruits & Veg',
  protein:    'Protein',
  fibreCarbs: 'Fibre Carbs',
  fats:       'Fats',
}

export default function DietScreen({ logs, onLogMeal, onSeeRecs, onHome }) {
  const [view, setView] = useState('day')

  const today = new Date().toISOString().slice(0, 10)
  const todayLogs = logs.filter((l) => l.date === today)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const weekLogs = logs.filter((l) => new Date(l.date + 'T12:00:00') >= sevenDaysAgo)

  const currentLogs = view === 'day' ? todayLogs : weekLogs
  const isReference = currentLogs.length === 0
  const macros      = isReference ? MIND_TARGETS : getMacroAverage(currentLogs)

  return (
    <div className="screen diet-screen">
      <button className="btn-back" onClick={onHome} aria-label="Back">
        <BackIcon />
      </button>

      <h1 className="diet-heading">Your Diet</h1>

      {/* Day / Week toggle */}
      <div className="diet-toggle-row">
        <button
          className={`diet-toggle-btn${view === 'day' ? ' diet-toggle-btn--active' : ''}`}
          onClick={() => setView('day')}
        >
          Day
        </button>
        <button
          className={`diet-toggle-btn${view === 'week' ? ' diet-toggle-btn--active' : ''}`}
          onClick={() => setView('week')}
        >
          Week
        </button>
      </div>

      <p className="diet-chart-label">Balanced diet</p>

      {/* Pie chart */}
      <div className="diet-pie-wrap">
        <DietPieChart macros={macros} isReference={isReference} />
      </div>

      {/* Legend */}
      <div className="diet-pie-legend">
        {Object.entries(LABELS).map(([key, label]) => (
          <div key={key} className="diet-legend-item">
            <div className="diet-legend-dot" style={{ background: COLORS[key] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {isReference && (
        <p className="diet-reference-note">
          Showing MIND diet targets — log meals to see your breakdown
        </p>
      )}

      {/* Today's meal list */}
      {view === 'day' && todayLogs.length > 0 && (
        <div className="diet-meals-list">
          {todayLogs.map((log) => (
            <div key={log.id} className="diet-meal-row">
              <span className="diet-meal-time">{formatTime(log.timestamp)}</span>
              <span className="diet-meal-label">{log.mealLabel}</span>
              <span className={`diet-mind-badge diet-mind-badge--${log.mindAligned ? 'yes' : 'no'}`}>
                MIND {log.mindAligned ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === 'week' && weekLogs.length === 0 && (
        <p className="diet-empty-state">No meals logged in the last 7 days.</p>
      )}

      {/* Action buttons */}
      <div className="diet-action-row">
        <button className="start-btn" onClick={onLogMeal}>
          Log a meal
        </button>
        {logs.length > 0 && (
          <button className="diet-recs-btn" onClick={onSeeRecs}>
            See recommendations
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────── */

function getMacroAverage(logs) {
  const sum = logs.reduce(
    (acc, l) => ({
      fruitsVeg:  acc.fruitsVeg  + (l.macros?.fruitsVeg  ?? 0),
      protein:    acc.protein    + (l.macros?.protein    ?? 0),
      fibreCarbs: acc.fibreCarbs + (l.macros?.fibreCarbs ?? 0),
      fats:       acc.fats       + (l.macros?.fats       ?? 0),
    }),
    { fruitsVeg: 0, protein: 0, fibreCarbs: 0, fats: 0 }
  )
  const n = logs.length
  return {
    fruitsVeg:  Math.round(sum.fruitsVeg  / n),
    protein:    Math.round(sum.protein    / n),
    fibreCarbs: Math.round(sum.fibreCarbs / n),
    fats:       Math.round(sum.fats       / n),
  }
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ─── Donut Pie Chart ─────────────────────────────────────── */

function DietPieChart({ macros, isReference }) {
  const cx = 100, cy = 100, R = 82, r = 50

  const segments = [
    { key: 'fruitsVeg',  value: macros.fruitsVeg,  color: COLORS.fruitsVeg  },
    { key: 'protein',    value: macros.protein,     color: COLORS.protein    },
    { key: 'fibreCarbs', value: macros.fibreCarbs,  color: COLORS.fibreCarbs },
    { key: 'fats',       value: macros.fats,        color: COLORS.fats       },
  ]

  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null

  let startAngle = -Math.PI / 2
  const slices = segments.map((seg) => {
    const angle    = (seg.value / total) * 2 * Math.PI
    const endAngle = startAngle + angle
    const pct      = Math.round((seg.value / total) * 100)
    const slice    = { ...seg, startAngle, endAngle, angle, pct }
    startAngle     = endAngle
    return slice
  })

  return (
    <svg width="200" height="200" viewBox="0 0 200 200" style={{ display: 'block', margin: '0 auto' }} aria-label="Diet macro pie chart">
      {/* White backing circle */}
      <circle cx={cx} cy={cy} r={R + 10} fill="white" />

      {slices.map((slice) => (
        <path
          key={slice.key}
          d={donutSlice(cx, cy, R, r, slice.startAngle, slice.endAngle)}
          fill={slice.color}
          stroke="white"
          strokeWidth="2"
          opacity={isReference ? 0.75 : 1}
        />
      ))}

      {/* Donut hole */}
      <circle cx={cx} cy={cy} r={r} fill="white" />

      {/* Percentage labels */}
      {slices.map((slice) => {
        if (slice.pct < 8) return null
        const mid  = slice.startAngle + slice.angle / 2
        const labR = (R + r) / 2
        return (
          <text
            key={slice.key + '-pct'}
            x={cx + labR * Math.cos(mid)}
            y={cy + labR * Math.sin(mid)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fontWeight="800"
            fill="white"
          >
            {slice.pct}%
          </text>
        )
      })}
    </svg>
  )
}

function donutSlice(cx, cy, R, r, start, end) {
  const large = end - start > Math.PI ? 1 : 0
  const ox1 = cx + R * Math.cos(start), oy1 = cy + R * Math.sin(start)
  const ox2 = cx + R * Math.cos(end),   oy2 = cy + R * Math.sin(end)
  const ix1 = cx + r * Math.cos(end),   iy1 = cy + r * Math.sin(end)
  const ix2 = cx + r * Math.cos(start), iy2 = cy + r * Math.sin(start)
  return `M ${f(ox1)} ${f(oy1)} A ${R} ${R} 0 ${large} 1 ${f(ox2)} ${f(oy2)} L ${f(ix1)} ${f(iy1)} A ${r} ${r} 0 ${large} 0 ${f(ix2)} ${f(iy2)} Z`
}

const f = (n) => n.toFixed(2)

/* ─── Icons ───────────────────────────────────────────────── */

function BackIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M19 7L11 15L19 23" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
