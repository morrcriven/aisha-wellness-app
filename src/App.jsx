import { useState } from 'react'
import { questions, selectQuestionsForSession, updateQuestionHistory } from './data/questions'
import HomeScreen from './components/HomeScreen'
import SetupScreen from './components/SetupScreen'
import QuestionScreen from './components/QuestionScreen'
import ResultsScreen from './components/ResultsScreen'
import GraphScreen from './components/GraphScreen'
import SleepScreen from './components/SleepScreen'

const MAX_QUESTIONS = questions.length

// ─── localStorage helpers ──────────────────────────────────
function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

export default function App() {
  const [screen, setScreen] = useState('home')

  // Question history: { [id]: { attempts, correctAttempts, lastSeen, lastCorrect } }
  const [questionHistory, setQuestionHistory] = useState(() =>
    loadJSON('aisha_question_history', {})
  )

  // Session history: { date, score, total, memoryScore, memoryTotal }[]
  const [sessionHistory, setSessionHistory] = useState(() =>
    loadJSON('aisha_sessions', [])
  )

  // Sleep logs: { date: 'YYYY-MM-DD', hours: number }[]
  const [sleepLogs, setSleepLogs] = useState(() =>
    loadJSON('aisha_sleep_logs', [])
  )

  function handleSleepLogsChange(newLogs) {
    setSleepLogs(newLogs)
    saveJSON('aisha_sleep_logs', newLogs)
  }

  // In-game state
  const [gameQuestions, setGameQuestions] = useState([])
  const [repeatIds, setRepeatIds]         = useState(new Set())
  const [currentIndex, setCurrentIndex]   = useState(0)
  const [answers, setAnswers]             = useState([]) // boolean[]

  function handleSelectFeature(feat) {
    if (feat === 'memory') setScreen('setup')
    else if (feat === 'sleep') setScreen('sleep')
    else setScreen('coming-soon-' + feat)
  }

  function handleStartGame(count) {
    const { questions: selected, repeatIds: rids } = selectQuestionsForSession(
      questions,
      questionHistory,
      Math.min(count, MAX_QUESTIONS)
    )
    setGameQuestions(selected)
    setRepeatIds(rids)
    setCurrentIndex(0)
    setAnswers([])
    setScreen('game')
  }

  function handleAnswer(isCorrect) {
    const newAnswers = [...answers, isCorrect]
    setAnswers(newAnswers)

    if (currentIndex + 1 >= gameQuestions.length) {
      // ── Game complete ──────────────────────────────────────
      const rawScore  = newAnswers.filter(Boolean).length
      const rawTotal  = gameQuestions.length

      // Memory score: how well did they do on repeated questions?
      const repeatResults = gameQuestions
        .map((q, i) => ({ isRepeat: repeatIds.has(q.id), correct: newAnswers[i] }))
        .filter((r) => r.isRepeat)
      const memoryScore = repeatResults.filter((r) => r.correct).length
      const memoryTotal = repeatResults.length

      // Update per-question history
      const newHistory = updateQuestionHistory(gameQuestions, newAnswers, questionHistory)
      setQuestionHistory(newHistory)
      saveJSON('aisha_question_history', newHistory)

      // Save session
      const session = {
        date: new Date().toISOString(),
        score:       rawScore,
        total:       rawTotal,
        memoryScore,
        memoryTotal,
      }
      const updatedSessions = [...sessionHistory, session]
      setSessionHistory(updatedSessions)
      saveJSON('aisha_sessions', updatedSessions)

      setScreen('results')
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  const lastSession = sessionHistory[sessionHistory.length - 1]

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <HomeScreen
          onSelect={handleSelectFeature}
          sessions={sessionHistory}
          sleepLogs={sleepLogs}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen
          maxQuestions={MAX_QUESTIONS}
          onBack={() => setScreen('home')}
          onStart={handleStartGame}
        />
      )}

      {screen === 'game' && gameQuestions.length > 0 && (
        <QuestionScreen
          question={gameQuestions[currentIndex]}
          questionIndex={currentIndex}
          total={gameQuestions.length}
          isRepeat={repeatIds.has(gameQuestions[currentIndex]?.id)}
          onAnswer={handleAnswer}
          onBack={() => setScreen('setup')}
        />
      )}

      {screen === 'results' && lastSession && (
        <ResultsScreen
          score={lastSession.score}
          total={lastSession.total}
          memoryScore={lastSession.memoryScore}
          memoryTotal={lastSession.memoryTotal}
          onViewGraph={() => setScreen('graph')}
          onHome={() => {
            setScreen('home')
            setGameQuestions([])
            setAnswers([])
          }}
        />
      )}

      {screen === 'graph' && (
        <GraphScreen
          sessions={sessionHistory}
          onHome={() => setScreen('home')}
        />
      )}

      {screen === 'sleep' && (
        <SleepScreen
          logs={sleepLogs}
          onLogsChange={handleSleepLogsChange}
          onHome={() => setScreen('home')}
        />
      )}

      {screen === 'coming-soon-diet' && (
        <ComingSoon feature="diet" onBack={() => setScreen('home')} />
      )}
    </div>
  )
}

function ComingSoon({ feature, onBack }) {
  const meta = {
    sleep: { icon: '🌙', label: 'Sleep Tracking' },
    diet:  { icon: '🥗', label: 'Diet Planner' },
  }[feature] ?? { icon: '🔧', label: feature }

  return (
    <div className="screen coming-soon-screen">
      <button className="btn-back" onClick={onBack} aria-label="Back">
        <BackIcon />
      </button>
      <div className="coming-soon-icon">{meta.icon}</div>
      <h2 className="coming-soon-heading">{meta.label}</h2>
      <p className="coming-soon-sub">This feature is coming soon. Stay tuned!</p>
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
