import { useEffect, useState } from 'react'

// Browser-native Text-To-Speech. No API cost, no permission prompt.
// Works in Chrome, Edge, Safari (incl. iOS), Firefox.
const synthSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * Get the visible text from the current screen.
 * If a feedback overlay is active (e.g. wrong-answer retry), prefer its text
 * since that's what the user is actually looking at.
 */
function getCurrentPageText() {
  const overlay = document.querySelector('.feedback-overlay')
  const target  = overlay || document.querySelector('.screen')
  if (!target) return ''
  // innerText reflects visibility / line breaks, unlike textContent
  return target.innerText.replace(/\s+/g, ' ').trim()
}

export default function SpeakerButton() {
  const [speaking, setSpeaking] = useState(false)

  // Cancel any in-flight speech on unmount
  useEffect(() => {
    return () => {
      if (synthSupported) window.speechSynthesis.cancel()
    }
  }, [])

  if (!synthSupported) return null

  function handleClick() {
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    const text = getCurrentPageText()
    if (!text) return
    synth.cancel() // ensure nothing is queued
    const u = new SpeechSynthesisUtterance(text)
    u.lang  = (typeof navigator !== 'undefined' && navigator.language) || 'en-US'
    u.rate  = 1.0
    u.pitch = 1.0
    u.onend   = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.speak(u)
    setSpeaking(true)
  }

  return (
    <button
      type="button"
      className={`speaker-btn${speaking ? ' speaker-btn--speaking' : ''}`}
      onClick={handleClick}
      aria-label={speaking ? 'Stop reading' : 'Read page aloud'}
      aria-pressed={speaking}
      title={speaking ? 'Stop reading' : 'Read page aloud'}
    >
      <SpeakerIcon />
    </button>
  )
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 5a9 9 0 0 1 0 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
