import { useMemo } from 'react'
import { loadResults } from '../game/storage'

export function Results() {
  const results = useMemo(() => loadResults(), [])
  const winnings = results?.winnings ?? 0
  const level = results?.level ?? 1
  const lastSafeLevel = results?.lastSafeLevel ?? 0

  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(winnings)

  return (
    <main className="min-h-screen p-6 grid place-items-center">
      <section className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">Results</h1>
        <p className="text-slate-300">You finished at level {level}. Your guaranteed checkpoint was level {lastSafeLevel}.</p>
        <p className="text-2xl font-extrabold text-yellow-400">Final Winnings: {formatted}</p>
        <a href="/play" className="inline-block rounded bg-indigo-500 px-6 py-3 font-semibold hover:bg-indigo-400">Play Again</a>
      </section>
    </main>
  )
}
