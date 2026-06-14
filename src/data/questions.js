export const questions = [
  {
    id: 1,
    question: 'What is the capital city of Australia?',
    answer: ['canberra'],
    category: 'Recall',
  },
  {
    id: 2,
    question: 'Complete the pattern: 2, 4, 8, 16, ___',
    answer: ['32', 'thirty-two'],
    category: 'Pattern',
  },
  {
    id: 3,
    question: 'How many days are in a leap year?',
    answer: ['366'],
    category: 'Recall',
  },
  {
    id: 4,
    question: 'What colour do you get when you mix red and blue?',
    answer: ['purple', 'violet'],
    category: 'Recall',
  },
  {
    id: 5,
    question: 'What is 9 × 7?',
    answer: ['63', 'sixty-three'],
    category: 'Arithmetic',
  },
  {
    id: 6,
    question: 'How many sides does a hexagon have?',
    answer: ['6', 'six'],
    category: 'Recall',
  },
  {
    id: 7,
    question: 'What letter comes next? A, C, E, G, ___',
    answer: ['i'],
    category: 'Pattern',
  },
  {
    id: 8,
    question: 'What planet is known as the Red Planet?',
    answer: ['mars'],
    category: 'Recall',
  },
  {
    id: 9,
    question: 'What is the square root of 81?',
    answer: ['9', 'nine'],
    category: 'Arithmetic',
  },
  {
    id: 10,
    question: 'How many bones are in the adult human body?',
    answer: ['206'],
    category: 'Recall',
  },
  {
    id: 11,
    question: 'Complete the sequence: 1, 1, 2, 3, 5, 8, ___',
    answer: ['13', 'thirteen'],
    category: 'Pattern',
  },
  {
    id: 12,
    question: 'What is the chemical symbol for water?',
    answer: ['h2o'],
    category: 'Recall',
  },
  {
    id: 13,
    question: 'What is 15 × 4?',
    answer: ['60', 'sixty'],
    category: 'Arithmetic',
  },
  {
    id: 14,
    question: 'Which is the largest ocean on Earth?',
    answer: ['pacific', 'pacific ocean'],
    category: 'Recall',
  },
  {
    id: 15,
    question: 'What letter comes before Y in the alphabet?',
    answer: ['x'],
    category: 'Pattern',
  },
]

// ── Spelling-tolerant answer checking ───────────────────────────────────

function normalise(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, '')   // drop punctuation, keep hyphens & spaces
    .replace(/\s+/g, ' ')
    .trim()
}

// Damerau-Levenshtein distance (treats letter swaps as 1 edit, e.g. "purpel"↔"purple")
function editDistance(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) d[i][0] = i
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j]     + 1,   // deletion
        d[i][j - 1]     + 1,   // insertion
        d[i - 1][j - 1] + cost // substitution
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1) // transposition
      }
    }
  }
  return d[m][n]
}

// How many edits we'll forgive, based on the longer string's length.
// Short answers (≤3 chars) must match exactly — letting "9" pass for "8" would be wrong.
function spellingThreshold(len) {
  if (len <= 3) return 0
  if (len <= 7) return 1
  return 2
}

// ── Number ↔ word equivalence (0-99) ────────────────────────────────────
const ONES = [
  'zero','one','two','three','four','five','six','seven','eight','nine',
  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
  'seventeen','eighteen','nineteen',
]
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']

function numberToWords(n) {
  if (n < 0 || n > 99) return null
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10), o = n % 10
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`
}

// Pre-built lookup so "seven" → "7", "twenty-three"/"twenty three" → "23", etc.
const WORD_TO_NUM = {}
for (let n = 0; n < 100; n++) {
  const w = numberToWords(n)
  if (!w) continue
  WORD_TO_NUM[w] = String(n)
  if (w.includes('-')) {
    WORD_TO_NUM[w.replace('-', ' ')] = String(n)
    WORD_TO_NUM[w.replace('-', '')]  = String(n)
  }
}

// Return all equivalent forms of one accepted answer.
function expandAnswer(answer) {
  const variants = new Set([answer])
  if (/^\d+$/.test(answer)) {
    const word = numberToWords(parseInt(answer, 10))
    if (word) {
      variants.add(word)
      if (word.includes('-')) {
        variants.add(word.replace('-', ' '))
        variants.add(word.replace('-', ''))
      }
    }
  }
  if (answer in WORD_TO_NUM) variants.add(WORD_TO_NUM[answer])
  return [...variants]
}

export function checkAnswer(userAnswer, correctAnswers) {
  const user = normalise(userAnswer)
  if (!user) return false
  for (const raw of correctAnswers) {
    const correct = normalise(raw)
    for (const variant of expandAnswer(correct)) {
      if (variant === user) return true
      const threshold = spellingThreshold(Math.max(variant.length, user.length))
      if (threshold > 0 && editDistance(user, variant) <= threshold) return true
    }
  }
  return false
}

export function getRecommendation(score, total) {
  const pct = (score / total) * 100
  if (pct >= 80)
    return 'Outstanding! Your memory is in excellent shape. Try increasing the number of questions to keep challenging yourself.'
  if (pct >= 60)
    return 'Well done! To boost further, try daily number pattern exercises and word association games.'
  if (pct >= 40)
    return 'Good effort! Focus on getting plenty of sleep — it significantly improves memory consolidation.'
  return 'Every brain can improve with practice! Start with 5 questions daily and build up gradually. Consistency is key.'
}

export function shuffleQuestions(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, arr.length))
}

/**
 * Smart question selection.
 *
 * Priority order:
 *  1. Questions answered WRONG in a previous session  (~40% of slots)
 *  2. Questions answered CORRECTLY before             (~15% of slots, for reinforcement)
 *  3. Questions never seen                            (remaining slots)
 *
 * questionHistory: { [id]: { lastCorrect: bool, attempts: number, ... } }
 *
 * Returns { questions: Question[], repeatIds: Set<number> }
 * repeatIds = IDs of questions that appeared in a previous session
 * (used to compute the memory score).
 */
export function selectQuestionsForSession(allQuestions, questionHistory, count) {
  const rng = () => Math.random() - 0.5

  const wrongBefore   = allQuestions.filter((q) => questionHistory[q.id]?.lastCorrect === false)
  const correctBefore = allQuestions.filter((q) => questionHistory[q.id]?.lastCorrect === true)
  const unseen        = allQuestions.filter((q) => !questionHistory[q.id])

  // How many repeat slots to fill
  const wrongSlots   = Math.min(wrongBefore.length,   Math.ceil(count * 0.40))
  const correctSlots = Math.min(correctBefore.length, Math.ceil(count * 0.15))

  const wrongPick   = [...wrongBefore].sort(rng).slice(0, wrongSlots)
  const correctPick = [...correctBefore].sort(rng).slice(0, correctSlots)

  const repeatIds = new Set([
    ...wrongPick.map((q) => q.id),
    ...correctPick.map((q) => q.id),
  ])

  // Fill remaining slots from unseen, then fall back to more correct-before
  const needed = count - wrongPick.length - correctPick.length
  const freshPool = [
    ...[...unseen].sort(rng),
    ...[...correctBefore].sort(rng).filter((q) => !repeatIds.has(q.id)),
  ]
  const freshPick = freshPool.slice(0, needed)

  const selected = [...wrongPick, ...correctPick, ...freshPick].slice(0, count)

  // If still short (very few questions available), backfill
  if (selected.length < count) {
    const have = new Set(selected.map((q) => q.id))
    const backfill = allQuestions.filter((q) => !have.has(q.id)).sort(rng)
    selected.push(...backfill.slice(0, count - selected.length))
  }

  return { questions: selected.sort(rng), repeatIds }
}

/**
 * Update the per-question history map after a session.
 * Returns a new history object (immutable update).
 */
export function updateQuestionHistory(gameQuestions, answers, prevHistory) {
  const updated = { ...prevHistory }
  gameQuestions.forEach((q, i) => {
    const prev = updated[q.id] ?? { attempts: 0, correctAttempts: 0 }
    updated[q.id] = {
      attempts:        prev.attempts + 1,
      correctAttempts: prev.correctAttempts + (answers[i] ? 1 : 0),
      lastSeen:        new Date().toISOString(),
      lastCorrect:     answers[i],
    }
  })
  return updated
}
