/**
 * Cloudflare Worker — API proxy for the Aisha wellness app.
 *
 * Routes:
 *   POST /v1/chat/completions  → OpenAI (chat, vision, question generation)
 *   POST /tts                  → Baseten Orpheus TTS, returns audio/wav
 *
 * All credentials are stored as Worker secrets so they're never in the
 * browser bundle or the GitHub repo.
 */

const ALLOWED_ORIGINS = [
  'https://morrcriven.github.io',
  'http://localhost:5173',  // vite dev
  'http://localhost:4173',  // vite preview
]

// Hard cap on TTS input to protect the OpenAI/Baseten bill. ~1500 chars is
// roughly 30 seconds of speech, ~3 cents on Baseten at fp8.
const TTS_MAX_CHARS = 1500

export default {
  async fetch(request, env) {
    const url    = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''

    const corsHeaders = {
      'Access-Control-Allow-Origin':  allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary':                          'Origin',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }
    if (!allowOrigin) {
      return jsonError(403, 'Origin not allowed', corsHeaders)
    }
    if (request.method !== 'POST') {
      return jsonError(405, 'Method not allowed', corsHeaders)
    }

    if (url.pathname === '/v1/chat/completions') {
      return handleOpenAI(request, env, corsHeaders)
    }
    if (url.pathname === '/tts') {
      return handleTTS(request, env, corsHeaders)
    }
    return jsonError(404, 'Endpoint not allowed', corsHeaders)
  },
}

// ── OpenAI passthrough ──────────────────────────────────────────────────
async function handleOpenAI(request, env, corsHeaders) {
  if (!env.OPENAI_API_KEY) {
    return jsonError(500, 'Server misconfigured: OPENAI_API_KEY secret is missing', corsHeaders)
  }
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: await request.text(),
  })
  const body = await upstream.text()
  return new Response(body, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
    },
  })
}

// ── TTS: Baseten Orpheus → WAV ──────────────────────────────────────────
async function handleTTS(request, env, corsHeaders) {
  if (!env.BASETEN_API_KEY || !env.BASETEN_MODEL_URL) {
    return jsonError(
      500,
      'TTS not configured: BASETEN_API_KEY or BASETEN_MODEL_URL secret is missing',
      corsHeaders,
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'Invalid JSON body', corsHeaders)
  }

  const text = String(body.text || '').trim().slice(0, TTS_MAX_CHARS)
  if (!text) return jsonError(400, 'Empty text', corsHeaders)
  // Voices for the finetune-prod model: tara, leah, jess, leo, dan, mia, zac, zoe
  const voice = String(body.voice || 'tara')

  const upstream = await fetch(env.BASETEN_MODEL_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Api-Key ${env.BASETEN_API_KEY}`,
    },
    body: JSON.stringify({
      prompt:             text,
      voice,
      max_tokens:         2000,
      repetition_penalty: 1.1,
    }),
  })

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '')
    return jsonError(upstream.status, `Baseten error: ${errText.slice(0, 300)}`, corsHeaders)
  }

  // Orpheus on Baseten returns raw 16-bit PCM at 24kHz mono.
  // Wrap it with a 44-byte WAV header so browsers can play it directly.
  const pcm = new Uint8Array(await upstream.arrayBuffer())
  const wav = wrapPcmAsWav(pcm, { sampleRate: 24000, channels: 1, bitsPerSample: 16 })

  return new Response(wav, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type':  'audio/wav',
      'Cache-Control': 'no-store',
    },
  })
}

function wrapPcmAsWav(pcm, { sampleRate, channels, bitsPerSample }) {
  const byteRate   = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const header = new ArrayBuffer(44)
  const view   = new DataView(header)
  // RIFF chunk descriptor
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + pcm.length, true)
  writeAscii(view, 8, 'WAVE')
  // "fmt " sub-chunk
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)           // PCM header size
  view.setUint16(20, 1, true)            // format = PCM
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  // "data" sub-chunk
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcm.length, true)

  const out = new Uint8Array(44 + pcm.length)
  out.set(new Uint8Array(header), 0)
  out.set(pcm, 44)
  return out
}

function writeAscii(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

function jsonError(status, message, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}
