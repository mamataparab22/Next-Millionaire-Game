const RESULTS_KEY = 'nmg/results'
const SESSION_KEY = 'nmg/session/v1'

export type ResultsPayload = {
  winnings: number
  level: number
  lastSafeLevel: number
}

export function saveResults(data: ResultsPayload): void {
  try {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(data))
  } catch {}
}

export function loadResults(): ResultsPayload | null {
  try {
    const raw = sessionStorage.getItem(RESULTS_KEY)
    return raw ? (JSON.parse(raw) as ResultsPayload) : null
  } catch {
    return null
  }
}

// Session persistence (full game snapshot)
export type SessionSnapshot = {
  version: 1
  state: any
  savedAt: number
}

export function saveSession(state: any): void {
  try {
    const snapshot: SessionSnapshot = { version: 1, state, savedAt: Date.now() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot))
  } catch {}
}

export function loadSession(): SessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionSnapshot
    if (parsed?.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {}
}