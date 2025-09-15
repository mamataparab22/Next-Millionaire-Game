import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession, saveSession } from '../game/storage'
import { initialState } from '../game/reducer'
import { LoadingQuestions } from '../components/LoadingQuestions'
import { get_direct_questions } from '../hooks/useLlmDirect'

const CATEGORIES = [
  'General Knowledge',
  'Science',
  'Geography',
  'Movies',
  'Sports',
  'History',
  'Music',
  'Technology',
  'Physics',
  'Literature',
  'Mathematics',
  'Chemistry',
  'World History',
]

export function Home() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>(CATEGORIES)
  const [loading, setLoading] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const canPlay = useMemo(() => selected.length > 0, [selected])

  const toggle = (c: string) => {
    setSelected((prev) => {
      const has = prev.includes(c)
      const next = has ? prev.filter((x) => x !== c) : [...prev, c]
      return next
    })
  }

  return (
    <main
      className="relative min-h-screen p-6 grid place-items-center bg-center bg-cover"
      style={{ backgroundImage: "url('/millionaire-hero.jpg')" }}
      aria-busy={starting || undefined}
    >
      {/* Dark overlay to improve text contrast over the background image */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-black/60" />
      <section className="relative z-10 w-full max-w-3xl space-y-6 text-center" aria-labelledby="home-title">
        <p className="text-slate-300 max-w-prose mx-auto">
          Pick one or more categories and begin your journey to $1,000,000.
        </p>
        {loading && (
          <div className="rounded border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">Loading categories...</div>
        )}
        {usedFallback && !loading && (
          <div className="rounded border border-amber-700 bg-amber-900/40 px-3 py-2 text-xs text-amber-200 text-left">
            Using fallback categories (API unavailable)
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-left" role="list">
          {categories.map((c) => {
            const active = selected.includes(c)
            return (
              <button
                key={c}
                onClick={() => toggle(c)}
                className={`rounded border px-3 py-2 text-sm ${active ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}
                role="listitem"
                aria-pressed={active}
                aria-label={`${active ? 'Deselect' : 'Select'} category ${c}`}
              >
                {c}
              </button>
            )
          })}
        </div>
  <div className="pt-2">
          <button
            onClick={async () => {
              if (starting || !canPlay) return
              setStarting(true)
              setStartError(null)
              clearSession()

              const proceed = (qs: any[]) => {
                const snapshotState = {
                  ...initialState,
                  questions: qs,
                  remainingTime: initialState.remainingTime,
                  seenQuestionIds: qs[0] ? [qs[0].id] : [],
                }
                saveSession(snapshotState)
                navigate('/play')
              }

              try {
                const qs = await get_direct_questions(selected)
                proceed(qs)
              } catch (e: any) {
                setStartError(e?.message || 'Failed to start game.')
                setStarting(false)
              }
            }}
            className="inline-block rounded nm-gradient-bg px-6 py-3 font-semibold text-slate-900 hover:brightness-105 disabled:opacity-50"
            disabled={!canPlay || starting}
            aria-disabled={!canPlay || starting}
            aria-label={starting ? 'Starting…' : 'Start'}
          >
            {starting ? 'Starting…' : 'Start'}
          </button>
        </div>
      </section>
      {(starting || startError) && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 backdrop-blur-sm">
          {!startError ? (
            <div className="flex flex-col items-center gap-4" role="status" aria-live="polite" aria-label="Starting">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-slate-700 border-t-amber-400 animate-spin" aria-hidden="true" />
                <div className="pointer-events-none absolute -inset-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 blur opacity-20" aria-hidden="true" />
              </div>
              <p className="text-slate-200 font-semibold">
                <span className="nm-gradient-text">Starting…</span>
              </p>
            </div>
          ) : (
            <div className="w-full max-w-lg rounded-lg border-2 border-red-400/70 bg-slate-900/95 p-5 text-slate-200 shadow-xl">
              <h3 className="text-lg font-bold text-red-300">Unable to start</h3>
              <p className="mt-2 text-sm">{startError}</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => { setStartError(null); setStarting(false); }}
                  className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
