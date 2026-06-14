/**
 * Infinite question bank, backed by SQLite (sql.js / WASM).
 *
 * Schema:
 *   questions(id, question UNIQUE, answer JSON, category, source, attempts, last_correct, last_seen, created_at)
 *
 * last_correct: NULL = unseen, 0 = answered wrong, 1 = answered correct
 *
 * The DB blob is persisted to IndexedDB after every mutation (debounced).
 */
import initSqlJs from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { idbGet, idbSet } from './idb'
import { questions as SEED } from '../data/questions'
import { generateQuestions } from './openai'

const DB_KEY = 'aisha_question_bank_v1'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS questions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    question     TEXT    NOT NULL UNIQUE,
    answer       TEXT    NOT NULL,
    category     TEXT,
    source       TEXT    NOT NULL DEFAULT 'llm',
    attempts     INTEGER NOT NULL DEFAULT 0,
    last_correct INTEGER,
    last_seen    TEXT,
    created_at   TEXT    DEFAULT (datetime('now'))
  );
`

let db = null
let initPromise = null
let persistTimer = null

async function _init() {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })
  const stored = await idbGet(DB_KEY)
  const instance = stored
    ? new SQL.Database(new Uint8Array(stored))
    : new SQL.Database()
  instance.run(SCHEMA)
  db = instance
  _seedIfEmpty()
  _schedulePersist()
}

export function initBank() {
  if (db) return Promise.resolve()
  if (!initPromise) initPromise = _init()
  return initPromise
}

function _schedulePersist() {
  if (persistTimer) return
  persistTimer = setTimeout(async () => {
    persistTimer = null
    if (!db) return
    try {
      const data = db.export()
      await idbSet(DB_KEY, data)
    } catch (e) {
      console.error('Failed to persist question bank:', e)
    }
  }, 250)
}

function _seedIfEmpty() {
  const r = db.exec('SELECT COUNT(*) FROM questions')
  const count = r[0]?.values?.[0]?.[0] ?? 0
  if (count > 0) return
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO questions (question, answer, category, source) VALUES (?, ?, ?, ?)'
  )
  for (const q of SEED) {
    stmt.run([q.question, JSON.stringify(q.answer), q.category ?? 'Recall', 'seed'])
  }
  stmt.free()
}

// ── Internal query helpers ───────────────────────────────────
function _all(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function _rowsToQuestions(rows) {
  return rows.map(r => ({
    id:       r.id,
    question: r.question,
    answer:   safeParseAnswers(r.answer),
    category: r.category,
  }))
}

function safeParseAnswers(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(a => String(a).toLowerCase())
  } catch {/* fall through */}
  return [String(raw).toLowerCase()]
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Public API ───────────────────────────────────────────────

export function countUnseen() {
  if (!db) return 0
  const r = db.exec('SELECT COUNT(*) FROM questions WHERE last_correct IS NULL')
  return r[0]?.values?.[0]?.[0] ?? 0
}

export function totalQuestions() {
  if (!db) return 0
  const r = db.exec('SELECT COUNT(*) FROM questions')
  return r[0]?.values?.[0]?.[0] ?? 0
}

/**
 * Pick `count` questions for a session.
 *   15% from previously WRONG
 *    5% from previously CORRECT
 *   80% UNSEEN
 * Falls back gracefully when a pool is short.
 *
 * Returns { questions: Q[], repeatIds: Set<id> }.
 * repeatIds = ids drawn from the wrong/correct pools (used to compute the memory score).
 */
export function selectForSession(count) {
  const wrongRows   = _all('SELECT * FROM questions WHERE last_correct = 0')
  const correctRows = _all('SELECT * FROM questions WHERE last_correct = 1')
  const unseenRows  = _all('SELECT * FROM questions WHERE last_correct IS NULL')

  let wrongSlots   = Math.min(wrongRows.length,   Math.round(count * 0.15))
  let correctSlots = Math.min(correctRows.length, Math.round(count * 0.05))
  let newSlots     = count - wrongSlots - correctSlots

  // If unseen pool is too small, overflow into correct/wrong pools.
  if (unseenRows.length < newSlots) {
    const deficit = newSlots - unseenRows.length
    newSlots = unseenRows.length
    const extraCorrect = Math.min(deficit, correctRows.length - correctSlots)
    correctSlots += extraCorrect
    const stillNeeded = deficit - extraCorrect
    if (stillNeeded > 0) {
      wrongSlots = Math.min(wrongRows.length, wrongSlots + stillNeeded)
    }
  }

  const wrongPick   = shuffle(wrongRows).slice(0, wrongSlots)
  const correctPick = shuffle(correctRows).slice(0, correctSlots)
  const unseenPick  = shuffle(unseenRows).slice(0, newSlots)

  const repeatIds = new Set([...wrongPick, ...correctPick].map(r => r.id))
  const merged    = shuffle([...wrongPick, ...correctPick, ...unseenPick])
  return { questions: _rowsToQuestions(merged), repeatIds }
}

export function recordAttempt(questionId, correct) {
  if (!db) return
  db.run(
    `UPDATE questions
        SET attempts = attempts + 1,
            last_correct = ?,
            last_seen = datetime('now')
      WHERE id = ?`,
    [correct ? 1 : 0, questionId]
  )
  _schedulePersist()
}

/**
 * Make sure the bank has at least `neededUnseen` unseen questions.
 * If not, call OpenAI to generate a fresh batch.
 *
 * Returns { ok: boolean, error?: string, generated?: number }.
 * `ok` is true even if no top-up was needed.
 */
export async function ensureUnseen(neededUnseen) {
  await initBank()
  const have = countUnseen()
  if (have >= neededUnseen) return { ok: true, generated: 0 }

  const want = Math.max(20, neededUnseen - have + 10)
  const recent = _all('SELECT question FROM questions ORDER BY id DESC LIMIT 20')
    .map(r => r.question)

  const gen = await generateQuestions(want, recent)
  if (!gen.ok) return { ok: false, error: gen.error, generated: 0 }

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO questions (question, answer, category, source) VALUES (?, ?, ?, ?)'
  )
  let inserted = 0
  for (const q of gen.questions) {
    const r = stmt.run([
      q.question,
      JSON.stringify(q.answer),
      q.category || 'Recall',
      'llm',
    ])
    // sql.js Statement.run returns void; count attempts instead via changes()
    inserted++
    void r
  }
  stmt.free()
  // Actual insert count (excludes UNIQUE conflicts)
  const changesRow = db.exec('SELECT changes()')
  const actual = changesRow[0]?.values?.[0]?.[0] ?? inserted
  _schedulePersist()
  return { ok: true, generated: actual }
}

/** Reset the entire bank — useful in tests / dev. Not wired to the UI. */
export async function resetBank() {
  await initBank()
  db.run('DROP TABLE IF EXISTS questions')
  db.run(SCHEMA)
  _seedIfEmpty()
  _schedulePersist()
}
