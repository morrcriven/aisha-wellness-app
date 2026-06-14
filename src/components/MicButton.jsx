import { useSpeechRecognition } from '../utils/useSpeechRecognition'

/**
 * Round mic button placed beside text inputs.
 * Tapping it starts voice recognition; tapping again stops it.
 * When recognition produces a final transcript, `onResult(text)` is called —
 * the parent decides whether to replace or append to its input value.
 *
 * Renders nothing in browsers that don't support the Web Speech API.
 */
export default function MicButton({ onResult, size = 'md', ariaLabel = 'Voice input' }) {
  const { supported, listening, toggle } = useSpeechRecognition({ onResult })

  if (!supported) return null

  return (
    <button
      type="button"
      className={`mic-btn mic-btn--${size}${listening ? ' mic-btn--listening' : ''}`}
      onClick={toggle}
      aria-label={listening ? 'Stop voice input' : ariaLabel}
      aria-pressed={listening}
      title={listening ? 'Listening… tap to stop' : 'Tap and speak'}
    >
      <MicIcon />
    </button>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18v3M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
