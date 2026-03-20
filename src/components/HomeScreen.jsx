import { useState, useRef, useEffect } from 'react'
import { chatWithAisha } from '../utils/openai'

const FEATURES = [
  { id: 'memory', label: 'Memory\nGame', icon: <BrainIcon /> },
  { id: 'sleep',  label: 'Sleep\nTrack',  icon: <MoonIcon /> },
  { id: 'diet',   label: 'Diet',          icon: <LeafIcon /> },
]

export default function HomeScreen({ onSelect, sessions = [], sleepLogs = [], dietLogs = [] }) {
  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(false)
  const messagesEndRef           = useRef(null)
  const inputRef                 = useRef(null)

  // Scroll to bottom whenever messages or loading change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)

    const result = await chatWithAisha(text)
    setLoading(false)

    if (result.type === 'route') {
      // Brief "navigating…" message then route
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: `Sure! Let me take you to ${result.route === 'memory' ? 'the Memory Game' : result.route === 'sleep' ? 'Sleep Track' : 'Diet'} 🙂`, sources: [] },
      ])
      setTimeout(() => onSelect(result.route), 900)
    } else if (result.type === 'error') {
      setMessages((prev) => [
        ...prev,
        { role: 'error', text: result.message },
      ])
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: result.content, sources: result.sources ?? [] },
      ])
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="screen home-screen">
      {/* Header — shrinks once conversation starts */}
      <h1 className={`home-heading${hasMessages ? ' home-heading--compact' : ''}`}>
        What can I help you with today?
      </h1>
      <div className="home-divider" />

      {/* Feature cards */}
      <div className={`option-grid${hasMessages ? ' option-grid--compact' : ''}`}>
        {FEATURES.map((f) => (
          <button key={f.id} className="option-card" onClick={() => onSelect(f.id)}>
            {f.icon}
            <span style={{ whiteSpace: 'pre-line' }}>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Chat messages */}
      {hasMessages && (
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <ChatMessage key={i} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Summary cards — visible when no chat is active */}
      {!hasMessages && (
        <div className="home-summary">
          <SummaryItem icon={<BrainIconSmall />} text={getMemorySummary(sessions)} />
          <SummaryItem icon={<MoonIconSmall />}  text={getSleepSummary(sleepLogs)} />
          <SummaryItem icon={<LeafIconSmall />}  text={getDietSummary(dietLogs)} muted={dietLogs.length === 0} />
        </div>
      )}

      {hasMessages && <div style={{ flex: 1 }} />}

      {/* Input bar */}
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-text-input"
          type="text"
          placeholder="Type here or tap options."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          aria-label="Chat input"
          autoComplete="off"
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>

      <div className="home-indicator" />
    </div>
  )
}

/* ─── Message bubble ──────────────────────────────────────── */
function ChatMessage({ msg }) {
  if (msg.role === 'error') {
    return (
      <div className="message message-error">
        <div className="message-bubble message-bubble--error">{msg.text}</div>
      </div>
    )
  }

  const isUser = msg.role === 'user'
  return (
    <div className={`message ${isUser ? 'message-user' : 'message-ai'}`}>
      <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--ai'}`}>
        {msg.text}
      </div>
      {!isUser && msg.sources?.length > 0 && (
        <div className="message-sources">
          <span className="sources-label">Learn more:</span>
          {msg.sources.map((s, i) => (
            <a
              key={i}
              className="source-link"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Typing indicator ────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="message message-ai">
      <div className="typing-indicator">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

/* ─── Summary helpers ─────────────────────────────────────── */
function SummaryItem({ icon, text, muted }) {
  return (
    <div className={`summary-item${muted ? ' summary-item--muted' : ''}`}>
      <span className="summary-icon">{icon}</span>
      <p className="summary-text">{text}</p>
    </div>
  )
}

function getMemorySummary(sessions) {
  if (!sessions || sessions.length === 0) {
    return 'Play your first Memory Game to start tracking your progress!'
  }
  const last    = sessions[sessions.length - 1]
  const lastPct = Math.round((last.score / last.total) * 100)
  if (sessions.length === 1) {
    return `You scored ${last.score}/${last.total} (${lastPct}%) on your first session. Keep it up!`
  }
  const prev    = sessions[sessions.length - 2]
  const prevPct = Math.round((prev.score / prev.total) * 100)
  if (lastPct > prevPct) {
    return `Your memory is getting stronger! Latest score: ${last.score}/${last.total} (up from ${prevPct}%).`
  } else if (lastPct === prevPct) {
    return `Consistent performance! You scored ${last.score}/${last.total} in your last session.`
  } else {
    return `Your latest score was ${last.score}/${last.total} (${lastPct}%). A little practice goes a long way!`
  }
}

function getDietSummary(dietLogs) {
  if (!dietLogs || dietLogs.length === 0) {
    return 'Log your diet to get personalised MIND diet recommendations.'
  }
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = dietLogs.filter((l) => l.date === today).length
  if (todayCount > 0) {
    return `You've logged ${todayCount} meal${todayCount > 1 ? 's' : ''} today. Tap Diet to see your breakdown.`
  }
  return 'No meals logged today yet. Tap Diet to log a meal.'
}

function getSleepSummary(sleepLogs) {
  if (!sleepLogs || sleepLogs.length === 0) {
    return "Log your first night's sleep to get personalised recommendations!"
  }
  const last  = sleepLogs[sleepLogs.length - 1]
  const hours = last.hours
  let quality
  if (hours < 6)      quality = 'Try to aim for 7–9 hours for optimal health.'
  else if (hours < 7) quality = 'Getting closer — most adults need 7–9 hours.'
  else if (hours <= 9) quality = "Great — that's within the recommended 7–9 hours!"
  else                quality = 'Consistency with your sleep schedule helps too.'

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const weekLogs = sleepLogs.filter(l => new Date(l.date + 'T12:00:00') >= sevenDaysAgo)
  if (weekLogs.length >= 3) {
    const avg = weekLogs.reduce((s, l) => s + l.hours, 0) / weekLogs.length
    return `Your 7-day average is ${avg.toFixed(1)}h. ${quality}`
  }
  return `Last logged: ${hours}h. ${quality}`
}

/* ─── Icons ───────────────────────────────────────────────── */
function BrainIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M12 6C9.8 6 8 7.8 8 10c0 1.1.4 2.1 1.1 2.8C7.9 13.4 7 14.6 7 16c0 1.8 1 3.4 2.5 4.2C9.2 20.8 9 21.4 9 22c0 2.2 1.8 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 6C22.2 6 24 7.8 24 10c0 1.1-.4 2.1-1.1 2.8 1.2.6 2.1 1.8 2.1 3.2 0 1.8-1 3.4-2.5 4.2.3.6.5 1.2.5 1.8 0 2.2-1.8 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 6h8M13 26h6M16 6v20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="14" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M24 17A10 10 0 1 1 15 8a7 7 0 0 0 9 9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 24C8 24 10 14 20 10C26 7 27 7 27 7C27 7 26 8 24 13C20 23 12 26 8 24Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 24L14 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BrainIconSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M12 6C9.8 6 8 7.8 8 10c0 1.1.4 2.1 1.1 2.8C7.9 13.4 7 14.6 7 16c0 1.8 1 3.4 2.5 4.2C9.2 20.8 9 21.4 9 22c0 2.2 1.8 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 6C22.2 6 24 7.8 24 10c0 1.1-.4 2.1-1.1 2.8 1.2.6 2.1 1.8 2.1 3.2 0 1.8-1 3.4-2.5 4.2.3.6.5 1.2.5 1.8 0 2.2-1.8 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 6h8M13 26h6M16 6v20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="14" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function MoonIconSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M24 17A10 10 0 1 1 15 8a7 7 0 0 0 9 9z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LeafIconSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8 24C8 24 10 14 20 10C26 7 27 7 27 7C27 7 26 8 24 13C20 23 12 26 8 24Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 24L14 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M20 11L4 4L7 11L4 18L20 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 11H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
