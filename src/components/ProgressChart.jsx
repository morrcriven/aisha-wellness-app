/**
 * SVG area chart — no external dependencies.
 *
 * Series 1 (teal)  — Raw Score %  (correct / total * 100)
 * Series 2 (navy)  — Memory Score % (correct repeats / total repeats * 100)
 *
 * If < 3 real sessions, prefills with example data so the chart always looks
 * meaningful on first play.
 */

// Example history used when the user has played fewer than 3 sessions.
// Two parallel arrays: rawPct and memPct (null = no repeat questions that session).
const EXAMPLE_RAW = [45, 52, 60, 55, 68, 72]
const EXAMPLE_MEM = [null, 50, 58, 70, 65, 78]

function buildChartData(sessions) {
  const toReal = (s) => ({
    label:  formatDate(s.date),
    rawPct: Math.round((s.score / s.total) * 100),
    memPct: s.memoryTotal > 0
      ? Math.round((s.memoryScore / s.memoryTotal) * 100)
      : null,
    isReal: true,
  })

  if (sessions.length >= 3) return sessions.map(toReal)

  const example = EXAMPLE_RAW.map((rawPct, i) => ({
    label:  `Sess. ${i + 1}`,
    rawPct,
    memPct: EXAMPLE_MEM[i],
    isReal: false,
  }))
  return [...example, ...sessions.map(toReal)]
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function ProgressChart({ sessions }) {
  const data = buildChartData(sessions)
  const n    = data.length

  // SVG viewport
  const W = 340, H = 200
  const padL = 34, padR = 12, padT = 22, padB = 28
  const cW = W - padL - padR
  const cH = H - padT - padB

  const getX   = (i)   => padL + (n > 1 ? (i / (n - 1)) * cW : cW / 2)
  const getY   = (pct) => padT + (1 - pct / 100) * cH

  // Build series — skip null memPct points but keep the array aligned
  const series1 = data.map((d, i) => ({ x: getX(i), y: getY(d.rawPct) }))
  const series2 = data
    .map((d, i) => d.memPct !== null ? { x: getX(i), y: getY(d.memPct) } : null)

  function areaPath(pts) {
    // Only use non-null points
    const valid = pts.filter(Boolean)
    if (valid.length < 2) return ''
    const line   = valid.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    const bottom = padT + cH
    return `${line} L${valid[valid.length - 1].x.toFixed(1)},${bottom} L${valid[0].x.toFixed(1)},${bottom} Z`
  }

  const gridLines = [0, 25, 50, 75, 100]
  const labelStep = Math.ceil(n / 6)

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      aria-label="Progress chart"
      style={{ display: 'block' }}
    >
      {/* Grid lines */}
      {gridLines.map((val) => (
        <line key={val}
          x1={padL} y1={getY(val)} x2={padL + cW} y2={getY(val)}
          stroke="#ccc" strokeWidth="0.6"
        />
      ))}

      {/* Y-axis labels */}
      {gridLines.map((val) => (
        <text key={val}
          x={padL - 5} y={getY(val)}
          textAnchor="end" dominantBaseline="middle"
          fontSize="9" fill="#888"
        >
          {val}%
        </text>
      ))}

      {/* Area — navy memory score (behind) */}
      {areaPath(series2) && (
        <path d={areaPath(series2)} fill="#1a1a6e" fillOpacity="0.45" />
      )}

      {/* Area — teal raw score (front) */}
      <path d={areaPath(series1)} fill="#4bbfbf" fillOpacity="0.55" />

      {/* Dots — raw score */}
      {series1.map((p, i) => (
        <circle key={i}
          cx={p.x} cy={p.y} r="3"
          fill={data[i].isReal ? '#4bbfbf' : '#9adada'}
          stroke="white" strokeWidth="1"
        />
      ))}

      {/* Dots — memory score (only non-null) */}
      {series2.map((p, i) =>
        p ? (
          <circle key={i}
            cx={p.x} cy={p.y} r="3"
            fill={data[i].isReal ? '#1a1a6e' : '#8888bb'}
            stroke="white" strokeWidth="1"
          />
        ) : null
      )}

      {/* X-axis labels */}
      {data.map((d, i) =>
        i % labelStep === 0 || i === n - 1 ? (
          <text key={i}
            x={getX(i)} y={padT + cH + 14}
            textAnchor="middle" fontSize="8"
            fill={d.isReal ? '#555' : '#aaa'}
          >
            {d.label}
          </text>
        ) : null
      )}

      {/* Example data note */}
      {sessions.length < 3 && (
        <text x={padL} y={padT - 8} fontSize="8" fill="#bbb" fontStyle="italic">
          Example history — play more to see real trends
        </text>
      )}
    </svg>
  )
}
