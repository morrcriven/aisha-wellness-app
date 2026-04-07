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
    const numWeeks    = Math.ceil(daysInMonth / 7)
    return Array.from({ length: numWeeks }, (_, w) => {
      const startDay = w * 7 + 1
      const endDay   = Math.min(startDay + 6, daysInMonth)
      const weekLogs = logs.filter(l => {
        const d = new Date(l.date + 'T12:00:00')
        return d.getFullYear() === year && d.getMonth() === month &&
               d.getDate() >= startDay && d.getDate() <= endDay
      })
      const avg = weekLogs.length
        ? weekLogs.reduce((s, l) => s + l.hours, 0) / weekLogs.length
        : null
      return { label: `Wk ${w + 1}`, value: avg }
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

  // Day — today only
  const todayStr = now.toISOString().slice(0, 10)
  const todayLog = logs.find(l => l.date === todayStr)
  const todayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return [{ label: todayLabel, value: todayLog ? todayLog.hours : null }]
}

function getCaptionText(tab) {
  const word = { Day: 'week', Week: 'week', Month: 'month', Year: 'year' }[tab]
  return `This is your average sleep hours for the ${word}!`
}

function getMonthAvgComment(avg) {
  if (avg < 6)   return 'Below recommended — try to aim for 7–9 hours.'
  if (avg < 7)   return 'Getting there! A little more sleep would help.'
  if (avg <= 9)  return 'Great — right in the recommended 7–9 hour range!'
  return 'Slightly above average — consistency matters most.'
}

function getMonthlyAverage(logs) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  const monthLogs = logs.filter(l => {
    const d = new Date(l.date + 'T12:00:00')
    return d.getFullYear() === year && d.getMonth() === month
  })
  if (!monthLogs.length) return null
  return monthLogs.reduce((s, l) => s + l.hours, 0) / monthLogs.length
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
  const chartData    = getChartData(logs, tab)
  const captionText  = getCaptionText(tab)
  const monthlyAvg   = tab === 'Month' ? getMonthlyAverage(logs) : null
  const monthName    = new Date().toLocaleString('default', { month: 'long' })

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

      {/* Data list */}
      <div className="sleep-list">
        <SleepList data={chartData} />
      </div>

      {/* Monthly average summary */}
      {tab === 'Month' && (
        <div className="sleep-month-avg">
          <p className="sleep-month-avg-label">{monthName} average</p>
          {monthlyAvg !== null ? (
            <>
              <p className="sleep-month-avg-value">{monthlyAvg.toFixed(1)}<span className="sleep-month-avg-unit"> hrs</span></p>
              <p className="sleep-month-avg-sub">{getMonthAvgComment(monthlyAvg)}</p>
            </>
          ) : (
            <p className="sleep-month-avg-sub">No data logged this month yet.</p>
          )}
        </div>
      )}

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

/* ─── Sleep List (MacroFactor-style) ─────────────────────── */
function SleepList({ data }) {
  const maxVal  = Math.max(...data.map(d => d.value ?? 0), 9)
  const wideLabel = data.length === 1

  return (
    <>
      {data.map((d, i) => {
        const fillPct = d.value != null ? (d.value / maxVal) * 100 : 0
        const color   = barColor(d.value)
        return (
          <div key={i} className="sleep-row">
            <span className={`sleep-row-label${wideLabel ? ' sleep-row-label--wide' : ''}`}>{d.label}</span>
            <div className="sleep-row-track">
              {d.value != null && (
                <div
                  className="sleep-row-fill"
                  style={{ width: `${fillPct}%`, background: color }}
                />
              )}
            </div>
            <span className="sleep-row-value" style={{ color: d.value != null ? color : undefined }}>
              {d.value != null ? `${d.value.toFixed(1)}h` : '—'}
            </span>
          </div>
        )
      })}
    </>
  )
}

function barColor(hours) {
  if (hours == null) return '#ccc'
  if (hours < 6)    return '#c0392b'   // too little — red
  if (hours < 7)    return '#e67e22'   // below target — amber
  if (hours <= 9)   return '#4bbfbf'   // ideal — teal
  return '#1a1a6e'                     // too much — navy
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
