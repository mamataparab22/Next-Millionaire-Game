import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const FALLBACK_CATEGORIES = [
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
  const [selected, setSelected] = useState<string[]>(() => {
    const raw = sessionStorage.getItem('nm.categories')
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
  })
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)
  const [loading, setLoading] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)
  const canPlay = useMemo(() => selected.length > 0, [selected])

  const toggle = (c: string) => {
    setSelected((prev) => {
      const has = prev.includes(c)
      const next = has ? prev.filter((x) => x !== c) : [...prev, c]
      sessionStorage.setItem('nm.categories', next.join(','))
      return next
    })
  }

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE as string | undefined
    if (!base) {
      setUsedFallback(true)
      return
    }
    setLoading(true)
    const controller = new AbortController()
    fetch(`${base}/categories`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('bad')
        const data = await r.json()
        if (!Array.isArray(data?.categories) || data.categories.length === 0) throw new Error('none')
        setCategories(data.categories)
        setUsedFallback(false)
      })
      .catch(() => {
        setCategories(FALLBACK_CATEGORIES)
        setUsedFallback(true)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  return (
    <main className="min-h-screen p-6 grid place-items-center">
      <section className="w-full max-w-3xl space-y-6 text-center" aria-labelledby="home-title">
  <h1 id="home-title" className="text-4xl font-extrabold nm-gradient-text">Next Millionaire</h1>
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
            onClick={() => navigate('/play')}
            className="inline-block rounded nm-gradient-bg px-6 py-3 font-semibold text-slate-900 hover:brightness-105 disabled:opacity-50"
            disabled={!canPlay}
            aria-disabled={!canPlay}
            aria-label="Start playing"
          >
            Start Playing
          </button>
        </div>
      </section>
    </main>
  )
}
