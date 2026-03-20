import { useState, useEffect, useRef } from 'react'
import { checkAnswer } from '../data/questions'

export default function QuestionScreen({ question, questionIndex, total, isRepeat, onAnswer, onBack }) {
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState('input') // 'input' | 'feedback'
  const [lastCorrect, setLastCorrect] = useState(false)
  const inputRef = useRef(null)

  // Reset state when question changes
  useEffect(() => {
    setAnswer('')
    setPhase('input')
    inputRef.current?.focus()
  }, [questionIndex])

  function handleSubmit() {
    if (!answer.trim() || phase === 'feedback') return
    const correct = checkAnswer(answer, question.answer)
    setLastCorrect(correct)
    setPhase('feedback')
    setTimeout(() => {
      onAnswer(correct)
    }, 1600)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  const progress = ((questionIndex) / total) * 100

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
          disabled={phase === 'feedback'}
          aria-label="Answer input"
          autoComplete="off"
          autoCapitalize="off"
        />
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!answer.trim() || phase === 'feedback'}
        >
          Submit
        </button>
      </div>

      <div className="home-indicator" />

      {/* Feedback overlay */}
      {phase === 'feedback' && (
        <div className="feedback-overlay">
          <div className="feedback-emoji">{lastCorrect ? '✅' : '❌'}</div>
          <p className={`feedback-verdict ${lastCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
            {lastCorrect ? 'Correct!' : 'Not quite…'}
          </p>
          {!lastCorrect && (
            <p className="feedback-answer-text">
              The answer was: <strong>{question.answer[0]}</strong>
            </p>
          )}
          <p className="feedback-answer-text" style={{ marginTop: 16, fontSize: 13, opacity: 0.6 }}>
            {questionIndex + 1 < total
              ? `Up next: Question ${questionIndex + 2}`
              : 'Almost done!'}
          </p>
        </div>
      )}
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
