import { useState } from 'react'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_SHORT   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const TABS         = ['Day', 'Week', 'Month', 'Year']

/* ─── Chart data helpers ─────────────────────────────────── */
function getChartData(logs, tab) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  if (tab === 'Year') {
    return MONTHS_SHORT.map((label, i) => {
      const monthLogs = logs.filter(l => {
        const d = new Date(l.date + 'T12:00:00')
        return d.getFullYear() === year && d.getMonth() === i
      })
      const avg = monthLogs.length
        ? monthLogs.reduce((s, l) => s + l.hours, 0) / monthLogs.length
        : null
      return { label, value: avg }
    })
  }

  if (tab === 'Month') {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day     = i + 1
      const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      const log     = logs.find(l => l.date === dateStr)
      return { label: String(day), value: log ? log.hours : null }
    })
  }

  if (tab === 'Week') {
    const startOfWeek = new Date(now)
    const dow         = now.getDay() // 0=Sun
    const toMonday    = dow === 0 ? -6 : 1 - dow
    startOfWeek.setDate(now.getDate() + toMonday)
    return DAYS_SHORT.map((label, i) => {
      const d       = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const log     = logs.find(l => l.date === dateStr)
      return { label, value: log ? log.hours : null }
    })
  }

  // Day — last 7 individual logged nights
  const recent = [...logs].slice(-7)
  while (recent.length < 7) recent.unshift(null)
  return recent.map(l => ({
    label: l ? new Date(l.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
    value: l ? l.hours : null,
  }))
}

function getCaptionText(tab) {
  const word = { Day: 'week', Week: 'week', Month: 'month', Year: 'year' }[tab]
  return `This is your average sleep hours for the ${word}!`
}

/* ─── Main component ─────────────────────────────────────── */
export default function SleepScreen({ logs, onLogsChange, onHome }) {
  const [tab,          setTab]          = useState('Year')
  const [subScreen,    setSubScreen]    = useState('main') // 'main' | 'choose-date' | 'enter-hours'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hoursInput,   setHoursInput]   = useState('')

  function handleHoursSubmit() {
    const hours = parseFloat(hoursInput)
    if (isNaN(hours) || hours < 0 || hours > 24) return
    const updated = logs.filter(l => l.date !== selectedDate)
    updated.push({ date: selectedDate, hours })
    updated.sort((a, b) => a.date.localeCompare(b.date))
    onLogsChange(updated)
    setHoursInput('')
    setSubScreen('main')
  }

  /* ── Choose-date sub-screen ── */
  if (subScreen === 'choose-date') {
    return (
      <div className="screen sleep-screen">
        <button className="btn-back" onClick={() => setSubScreen('main')} aria-label="Back">
          <BackIcon />
        </button>

        <h2 className="sleep-sub-heading">Choose a day</h2>

        <div className="sleep-calendar-icon-wrap" aria-hidden="true">
          <CalendarIcon />
        </div>

        <div style={{ flex: 1 }} />

        <div className="sleep-date-input-row">
          <input
            type="date"
            className="sleep-date-native"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <button
            className="start-btn"
            style={{ marginTop: 16 }}
            onClick={() => setSubScreen('enter-hours')}
            disabled={!selectedDate}
          >
            Continue
          </button>
        </div>

        <div className="home-indicator" />
      </div>
    )
  }

  /* ── Enter-hours sub-screen ── */
  if (subScreen === 'enter-hours') {
    return (
      <div className="screen sleep-screen">
        <button className="btn-back" onClick={() => setSubScreen('choose-date')} aria-label="Back">
          <BackIcon />
        </button>

        <h2 className="sleep-sub-heading">How many hours of sleep did you get?</h2>

        <div style={{ flex: 1 }} />

        <div className="answer-area">
          <input
            className="answer-input"
            type="number"
            min="0"
            max="24"
            step="0.5"
            placeholder="Type here"
            value={hoursInput}
            onChange={e => setHoursInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleHoursSubmit()}
            autoFocus
          />
          <button
            className="submit-btn"
            onClick={handleHoursSubmit}
            disabled={!hoursInput}
          >
            Save
          </button>
        </div>

        <div className="home-indicator" />
      </div>
    )
  }

  /* ── Main tracker screen ── */
  const chartData   = getChartData(logs, tab)
  const captionText = getCaptionText(tab)

  return (
    <div className="screen sleep-screen">
      <button className="btn-back" onClick={onHome} aria-label="Back to home">
        <BackIcon />
      </button>

      <h2 className="sleep-heading">Sleep Tracker</h2>

      {/* Tab bar */}
      <div className="sleep-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`sleep-tab${tab === t ? ' sleep-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="sleep-chart-wrap">
        <SleepBarChart data={chartData} />
      </div>

      <p className="sleep-caption">{captionText}</p>

      <div style={{ flex: 1 }} />

      <button className="sleep-add-btn" onClick={() => setSubScreen('choose-date')}>
        Add sleep hours
      </button>

      <button className="home-btn" onClick={onHome} style={{ marginTop: 12 }} aria-label="Go home">
        <span className="home-btn-label">Home</span>
        <HomeIcon />
      </button>

      <div className="home-indicator" />
    </div>
  )
}

/* ─── SVG Bar Chart ──────────────────────────────────────── */
function SleepBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.value ?? 0), 8)
  const yMax   = Math.ceil(maxVal / 4) * 4 || 8

  const W          = 334
  const H          = 190
  const PAD_LEFT   = 28
  const PAD_BOTTOM = 22
  const PAD_RIGHT  = 6
  const PAD_TOP    = 6
  const chartW     = W - PAD_LEFT - PAD_RIGHT
  const chartH     = H - PAD_TOP - PAD_BOTTOM
  const gridVals   = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax].map(v => Math.round(v))
  const barCount   = data.length
  const slotW      = chartW / barCount
  const barW       = Math.min(slotW * 0.55, 22)

  function yPos(val) {
    return PAD_TOP + chartH - (val / yMax) * chartH
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} aria-hidden="true">
      {/* Grid lines */}
      {gridVals.map(v => (
        <g key={v}>
          <line
            x1={PAD_LEFT} y1={yPos(v)}
            x2={W - PAD_RIGHT} y2={yPos(v)}
            stroke="rgba(0,0,0,0.07)" strokeWidth="1"
          />
          <text x={PAD_LEFT - 4} y={yPos(v) + 4} textAnchor="end" fontSize="10" fill="#888">
            {v}
          </text>
        </g>
      ))}

      {/* Baseline */}
      <line
        x1={PAD_LEFT} y1={PAD_TOP + chartH}
        x2={W - PAD_RIGHT} y2={PAD_TOP + chartH}
        stroke="rgba(0,0,0,0.15)" strokeWidth="1"
      />

      {/* Bars + labels */}
      {data.map((d, i) => {
        const cx   = PAD_LEFT + i * slotW + slotW / 2
        const x    = cx - barW / 2
        const barH = d.value != null ? (d.value / yMax) * chartH : 0
        const y    = yPos(d.value ?? 0)
        return (
          <g key={i}>
            {d.value != null && (
              <rect x={x} y={y} width={barW} height={barH} fill="#4bbfbf" rx="3" />
            )}
            <text
              x={cx} y={PAD_TOP + chartH + 16}
              textAnchor="middle" fontSize="9" fill="#666"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ─── Icons ───────────────────────────────────────────────── */
function BackIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M19 7L11 15L19 23" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M6 16L18 6L30 16V30H23V22H13V30H6V16Z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="15" y="22" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <rect x="16" y="28" width="128" height="116" rx="12" stroke="#1a1a2e" strokeWidth="4" />
      <line x1="16" y1="60" x2="144" y2="60" stroke="#1a1a2e" strokeWidth="3" />
      {/* Rings */}
      {[38, 58, 78, 98, 118, 138].map(x => (
        <g key={x}>
          <rect x={x - 5} y="16" width="10" height="20" rx="5" stroke="#1a1a2e" strokeWidth="3" fill="none" />
        </g>
      ))}
      {/* Calendar grid — 4 cols × 3 rows */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const cx  = 34 + col * 30
        const cy  = 84 + row * 26
        return (
          <rect key={i}
            x={cx - 11} y={cy - 11} width={22} height={22} rx={5}
            stroke="#1a1a2e" strokeWidth={i === 0 ? 2.5 : 2}
            fill={i === 0 ? 'rgba(26,26,110,0.08)' : 'none'}
          />
        )
      })}
      {/* "1" label in first cell */}
      <text x="34" y="79" textAnchor="middle" fontSize="12" fill="#1a1a2e" fontWeight="600">1</text>
    </svg>
  )
}
