import { useEffect, useMemo, useReducer, useState } from 'react'
import { PrizeLadder } from '../components/PrizeLadder'
import { Lifelines } from '../components/Lifelines'
import { Card } from '../components/Card'
import { LoadingQuestions } from '../components/LoadingQuestions'
import { initialState, reducer, getCurrentQuestion } from '../game/reducer'
import { SAMPLE_QUESTIONS } from '../game/sample'
import { Modal } from '../components/Modal'
import { ConfettiBurst } from '../components/ConfettiBurst'
import { saveResults, saveSession, loadSession, clearSession } from '../game/storage'
import { timeForLevel, prizeForLevel } from '../game/config'
import { useNavigate } from 'react-router-dom'

export function Play() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [showPoll, setShowPoll] = useState(false)
  const [animatePoll, setAnimatePoll] = useState(false)
  const [pulseLevel, setPulseLevel] = useState<number | undefined>(undefined)
  const [loadingQs, setLoadingQs] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)

  useEffect(() => {
    const snapshot = loadSession()
    if (snapshot?.state && Array.isArray(snapshot.state.questions) && snapshot.state.questions.length > 0) {
      dispatch({ type: 'HYDRATE', state: snapshot.state })
      setLoadingQs(false)
      setUsedFallback(false)
      return
    }
    // Try API first; fallback to bundled samples
    const base = import.meta.env.VITE_API_BASE as string | undefined
    const categoriesRaw = sessionStorage.getItem('nm.categories') || ''
    const categories = categoriesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    if (!base) {
      dispatch({ type: 'LOAD_QUESTIONS', questions: SAMPLE_QUESTIONS })
      setUsedFallback(true)
      setLoadingQs(false)
      return
    }
    setLoadingQs(true)
    const controller = new AbortController()
    fetch(`${base}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories, count: 15 }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('bad response')
        const data = await r.json()
        if (!Array.isArray(data?.questions) || data.questions.length === 0) throw new Error('no questions')
        dispatch({ type: 'LOAD_QUESTIONS', questions: data.questions })
        setUsedFallback(false)
      })
      .catch((err: any) => {
        // Ignore AbortError (React 18 StrictMode double-invoke)
        if (err?.name === 'AbortError') return
        dispatch({ type: 'LOAD_QUESTIONS', questions: SAMPLE_QUESTIONS })
        setUsedFallback(true)
      })
      .finally(() => setLoadingQs(false))
    return () => controller.abort()
  }, [])

  // Persist session on changes
  useEffect(() => {
    saveSession(state)
  }, [state])

  // Handle ticking timer
  useEffect(() => {
    if (state.answered || state.gameOver) return
    if (state.remainingTime <= 0) return
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.answered, state.gameOver, state.remainingTime])

  // Fire TIME_UP when it hits zero
  useEffect(() => {
    if (!state.answered && state.remainingTime === 0) {
      dispatch({ type: 'TIME_UP' })
    }
  }, [state.remainingTime, state.answered])

  // Pulse ladder on correct answer
  useEffect(() => {
    if (state.answered && state.correct) {
      setPulseLevel(state.level)
      const t = setTimeout(() => setPulseLevel(undefined), 1200)
      return () => clearTimeout(t)
    }
  }, [state.answered, state.correct, state.level])

  // Navigate to results when game is over
  useEffect(() => {
    if (state.gameOver) {
      saveResults({ winnings: state.winnings, level: state.level, lastSafeLevel: state.lastSafeLevel })
      navigate('/results')
    }
  }, [state.gameOver, state.winnings, state.level, state.lastSafeLevel, navigate])

  const q = getCurrentQuestion(state)
  const choices = q?.choices ?? []
  const totalTime = timeForLevel(state.level)
  const timeFrac = totalTime > 0 ? state.remainingTime / totalTime : 0
  const lowTime = state.remainingTime <= 5
  const formattedWinnings = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(state.winnings), [state.winnings])
  const formattedSafe = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prizeForLevel(state.lastSafeLevel)), [state.lastSafeLevel])

  return (
    <main className="min-h-screen" aria-describedby={state.infoMessage ? 'info-message' : undefined}>
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {pulseLevel && <ConfettiBurst pieces={90} />}
        {loadingQs && (
          <div className="col-span-full">
            <LoadingQuestions />
          </div>
        )}
        {usedFallback && !loadingQs && (
          <div className="col-span-full rounded border border-amber-700 bg-amber-900/40 px-3 py-2 text-xs text-amber-200">
            Using sample questions (API unavailable)
          </div>
        )}

        {/* Game Stage */}
        <section className="flex flex-col gap-4 min-h-[70vh]">
          {state.infoMessage && (
            <div id="info-message" role="status" aria-live="polite" className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
              {state.infoMessage}
            </div>
          )}

          {/* Semi-circle countdown timer outside Card */}
          <div className="flex justify-center pt-2">
            <svg
              width="160"
              height="90"
              viewBox="0 0 160 90"
              role="img"
              aria-label={`Time remaining ${state.remainingTime} of ${totalTime} seconds`}
            >
              <defs>
                <linearGradient id="nm-timer-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>
              {/* Track */}
              <path d="M 20 75 A 60 60 0 0 1 140 75" fill="none" stroke="#1f2937" strokeWidth="10" opacity="0.5" />
              {/* Progress */}
              <path
                d="M 20 75 A 60 60 0 0 1 140 75"
                fill="none"
                stroke="url(#nm-timer-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={((1 - timeFrac) * 100).toString()}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
              {/* Numeric label with pulse */}
              <text
                x="80"
                y="68"
                textAnchor="middle"
                fontSize="24"
                fontWeight="700"
                fill={lowTime ? '#f87171' : '#cbd5e1'}
                stroke="#0f172a"
                strokeWidth="2"
                style={{ paintOrder: 'stroke', animation: lowTime ? 'nm-timer-pulse 0.7s infinite' : undefined }}
                aria-hidden="true"
              >
                {state.remainingTime}
              </text>
            </svg>
            <style>{`
              @keyframes nm-timer-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.18); }
                100% { transform: scale(1); }
              }
            `}</style>
          </div>

          {/* Question card anchored at bottom */}
          <div className="mt-auto">
            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <p>
                    Current Winnings: <span className="font-semibold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">{formattedWinnings}</span>
                  </p>
                  <p>
                    Safe Amount: <span className="font-semibold text-slate-200">{formattedSafe}</span>
                  </p>
                </div>
                <h1 className="text-2xl font-bold min-h-[2lh]">{q?.prompt ?? '—'}</h1>
                <div className="grid gap-2 sm:grid-cols-2">
                  {choices.map((c, i) => {
                    const eliminated = state.eliminatedChoices.includes(i)
                    if (eliminated) return null // 50:50 hides eliminated options completely
                    const isLocked = state.lockedChoice === i
                    const showResult = state.answered
                    const isCorrect = q && i === q.correctIndex
                    const base = 'rounded border border-slate-800 px-4 py-3 text-left transition-colors '
                    const enabledStyles = 'bg-slate-900 hover:bg-slate-800'
                    const lockedStyles = 'ring-2 ring-indigo-400'
                    const resultStyles = isCorrect
                      ? 'bg-green-500/70 border-green-400'
                      : isLocked
                      ? 'bg-red-800/60 border-red-700'
                      : 'bg-slate-900'
                    return (
                      <button
                        key={i}
                        disabled={showResult || state.remainingTime === 0}
                        onClick={() => dispatch({ type: 'SELECT_CHOICE', index: i })}
                        className={base + (showResult ? resultStyles : enabledStyles) + (isLocked ? ' ' + lockedStyles : '')}
                        aria-pressed={isLocked}
                        aria-disabled={showResult || state.remainingTime === 0}
                        aria-label={`Answer ${String.fromCharCode(65 + i)}: ${c}`}
                      >
                        {String.fromCharCode(65 + i)}) {c}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    className="rounded nm-gradient-bg px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60 shadow focus:outline-none focus:ring-2 focus:ring-amber-300"
                    onClick={() => dispatch({ type: 'LOCK_IN' })}
                    disabled={state.lockedChoice == null || state.answered || state.remainingTime === 0}
                    aria-disabled={state.lockedChoice == null || state.answered || state.remainingTime === 0}
                  >
                    Lock in
                  </button>
                  <button
                    className="rounded bg-slate-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-slate-500"
                    onClick={() => dispatch({ type: 'WALK_AWAY' })}
                    disabled={state.answered || state.gameOver}
                    title="Leave now and keep your current winnings"
                    aria-disabled={state.answered || state.gameOver}
                  >
                    Walk away
                  </button>
                  <button
                    className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => dispatch({ type: 'NEXT' })}
                    disabled={!state.answered}
                    aria-disabled={!state.answered}
                  >
                    Next
                  </button>
                  <button
                    className="ml-auto text-xs underline text-slate-400 hover:text-slate-200"
                    onClick={() => {
                      clearSession()
                      window.location.reload()
                    }}
                  >
                    New Game
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {showPoll && state.pollResults && (
            <Modal onClose={() => { setAnimatePoll(false); setShowPoll(false) }} ariaLabelledby="poll-title">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 id="poll-title" className="text-lg font-bold">Audience Poll</h3>
                  <button
                    className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700 nm-gradient-text"
                    onClick={() => {
                      setAnimatePoll(false)
                      setShowPoll(false)
                    }}
                    aria-label="Close poll"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {state.pollResults.map((p, i) => {
                    const eliminated = state.eliminatedChoices.includes(i)
                    if (eliminated) return null
                    const value = Math.max(0, Math.min(100, p))
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className="relative flex h-40 w-8 items-end rounded bg-slate-800">
                          <div
                            className="w-full rounded-b bg-gradient-to-b from-amber-400 to-orange-500 transition-[height] duration-500 ease-out"
                            style={{
                              height: animatePoll ? `${value}%` : '0%',
                              transitionDelay: `${i * 60}ms`,
                            }}
                            role="img"
                            aria-label={`Audience confidence for ${String.fromCharCode(65 + i)} is ${value} percent`}
                          />
                        </div>
                        <div className="mt-1 text-center text-xs text-slate-300">
                          <div>{String.fromCharCode(65 + i)}</div>
                          <div className="tabular-nums">{value}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Modal>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Lifelines
            onUseFifty={() => dispatch({ type: 'USE_FIFTY_FIFTY' })}
            onUseAudience={() => {
              dispatch({ type: 'USE_AUDIENCE_POLL' })
              setShowPoll(true)
              setTimeout(() => setAnimatePoll(true), 30)
            }}
            onUseSwitch={() => dispatch({ type: 'USE_SWITCH_QUESTION' })}
            fiftyUsed={state.usedLifelines.fiftyFifty}
            audienceUsed={state.usedLifelines.audience}
            switchUsed={state.usedLifelines.switch}
            disableAll={state.answered || state.remainingTime === 0}
          />
          <PrizeLadder currentLevel={state.level} lastSafeLevel={state.lastSafeLevel} pulseLevel={pulseLevel} />
        </aside>
      </div>
    </main>
  )
}
