import { useEffect, useRef, useState } from 'react'

// Two-tier text-to-speech:
//  1. If a proxy URL is configured (prod build), call /tts on the Cloudflare
//     Worker, which forwards to Orpheus on Baseten and returns a WAV.
//  2. Otherwise (local dev, or proxy unreachable), fall back to the
//     browser's built-in SpeechSynthesis.
const PROXY_URL       = import.meta.env.VITE_OPENAI_PROXY_URL
const synthSupported  = typeof window !== 'undefined' && 'speechSynthesis' in window

function getCurrentPageText() {
  const overlay = document.querySelector('.feedback-overlay')
  const target  = overlay || document.querySelector('.screen')
  if (!target) return ''
  return target.innerText.replace(/\s+/g, ' ').trim()
}

export default function SpeakerButton() {
  // 'idle' | 'loading' (waiting on Orpheus) | 'speaking' (audio playing)
  const [state, setState] = useState('idle')
  const audioRef = useRef(null)
  const urlRef   = useRef(null)

  useEffect(() => {
    return () => stopEverything()
  }, [])

  function stopEverything() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    if (synthSupported) window.speechSynthesis.cancel()
  }

  function fallbackToBrowser(text) {
    if (!synthSupported) {
      setState('idle')
      return
    }
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang  = (typeof navigator !== 'undefined' && navigator.language) || 'en-US'
    u.rate  = 1.0
    u.pitch = 1.0
    u.onend   = () => setState('idle')
    u.onerror = () => setState('idle')
    synth.speak(u)
    setState('speaking')
  }

  async function start() {
    const text = getCurrentPageText()
    if (!text) return

    // Try the Worker /tts route (Orpheus via Baseten) first.
    if (PROXY_URL) {
      setState('loading')
      try {
        const res = await fetch(`${PROXY_URL.replace(/\/$/, '')}/tts`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ text }),
        })
        if (!res.ok) {
          console.warn('TTS proxy returned', res.status, '— falling back to browser speech')
          fallbackToBrowser(text)
          return
        }
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        urlRef.current = url
        const audio = new Audio(url)
        audio.onended = () => {
          URL.revokeObjectURL(url)
          urlRef.current = null
          audioRef.current = null
          setState('idle')
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          urlRef.current = null
          audioRef.current = null
          setState('idle')
        }
        audioRef.current = audio
        setState('speaking')
        await audio.play()
        return
      } catch (e) {
        console.warn('TTS proxy failed:', e, '— falling back to browser speech')
        fallbackToBrowser(text)
        return
      }
    }

    // No proxy configured (e.g. local dev): use SpeechSynthesis directly.
    setState('speaking')
    fallbackToBrowser(text)
  }

  function handleClick() {
    if (state === 'idle') {
      start()
    } else {
      stopEverything()
      setState('idle')
    }
  }

  // Nothing we can do if neither path is available.
  if (!PROXY_URL && !synthSupported) return null

  const active = state !== 'idle'
  const label  = state === 'loading'  ? 'Generating speech…'
              : state === 'speaking' ? 'Stop reading'
              :                        'Read page aloud'

  return (
    <button
      type="button"
      className={`speaker-btn${active ? ' speaker-btn--speaking' : ''}`}
      onClick={handleClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
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
