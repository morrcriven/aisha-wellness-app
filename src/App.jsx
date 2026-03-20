import { useState } from 'react'
import { questions, selectQuestionsForSession, updateQuestionHistory } from './data/questions'
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
          dietLogs={dietLogs}
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

