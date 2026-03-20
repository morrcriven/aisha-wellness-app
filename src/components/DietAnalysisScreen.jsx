import { useEffect, useState } from 'react'
import { analyseMealImage } from '../utils/openai'

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

export default function DietAnalysisScreen({ imageDataUrl, description, onSave, onDiscard }) {
  const [status, setStatus]   = useState('loading') // 'loading' | 'done' | 'error'
  const [result, setResult]   = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function run() {
      const res = await analyseMealImage(imageDataUrl, description)
      if (res.ok) {
        setResult(res.result)
        setStatus('done')
      } else {
        setErrorMsg(res.error)
        setStatus('error')
      }
    }
    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen diet-analysis-screen">
      <button className="btn-back" onClick={onDiscard} aria-label="Back">
        <BackIcon />
      </button>

      {status === 'loading' && (
        <div className="diet-loading-state">
          <div className="diet-loading-spinner" />
          <p className="diet-loading-text">Analysing your meal…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="diet-loading-state">
          <p className="diet-error-text">{errorMsg}</p>
          <button className="start-btn" onClick={onDiscard} style={{ marginTop: 24 }}>
            Go back
          </button>
        </div>
      )}

      {status === 'done' && result && (
        <>
          {/* Meal photo */}
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Your meal"
              className="diet-analysis-photo"
            />
          )}

          {/* Meal label */}
          <p className="diet-meal-name-label">{result.mealLabel}</p>

          {/* High in */}
          <p className="diet-analysis-highlight">
            Your meal is {result.highlight}
          </p>

          {/* MIND diet alignment */}
          <div className={`diet-mind-note diet-mind-note--${result.mindAligned ? 'good' : 'bad'}`}>
            <span className="diet-mind-icon">{result.mindAligned ? '✓' : '!'}</span>
            <p>{result.mindNote}</p>
          </div>

          {/* Macro bars */}
          <div className="diet-analysis-macros">
            {Object.entries(LABELS).map(([key, label]) => {
              const pct = result.macros?.[key] ?? 0
              return (
                <div key={key} className="diet-macro-row">
                  <span className="diet-macro-label">{label}</span>
                  <div className="diet-macro-track">
                    <div
                      className="diet-macro-fill"
                      style={{ width: `${pct}%`, background: COLORS[key] }}
                    />
                  </div>
                  <span className="diet-macro-pct">{pct}%</span>
                </div>
              )
            })}
          </div>

          {/* Save / Discard */}
          <div className="diet-save-discard-row">
            <button className="diet-save-btn" onClick={() => onSave(result)}>
              <TickIcon /> Save meal
            </button>
            <button className="diet-discard-btn" onClick={onDiscard}>
              <CrossIcon /> Discard
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function TickIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: 6 }}>
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.25)" />
      <path d="M7 12l4 4 6-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', marginRight: 6 }}>
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.15)" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
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
