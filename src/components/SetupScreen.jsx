import { useState } from 'react'

const PRESETS = [5, 10, 15]

export default function SetupScreen({ maxQuestions, onBack, onStart }) {
  const [selected, setSelected] = useState(null)
  const [customValue, setCustomValue] = useState('')
  const [hint, setHint] = useState('')

  const resolvedCount = selected ?? (customValue ? parseInt(customValue, 10) : null)
  const isValid = resolvedCount && resolvedCount >= 1 && resolvedCount <= maxQuestions

  function handleCustomChange(e) {
    const val = e.target.value.replace(/\D/g, '')
    setCustomValue(val)
    setSelected(null)
    if (val) {
      const n = parseInt(val, 10)
      if (n < 1) setHint('Minimum is 1 question.')
      else if (n > maxQuestions) setHint(`Maximum is ${maxQuestions} questions.`)
      else setHint('')
    } else {
      setHint('')
    }
  }

  function handlePreset(n) {
    setSelected(n)
    setCustomValue('')
    setHint('')
  }

  function handleStart() {
    if (!isValid) return
    const clamped = Math.min(Math.max(resolvedCount, 1), maxQuestions)
    onStart(clamped)
  }

  return (
    <div className="screen">
      <button className="btn-back" onClick={onBack} aria-label="Back">
        <BackIcon />
      </button>

      <h2 className="setup-heading">How many questions would you like?</h2>

      <div className="preset-row">
        {PRESETS.map((n) => (
          <button
            key={n}
            className={`preset-btn${selected === n ? ' selected' : ''}`}
            onClick={() => handlePreset(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="or-divider">or</div>

      <input
        className="number-input"
        type="number"
        inputMode="numeric"
        min="1"
        max={maxQuestions}
        placeholder="—"
        value={customValue}
        onChange={handleCustomChange}
        aria-label="Custom number of questions"
      />
      <p className="input-hint">{hint || `Choose between 1 – ${maxQuestions}`}</p>

      <button
        className="start-btn"
        onClick={handleStart}
        disabled={!isValid}
      >
        Start game
      </button>

      <div className="home-indicator" />
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M19 7L11 15L19 23" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
