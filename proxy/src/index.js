/**
 * Cloudflare Worker — OpenAI proxy for the Aisha wellness app.
 *
 * Why this exists:
 *   The Vite frontend is a static site. Putting the OpenAI API key in the
 *   browser bundle would let anyone with DevTools steal it. This worker holds
 *   the key as a server-side secret and forwards calls to OpenAI on behalf of
 *   the frontend.
 *
 * What it does:
 *   - Accepts POST to /v1/chat/completions (the only endpoint the app uses).
 *   - Checks the request's Origin header against an allow-list.
 *   - Forwards the body to OpenAI, adding the Authorization header from the
 *     `OPENAI_API_KEY` secret.
 *   - Returns the OpenAI response unchanged, with CORS headers.
 *
 * What it does NOT do (yet):
 *   - Rate limiting (Cloudflare Workers are stateless; doing this properly
 *     needs KV or Durable Objects). Pair this with a hard spend cap on the
 *     OpenAI dashboard for v1.
 */

const ALLOWED_ORIGINS = [
  'https://morrcriven.github.io',
  'http://localhost:5173',  // vite dev
  'http://localhost:4173',  // vite preview
]

const ALLOWED_PATHS = new Set([
  '/v1/chat/completions',
])

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

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Reject requests from disallowed origins.
    // This is the main anti-abuse measure: a random `curl` won't carry your
    // Pages origin, so it can't hit the proxy.
    if (!allowOrigin) {
      return jsonError(403, 'Origin not allowed', corsHeaders)
    }

    if (request.method !== 'POST') {
      return jsonError(405, 'Method not allowed', corsHeaders)
    }

    if (!ALLOWED_PATHS.has(url.pathname)) {
      return jsonError(404, 'Endpoint not allowed', corsHeaders)
    }

    if (!env.OPENAI_API_KEY) {
      return jsonError(500, 'Server misconfigured: OPENAI_API_KEY secret is missing', corsHeaders)
    }

    // Forward the request body verbatim to OpenAI.
    const upstreamBody = await request.text()
    const upstream     = await fetch(`https://api.openai.com${url.pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: upstreamBody,
    })

    const respBody = await upstream.text()
    return new Response(respBody, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
      },
    })
  },
}

function jsonError(status, message, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}
