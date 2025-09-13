import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadResults, clearSession } from '../game/storage'

export function Results() {
  const navigate = useNavigate()
  const results = useMemo(() => loadResults(), [])
  const winnings = results?.winnings ?? 0
  const level = results?.level ?? 1
  const lastSafeLevel = results?.lastSafeLevel ?? 0

  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(winnings)

  return (
    <main className="min-h-screen p-6 grid place-items-center">
      <section className="space-y-4 text-center" aria-labelledby="results-title">
        <h1 id="results-title" className="text-3xl font-bold">Results</h1>
  <p className="text-2xl font-extrabold"><span className="nm-gradient-text">Final Winnings: {formatted}</span></p>
        <button
          onClick={() => { clearSession(); navigate('/') }}
          className="inline-block rounded nm-gradient-bg px-6 py-3 font-semibold text-slate-900 hover:brightness-105"
          aria-label="Play again"
        >
          Play Again
        </button>
      </section>
    </main>
  )
}
