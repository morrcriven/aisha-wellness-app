import { useState, useEffect, useRef } from 'react'
import { checkAnswer } from '../data/questions'

export default function QuestionScreen({ question, questionIndex, total, isRepeat, onAnswer, onBack }) {
  const [answer, setAnswer]         = useState('')
  const [phase, setPhase]           = useState('input') // 'input' | 'feedback' | 'retry'
  const [retryInput, setRetryInput] = useState('')
  const inputRef  = useRef(null)
  const retryRef  = useRef(null)

  // Reset when question changes
  useEffect(() => {
    setAnswer('')
    setRetryInput('')
    setPhase('input')
    inputRef.current?.focus()
  }, [questionIndex])

  // Focus the retry field when we enter the retry phase
  useEffect(() => {
    if (phase === 'retry') {
      setTimeout(() => retryRef.current?.focus(), 50)
    }
  }, [phase])

  function handleSubmit() {
    if (!answer.trim() || phase !== 'input') return
    const correct = checkAnswer(answer, question.answer)
    if (correct) {
      setPhase('feedback')
      setTimeout(() => onAnswer(true), 1600)
    } else {
      setPhase('retry')
    }
  }

  function handleRetrySubmit() {
    if (!retryMatches) return
    setPhase('retry-success')
    setTimeout(() => onAnswer(false), 1800)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  function handleRetryKeyDown(e) {
    if (e.key === 'Enter') handleRetrySubmit()
  }

  // The retry input matches if it equals any accepted answer (case-insensitive)
  const retryMatches = question.answer.some(
    (a) => retryInput.trim().toLowerCase() === a.toLowerCase()
  )

  // Display form of the correct answer — capitalise first letter
  const correctDisplay = question.answer[0].charAt(0).toUpperCase() + question.answer[0].slice(1)

  const progress = (questionIndex / total) * 100

  return (
    <div className="screen question-screen" style={{ position: 'relative' }}>
      <button className="btn-back" onClick={onBack} aria-label="Back">
        <BackIcon />
      </button>

      {/* Progress bar */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <p className="question-intro-label">Great! Let's begin:</p>
      <h2 className="question-number-label">Question {questionIndex + 1}</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 0 }}>
        <span className="category-pill">{question.category}</span>
        {isRepeat && <span className="category-pill category-pill--repeat">↩ Revisit</span>}
      </div>

      <p className="question-text">{question.question}</p>

      <div className="answer-area">
        <p className="answer-label">Your answer</p>
        <input
          ref={inputRef}
          className="answer-input"
          type="text"
          placeholder="Type here…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={phase !== 'input'}
          aria-label="Answer input"
          autoComplete="off"
          autoCapitalize="off"
        />
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!answer.trim() || phase !== 'input'}
        >
          Submit
        </button>
      </div>

      <div className="home-indicator" />

      {/* ── Correct feedback overlay (auto-advances) ── */}
      {phase === 'feedback' && (
        <div className="feedback-overlay">
          <div className="feedback-emoji">✅</div>
          <p className="feedback-verdict feedback-correct">Correct!</p>
          <p className="feedback-answer-text" style={{ marginTop: 16, fontSize: 13, opacity: 0.6 }}>
            {questionIndex + 1 < total ? `Up next: Question ${questionIndex + 2}` : 'Almost done!'}
          </p>
        </div>
      )}

      {/* ── Wrong answer overlay — must type correct answer to continue ── */}
      {phase === 'retry' && (
        <div className="feedback-overlay">
          <div className="feedback-emoji">❌</div>
          <p className="feedback-verdict feedback-wrong">Not quite…</p>
          <p className="retry-question-text">{question.question}</p>
          <p className="feedback-answer-text">
            The correct answer is:
          </p>
          <p className="retry-correct-answer">{correctDisplay}</p>
          <p className="retry-instruction">Type it out to continue</p>
          <input
            ref={retryRef}
            className="retry-input"
            type="text"
            placeholder="Type the answer…"
            value={retryInput}
            onChange={(e) => setRetryInput(e.target.value)}
            onKeyDown={handleRetryKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Type the correct answer"
          />
          <button
            className="retry-continue-btn"
            onClick={handleRetrySubmit}
            disabled={!retryMatches}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Retry success overlay ── */}
      {phase === 'retry-success' && (
        <div className="feedback-overlay">
          <div className="feedback-emoji">🌟</div>
          <p className="feedback-verdict feedback-correct">You got it!</p>
          <p className="feedback-answer-text">{RETRY_PRAISE[questionIndex % RETRY_PRAISE.length]}</p>
        </div>
      )}
    </div>
  )
}

const RETRY_PRAISE = [
  "That's the spirit — keep going!",
  "Well done for pushing through!",
  "Practice makes perfect. Nice work!",
  "Great effort — that's how you learn!",
  "You're getting stronger every question!",
  "That's the way! Onwards and upwards.",
  "Brilliant — you remembered it this time!",
]

function BackIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <path d="M19 7L11 15L19 23" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
