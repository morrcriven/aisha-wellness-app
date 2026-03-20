/**
 * OpenAI API helper for Aisha chat.
 *
 * Uses the Chat Completions API (gpt-4o-mini).
 * Returns either:
 *   { type: 'route', route: 'memory' | 'sleep' | 'diet' }
 *   { type: 'text',  content: string, sources: Source[] }
 *   { type: 'error', message: string }
 *
 * Sources are guaranteed-working search-page links generated from the query,
 * supplemented by any [link](url) pairs the model includes in its response.
 */

const SYSTEM_PROMPT = `You are Aisha, a friendly and knowledgeable health & wellness AI assistant built into a mobile app.

The app has three features — detect the user's intent and respond accordingly:
• Memory Game — cognitive brain-training quizzes
• Sleep Track   — sleep pattern monitoring
• Diet           — nutrition and meal planning

INTENT ROUTING — if the user clearly wants one of these features, respond with ONLY valid JSON, nothing else:
  Memory game intent → {"route":"memory"}
  Sleep tracking intent → {"route":"sleep"}
  Diet/nutrition intent → {"route":"diet"}

For all other messages — respond naturally in 2–4 concise sentences.
• Be warm, supportive, and evidence-based.
• For health questions, mention a reputable source by name (e.g. NHS, Mayo Clinic, WebMD, Healthline).
  You may write a markdown link like [NHS](https://www.nhs.uk) if you are confident the URL is correct.
• End any health advice with: "Always consult a healthcare professional for personalised advice."
• Keep responses short — this is a mobile app.`

/** Parse [text](url) markdown links out of a string, return { text, links[] } */
function extractInlineLinks(content) {
  const links = []
  const cleaned = content.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) => {
    links.push({ label, url })
    return label // replace with plain label in text
  })
  return { text: cleaned, links }
}

/** Generate search-page URLs that are guaranteed to work */
function searchLinks(query) {
  const q = encodeURIComponent(query)
  return [
    { label: 'NHS',        url: `https://www.nhs.uk/search/results?q=${q}` },
    { label: 'Mayo Clinic', url: `https://www.mayoclinic.org/search/search-results?q=${q}` },
    { label: 'Healthline', url: `https://www.healthline.com/search?q1=${q}` },
  ]
}

const DIET_ANALYSIS_PROMPT = `You are a nutrition AI. Analyse the meal from the image and/or description provided.
Return ONLY valid JSON — no markdown, no prose — matching this exact schema:
{
  "mealLabel":   string,
  "highlight":   string,
  "mindAligned": boolean,
  "mindNote":    string,
  "macros": {
    "fruitsVeg":  number,
    "protein":    number,
    "fibreCarbs": number,
    "fats":       number
  }
}

Rules:
- mealLabel: short name e.g. "Grilled salmon with salad"
- highlight: what the meal is highest in, e.g. "high in protein and omega-3"
- mindAligned: true if the meal fits MIND diet principles (vegetables, berries, fish, poultry, nuts, olive oil, whole grains; low in red meat, butter, pastries, fried food)
- mindNote: one sentence about MIND diet alignment or gap
- macros: estimated percentage of plate for each food group, ALL FOUR must sum to exactly 100
  - fruitsVeg: fruits, vegetables, leafy greens, berries
  - protein: fish, seafood, poultry, eggs, legumes, meat
  - fibreCarbs: whole grains, bread, rice, pasta, lentils, potatoes
  - fats: olive oil, nuts, avocado, dairy, butter, sauces
Be reasonable. If the image is unclear, rely on the description.`

export async function analyseMealImage(imageDataUrl, description) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return { ok: false, error: 'No API key set. Add your OpenAI key to .env.local.' }
  }

  const userText = description?.trim()
    ? `User description: ${description.trim()}`
    : 'Please analyse this meal from the image.'

  const content = []
  if (imageDataUrl) {
    content.push({ type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } })
  }
  content.push({ type: 'text', text: DIET_ANALYSIS_PROMPT + '\n\n' + userText })

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content }],
        max_tokens: 350,
        temperature: 0.3,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.error?.message || `API error ${res.status}` }
    }
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    // Normalise macros to sum to 100
    const m = parsed.macros
    const total = m.fruitsVeg + m.protein + m.fibreCarbs + m.fats
    if (total > 0) {
      parsed.macros = {
        fruitsVeg:  Math.round((m.fruitsVeg  / total) * 100),
        protein:    Math.round((m.protein    / total) * 100),
        fibreCarbs: Math.round((m.fibreCarbs / total) * 100),
        fats:       Math.round((m.fats       / total) * 100),
      }
    }
    return { ok: true, result: parsed }
  } catch {
    return { ok: false, error: 'Failed to analyse meal. Please try again.' }
  }
}

export async function chatWithAisha(userMessage) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return { type: 'error', message: 'No API key set. Add your OpenAI key to .env.local.' }
  }

  let data
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = err.error?.message || `API error ${res.status}`
      return { type: 'error', message: msg }
    }

    data = await res.json()
  } catch {
    return { type: 'error', message: 'Network error — please check your connection.' }
  }

  const raw = data.choices?.[0]?.message?.content?.trim() ?? ''

  // Check for routing JSON
  try {
    const parsed = JSON.parse(raw)
    if (parsed.route) return { type: 'route', route: parsed.route }
  } catch { /* not JSON */ }

  // Extract any inline links the model wrote, then build source list
  const { text, links: inlineLinks } = extractInlineLinks(raw)

  // Only show search links for health-sounding queries (heuristic)
  const isHealthQuery = /\b(health|pain|symptom|headache|diet|sleep|tired|fatigue|stress|anxiety|memory|brain|heart|blood|weight|fever|cough|doctor|medicine|vitamin)\b/i.test(userMessage)
  const extraLinks = isHealthQuery ? searchLinks(userMessage) : []

  // Merge: inline model links first, then search links (dedupe by url)
  const seen = new Set(inlineLinks.map((l) => l.url))
  const sources = [
    ...inlineLinks,
    ...extraLinks.filter((l) => !seen.has(l.url)),
  ]

  return { type: 'text', content: text, sources }
}
