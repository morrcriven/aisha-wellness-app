import { useState, useEffect } from 'react'
import { initBank, selectForSession, recordAttempt, ensureUnseen } from './utils/questionBank'
import HomeScreen from './components/HomeScreen'
import SetupScreen from './components/SetupScreen'
import QuestionScreen from './components/QuestionScreen'
import ResultsScreen from './components/ResultsScreen'
import GraphScreen from './components/GraphScreen'
import SleepScreen from './components/SleepScreen'
import DietScreen from './components/DietScreen'
import DietLogScreen from './components/DietLogScreen'
import DietAnalysisScreen from './components/DietAnalysisScreen'
import DietRecsScreen from './components/DietRecsScreen'
import SpeakerButton from './components/SpeakerButton'

// The bank tops itself up on demand, so this is just a UI sanity cap.
const MAX_QUESTIONS = 30

const FONT_SCALES = [0.85, 1, 1.15, 1.3, 1.5]

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

  // Text size scale — persisted across sessions
  const [fontScale, setFontScale] = useState(() => {
    const stored = parseFloat(localStorage.getItem('aisha_font_scale'))
    return FONT_SCALES.includes(stored) ? stored : 1
  })

  useEffect(() => {
    localStorage.setItem('aisha_font_scale', String(fontScale))
  }, [fontScale])

  function handleFontScaleStep(delta) {
    const i = FONT_SCALES.indexOf(fontScale)
    const next = Math.min(FONT_SCALES.length - 1, Math.max(0, i + delta))
    setFontScale(FONT_SCALES[next])
  }
  const canShrinkText = FONT_SCALES.indexOf(fontScale) > 0
  const canGrowText   = FONT_SCALES.indexOf(fontScale) < FONT_SCALES.length - 1

  // Question bank — initialised on mount, persisted in IndexedDB
  const [bankReady,   setBankReady]   = useState(false)
  const [bankError,   setBankError]   = useState('')
  const [bankLoading, setBankLoading] = useState(false) // true while topping up

  useEffect(() => {
    initBank()
      .then(() => setBankReady(true))
      .catch(e => {
        console.error(e)
        setBankError('Could not load the question bank.')
      })
  }, [])

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

  // Diet logs: { id, date, timestamp, description, mealLabel, macros, mindAligned, mindNote }[]
  const [dietLogs, setDietLogs] = useState(() =>
    loadJSON('aisha_diet_logs', [])
  )

  // Ephemeral diet flow — never persisted
  const [pendingMealImage, setPendingMealImage] = useState(null)
  const [pendingMealDesc,  setPendingMealDesc]  = useState('')

  function handleDietLogsChange(newLogs) {
    setDietLogs(newLogs)
    saveJSON('aisha_diet_logs', newLogs)
  }

  function handleAnalyseMeal(imageDataUrl, description) {
    setPendingMealImage(imageDataUrl)
    setPendingMealDesc(description)
    setScreen('diet-analysis')
  }

  function handleSaveMeal(analysisResult) {
    const log = {
      id:          Date.now().toString(),
      date:        new Date().toISOString().slice(0, 10),
      timestamp:   new Date().toISOString(),
      description: pendingMealDesc,
      mealLabel:   analysisResult.mealLabel,
      macros:      analysisResult.macros,
      mindAligned: analysisResult.mindAligned,
      mindNote:    analysisResult.mindNote,
    }
    handleDietLogsChange([...dietLogs, log])
    setPendingMealImage(null)
    setPendingMealDesc('')
    setScreen('diet')
  }

  function handleDiscardMeal() {
    setPendingMealImage(null)
    setPendingMealDesc('')
    setScreen('diet-log')
  }

  // In-game state
  const [gameQuestions, setGameQuestions] = useState([])
  const [repeatIds, setRepeatIds]         = useState(new Set())
  const [currentIndex, setCurrentIndex]   = useState(0)
  const [answers, setAnswers]             = useState([]) // boolean[]

  function handleSelectFeature(feat) {
    if (feat === 'memory') setScreen('setup')
    else if (feat === 'sleep') setScreen('sleep')
    else if (feat === 'diet') setScreen('diet')
    else setScreen('coming-soon-' + feat)
  }

  async function handleStartGame(count) {
    const clamped = Math.min(count, MAX_QUESTIONS)
    setBankLoading(true)
    setBankError('')
    try {
      // 80% of the session is meant to be unseen — and keep a 25-question buffer
      // so the bank always has fresh material ready for next time.
      const neededUnseen = Math.max(Math.ceil(clamped * 0.8), 25)
      const topUp = await ensureUnseen(neededUnseen)
      if (!topUp.ok) {
        // Generation failed (offline / no API key). We continue with what we have;
        // selectForSession will overflow into the correct/wrong pools.
        console.warn('Question top-up failed:', topUp.error)
      } else if (topUp.generated > 0) {
        console.log(`Question bank topped up with ${topUp.generated} new questions.`)
      }
      const { questions: selected, repeatIds: rids } = selectForSession(clamped)
      if (selected.length === 0) {
        setBankError("Couldn't load any questions. Check your connection and try again.")
        return
      }
      setGameQuestions(selected)
      setRepeatIds(rids)
      setCurrentIndex(0)
      setAnswers([])
      setScreen('game')
    } finally {
      setBankLoading(false)
    }
  }

  function handleAnswer(isCorrect) {
    // Record the attempt against the bank immediately so progress survives a refresh mid-game.
    const currentQ = gameQuestions[currentIndex]
    if (currentQ) recordAttempt(currentQ.id, isCorrect)

    const newAnswers = [...answers, isCorrect]
    setAnswers(newAnswers)

    if (currentIndex + 1 >= gameQuestions.length) {
      // ── Game complete ──────────────────────────────────────
      const rawScore  = newAnswers.filter(Boolean).length
      const rawTotal  = gameQuestions.length

      // Memory score: how well did they do on revisited questions?
      const repeatResults = gameQuestions
        .map((q, i) => ({ isRepeat: repeatIds.has(q.id), correct: newAnswers[i] }))
        .filter((r) => r.isRepeat)
      const memoryScore = repeatResults.filter((r) => r.correct).length
      const memoryTotal = repeatResults.length

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
    <div className="app-shell" style={{ '--font-scale': fontScale }}>
      {/* Persistent top-right toolbar: speaker on every screen + text-size on home */}
      <div className="app-toolbar">
        {screen === 'home' && (
          <div className="text-size-controls" role="group" aria-label="Adjust text size">
            <button
              type="button"
              className="text-size-btn text-size-btn--small"
              onClick={() => handleFontScaleStep(-1)}
              disabled={!canShrinkText}
              aria-label="Decrease text size"
            >
              A
            </button>
            <button
              type="button"
              className="text-size-btn text-size-btn--large"
              onClick={() => handleFontScaleStep(1)}
              disabled={!canGrowText}
              aria-label="Increase text size"
            >
              A
            </button>
          </div>
        )}
        <SpeakerButton />
      </div>

      {screen === 'home' && (
        <HomeScreen
          onSelect={handleSelectFeature}
          sessions={sessionHistory}
          sleepLogs={sleepLogs}
          dietLogs={dietLogs}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen
          maxQuestions={MAX_QUESTIONS}
          bankReady={bankReady}
          bankLoading={bankLoading}
          bankError={bankError}
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

      {screen === 'diet' && (
        <DietScreen
          logs={dietLogs}
          onLogMeal={() => setScreen('diet-log')}
          onSeeRecs={() => setScreen('diet-recs')}
          onHome={() => setScreen('home')}
        />
      )}

      {screen === 'diet-log' && (
        <DietLogScreen
          onAnalyse={handleAnalyseMeal}
          onBack={() => setScreen('diet')}
        />
      )}

      {screen === 'diet-analysis' && (
        <DietAnalysisScreen
          imageDataUrl={pendingMealImage}
          description={pendingMealDesc}
          onSave={handleSaveMeal}
          onDiscard={handleDiscardMeal}
        />
      )}

      {screen === 'diet-recs' && (
        <DietRecsScreen
          logs={dietLogs}
          onBack={() => setScreen('diet')}
          onHome={() => setScreen('home')}
        />
      )}
    </div>
  )
}

