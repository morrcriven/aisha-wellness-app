import { useState, useMemo } from 'react'

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
  const [bedTime,      setBedTime]      = useState('')
  const [wakeTime,     setWakeTime]     = useState('')

  const calculatedHours = useMemo(() => {
    if (!bedTime || !wakeTime) return null
    const [bH, bM] = bedTime.split(':').map(Number)
    const [wH, wM] = wakeTime.split(':').map(Number)
    if ([bH, bM, wH, wM].some(n => Number.isNaN(n))) return null
    let bedMin  = bH * 60 + bM
    let wakeMin = wH * 60 + wM
    // If wake time is at-or-before bed time, assume next-day wake-up
    if (wakeMin <= bedMin) wakeMin += 24 * 60
    return (wakeMin - bedMin) / 60
  }, [bedTime, wakeTime])

  function handleHoursSubmit() {
    if (calculatedHours == null || calculatedHours <= 0 || calculatedHours > 24) return
    const updated = logs.filter(l => l.date !== selectedDate)
    updated.push({ date: selectedDate, hours: calculatedHours })
    updated.sort((a, b) => a.date.localeCompare(b.date))
    onLogsChange(updated)
    setBedTime('')
    setWakeTime('')
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

        <InlineCalendar value={selectedDate} onChange={setSelectedDate} />

        <div className="sleep-date-input-row">
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
    const showResult = calculatedHours != null
    const canSave    = showResult && calculatedHours > 0 && calculatedHours <= 24
    return (
      <div className="screen sleep-screen">
        <button className="btn-back" onClick={() => setSubScreen('choose-date')} aria-label="Back">
          <BackIcon />
        </button>

        <h2 className="sleep-sub-heading">When did you sleep?</h2>

        <div className="sleep-time-inputs">
          <label className="sleep-time-field">
            <span className="sleep-time-label">What time did you go to bed?</span>
            <input
              className="sleep-time-input"
              type="time"
              value={bedTime}
              onChange={e => setBedTime(e.target.value)}
            />
          </label>

          <label className="sleep-time-field">
            <span className="sleep-time-label">What time did you wake up?</span>
            <input
              className="sleep-time-input"
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
            />
          </label>
        </div>

        {showResult && (
          <p className="sleep-time-result">
            That's <strong>{calculatedHours.toFixed(1)} hours</strong> of sleep.
          </p>
        )}

        <div style={{ flex: 1 }} />

        <button
          className="submit-btn"
          onClick={handleHoursSubmit}
          disabled={!canSave}
        >
          Save
        </button>

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
  if (hours == null) return '#C5D5E8'
  if (hours < 6)    return '#c0392b'   // too little — red
  if (hours < 7)    return '#e67e22'   // below target — amber
  if (hours <= 9)   return '#5C8A80'   // ideal — teal-sage
  return '#6B7DB3'                     // too much — periwinkle
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

const DOW_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function InlineCalendar({ value, onChange }) {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const initDate = value ? new Date(value + 'T12:00:00') : today
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()) // 0-indexed

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1
    // Don't navigate past current month
    if (nextY > today.getFullYear() || (nextY === today.getFullYear() && nextM > today.getMonth())) return
    setViewMonth(nextM); if (viewMonth === 11) setViewYear(y => y + 1)
  }

  // Build grid: Mon-based weeks
  const firstOfMonth = new Date(viewYear, viewMonth, 1)
  const dowFirst = firstOfMonth.getDay() // 0=Sun
  const startOffset = dowFirst === 0 ? 6 : dowFirst - 1 // cells before day 1
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  const monthLabel = firstOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  const atMaxMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1
    if (dayNum < 1 || dayNum > daysInMonth) return { dayNum: null, dateStr: null }
    const pad = n => String(n).padStart(2, '0')
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(dayNum)}`
    return { dayNum, dateStr }
  })

  return (
    <div className="sleep-cal">
      <div className="sleep-cal-header">
        <button className="sleep-cal-nav" onClick={prevMonth} aria-label="Previous month">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="sleep-cal-month-label">{monthLabel}</span>
        <button className="sleep-cal-nav" onClick={nextMonth} aria-label="Next month" disabled={atMaxMonth}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="sleep-cal-grid">
        {DOW_LABELS.map(d => (
          <span key={d} className="sleep-cal-dow">{d}</span>
        ))}
        {cells.map((cell, i) => {
          if (!cell.dateStr) return <span key={i} className="sleep-cal-day sleep-cal-day--outside" />
          const isToday    = cell.dateStr === todayStr
          const isSelected = cell.dateStr === value
          const isFuture   = cell.dateStr > todayStr
          const cls = [
            'sleep-cal-day',
            isToday    ? 'sleep-cal-day--today'    : '',
            isSelected ? 'sleep-cal-day--selected' : '',
            isFuture   ? 'sleep-cal-day--disabled' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={i}
              className={cls}
              onClick={() => !isFuture && onChange(cell.dateStr)}
              disabled={isFuture}
              aria-label={cell.dateStr}
              aria-pressed={isSelected}
            >
              {cell.dayNum}
            </button>
          )
        })}
      </div>
    </div>
  )
}
