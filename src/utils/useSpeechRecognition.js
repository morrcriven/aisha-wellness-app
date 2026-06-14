import { useEffect, useRef, useState } from 'react'

// Browser-native voice recognition (no API cost).
// Works in Chrome, Edge, Safari (incl. iOS 14.5+). Firefox: unsupported by default.
const SpeechRecognitionImpl =
  typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null

export const speechRecognitionSupported = !!SpeechRecognitionImpl

/**
 * Hook wrapping the Web Speech API.
 *
 * Usage:
 *   const { supported, listening, error, toggle, start, stop } =
 *     useSpeechRecognition({ onResult: (text) => setValue(text) })
 *
 * The component renders nothing if `supported` is false.
 */
export function useSpeechRecognition({ onResult, lang } = {}) {
  const [listening, setListening] = useState(false)
  const [error,     setError]     = useState('')
  const recognitionRef = useRef(null)
  const onResultRef    = useRef(onResult)

  // Keep latest callback without re-creating the recognition instance
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  useEffect(() => {
    if (!SpeechRecognitionImpl) return
    const r = new SpeechRecognitionImpl()
    r.lang             = lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US')
    r.interimResults   = false
    r.continuous       = false
    r.maxAlternatives  = 1

    r.onresult = (e) => {
      const last = e.results[e.results.length - 1]
      const text = last?.[0]?.transcript ?? ''
      if (text.trim()) onResultRef.current?.(text.trim())
    }
    r.onerror = (e) => {
      // 'no-speech' is a normal "user didn't say anything" — don't surface as a hard error
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(e.error)
      }
      setListening(false)
    }
    r.onend = () => setListening(false)

    recognitionRef.current = r
    return () => {
      try { r.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
  }, [lang])

  function start() {
    if (!recognitionRef.current) return
    setError('')
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch { /* already started */ }
  }
  function stop() {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    setListening(false)
  }
  function toggle() {
    if (listening) stop(); else start()
  }

  return { supported: speechRecognitionSupported, listening, error, start, stop, toggle }
}
