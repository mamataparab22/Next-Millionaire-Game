const KEY = 'nmg/results'

export type ResultsPayload = {
  winnings: number
  level: number
  lastSafeLevel: number
}

export function saveResults(data: ResultsPayload): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data))
  } catch {}
}

export function loadResults(): ResultsPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ResultsPayload) : null
  } catch {
    return null
  }
}