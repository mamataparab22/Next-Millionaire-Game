import { useEffect, useMemo, useReducer, useState, useRef } from 'react'
import { PrizeLadder } from '../components/PrizeLadder'
import { Lifelines } from '../components/Lifelines'
import { Card } from '../components/Card'
import { LoadingQuestions } from '../components/LoadingQuestions'
import { initialState, reducer, getCurrentQuestion } from '../game/reducer'
import { Modal } from '../components/Modal'
import { ConfettiBurst } from '../components/ConfettiBurst'
import { saveResults, saveSession, loadSession, clearSession } from '../game/storage'
import { timeForLevel, prizeForLevel } from '../game/config'
import { useNavigate } from 'react-router-dom'
import useSfx from '../hooks/useSfx'

export function Play() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { enable, tick, correct, wrong, lifeline } = useSfx()
  const [showPoll, setShowPoll] = useState(false)
  const [animatePoll, setAnimatePoll] = useState(false)
  const [pulseLevel, setPulseLevel] = useState<number | undefined>(undefined)
  const [loadingQs, setLoadingQs] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
  const snapshot = loadSession()
  if (snapshot?.state && Array.isArray(snapshot.state.questions) && snapshot.state.questions.length > 0) {
      dispatch({ type: 'HYDRATE', state: snapshot.state })
      setLoadingQs(false)
      setLoadError(null)
      return
    }
    setLoadError('No active game. Please start from Home and select categories.')
    setLoadingQs(false)
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

  // Play tick when the timer decreases (only for first 10 questions)
  useEffect(() => {
    if (state.answered || state.gameOver) return
    const showTimer = state.currentQuestionIndex < 10
    if (!showTimer) return
    if (state.remainingTime < lastTimeRef.current) {
      tick()
    }
    lastTimeRef.current = state.remainingTime
  }, [state.remainingTime, state.answered, state.gameOver, state.currentQuestionIndex, tick])

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

  // Play correct/wrong once when answered
  useEffect(() => {
    if (!state.answered || state.correct == null) return
    if (state.correct) correct()
    else wrong()
  }, [state.answered, state.correct, correct, wrong])

  // Navigate to results when game is over
  useEffect(() => {
    if (state.gameOver) {
      saveResults({ winnings: state.winnings, level: state.level, lastSafeLevel: state.lastSafeLevel })
  setShowResults(true)
    }
  }, [state.gameOver, state.winnings, state.level, state.lastSafeLevel, navigate])

  const q = getCurrentQuestion(state)
  const choices = q?.choices ?? []
  const totalTime = timeForLevel(state.level)
  const timeFrac = totalTime > 0 ? state.remainingTime / totalTime : 0
  const lowTime = state.remainingTime <= 5
  // Show timer strictly for the first 10 questions (indexes 0..9)
  const showTimer = state.currentQuestionIndex < 10
  const circleRadius = 35
  const circleCirc = 2 * Math.PI * circleRadius
  const circleOffset = (1 - timeFrac) * circleCirc
  const formattedWinnings = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(state.winnings), [state.winnings])
  const formattedSafe = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prizeForLevel(state.lastSafeLevel)), [state.lastSafeLevel])

  return (
    <main
      className="relative min-h-screen bg-center bg-cover"
      style={{ backgroundImage: "url('/millionaire-hero.jpg')" }}
      aria-describedby={state.infoMessage ? 'info-message' : undefined}
    >
      {/* Dark overlay for readability */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-black/60" />
  <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_220px] pl-40">
  {pulseLevel && <ConfettiBurst pieces={90} />}
  {loadingQs && state.questions.length === 0 && (
          <div className="col-span-full">
            <LoadingQuestions />
          </div>
        )}
        {loadError && state.questions.length === 0 && !loadingQs && (
          <div className="col-span-full">
            <Card>
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-red-200">Unable to start game</h2>
                <p className="text-sm text-slate-200">{loadError}</p>
                <div className="flex gap-2">
                  <button
                    className="rounded nm-gradient-bg px-4 py-2 text-sm font-semibold text-slate-900"
                    onClick={() => navigate('/')}
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Game Stage */}
        <section className="flex flex-col gap-4 min-h-[70vh]">
          {/* Top controls: Walk Away + New Game */}
          <div className="flex justify-start gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-md border-2 border-amber-400/80 bg-slate-900/70 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-100 shadow hover:bg-slate-800/80 disabled:opacity-60"
              onClick={() => dispatch({ type: 'WALK_AWAY' })}
              disabled={state.answered || state.gameOver}
              title="Leave now and keep your current winnings"
              aria-label="Walk away"
              aria-disabled={state.answered || state.gameOver}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 3h7a1 1 0 0 1 1 1v3" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <path d="M11 17v3a1 1 0 0 1-1 1H3V3" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
                <path d="M14 8l4 4-4 4" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 12h9" stroke="#fde68a" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="hidden sm:inline">Walk Away</span>
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md border-2 border-amber-400/80 bg-slate-900/70 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-100 shadow hover:bg-slate-800/80"
              onClick={() => { clearSession(); navigate('/'); }}
              title="Start a new game"
              aria-label="New Game"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 5v2a5 5 0 1 1-4.546 2.914" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 5l-3 3 3 3" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="hidden sm:inline">New Game</span>
            </button>
          </div>
          {state.infoMessage && (
            <div id="info-message" role="status" aria-live="polite" className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
              {state.infoMessage}
            </div>
          )}

          {/* Centered circular countdown timer (only for first 10 questions) */}
          {showTimer && (
            <div className="flex justify-center mt-14 pt-1">
              <svg
                width="140"
                height="140"
                viewBox="0 0 80 80"
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
                <circle cx="40" cy="40" r={circleRadius} fill="none" stroke="#1f2937" strokeWidth="8" opacity="0.5" />
                {/* Progress */}
                <g transform="rotate(-90 40 40)">
                  <circle
                    cx="40"
                    cy="40"
                    r={circleRadius}
                    fill="none"
                    stroke="url(#nm-timer-grad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circleCirc}
                    strokeDashoffset={circleOffset}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </g>
                {/* Numeric label */}
                <text
                  x="40"
                  y="49"
                  textAnchor="middle"
                  fontSize="28"
                  fontWeight="800"
                  fill={lowTime ? '#0b1220' : '#0b1220'}
                  stroke={lowTime ? '#f87171' : '#e2e8f0'}
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
                  50% { transform: scale(1.14); }
                  100% { transform: scale(1); }
                }
              `}</style>
            </div>
          )}

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
                {/* Millionaire-style question banner with circular timer on the right */
                /* Walk Away button is vertically aligned on the left of this banner */}
                <div className="relative rounded-xl border-2 border-amber-400/80 bg-gradient-to-b from-[#1E3A8A] to-[#0B276D] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_20px_rgba(0,0,0,0.45)]">
                  <h1 className="text-center text-xl sm:text-2xl font-bold text-slate-50 min-h-[2lh]">{q?.prompt ?? '—'}</h1>
                </div>

                {/* Millionaire-style answer options */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {choices.map((c, i) => {
                    const eliminated = state.eliminatedChoices.includes(i)
                    if (eliminated) return null // 50:50 hides eliminated options completely
                    const isLocked = state.lockedChoice === i
                    const showResult = state.answered
                    const isCorrect = q && i === q.correctIndex

                    const baseBtn =
                      'relative flex items-center gap-3 rounded-full border-2 px-4 py-2 sm:px-5 sm:py-3 text-left text-slate-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 select-none'

                    const blueBtn =
                      'bg-gradient-to-b from-[#0F2A6F] to-[#0A1D52] border-amber-400/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_14px_rgba(0,0,0,0.45)] hover:from-[#14378A] hover:to-[#0C276D]'

                    const lockedStyles = 'ring-2 ring-amber-300'

                    const selectedBtn =
                      'bg-gradient-to-b from-amber-300 to-orange-500 text-slate-900 border-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_16px_rgba(0,0,0,0.45)]'

                    const resultBtn = isCorrect
                      ? 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-emerald-300'
                      : isLocked
                      ? 'bg-gradient-to-b from-[#7f1d1d] to-[#450a0a] border-red-700'
                      : 'bg-gradient-to-b from-[#0F2A6F] to-[#0A1D52] border-amber-400/70 opacity-80'

                    const className = [
                      baseBtn,
                      showResult ? resultBtn : (isLocked ? selectedBtn : blueBtn),
                      isLocked && !showResult ? lockedStyles : ''
                    ].join(' ')

                    const letter = String.fromCharCode(65 + i)
                    return (
                      <button
                        key={i}
                        disabled={showResult || state.remainingTime === 0}
                        onClick={() => { enable(); dispatch({ type: 'SELECT_CHOICE', index: i }) }}
                        className={className}
                        aria-pressed={isLocked}
                        aria-disabled={showResult || state.remainingTime === 0}
                        aria-label={`Answer ${letter}: ${c}`}
                      >
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" aria-hidden="true" />
                          <span className="font-extrabold text-amber-200">{letter}:</span>
                        </span>
                        <span className="font-semibold">{c}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    className="rounded nm-gradient-bg px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60 shadow focus:outline-none focus:ring-2 focus:ring-amber-300"
                    onClick={() => { enable(); dispatch({ type: 'LOCK_IN' }) }}
                    disabled={state.lockedChoice == null || state.answered || state.remainingTime === 0}
                    aria-disabled={state.lockedChoice == null || state.answered || state.remainingTime === 0}
                  >
                    Lock in
                  </button>
                  {/* Walk Away now lives in the top-left fixed button */}
                  <button
                    className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => dispatch({ type: 'NEXT' })}
                    disabled={!state.answered}
                    aria-disabled={!state.answered}
                  >
                    Next
                  </button>
                  {/* New Game moved to the top controls */}
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
            onUseFifty={() => { enable(); dispatch({ type: 'USE_FIFTY_FIFTY' }); lifeline(); }}
            onUseAudience={() => {
              enable()
              dispatch({ type: 'USE_AUDIENCE_POLL' })
              setShowPoll(true)
              setTimeout(() => setAnimatePoll(true), 30)
              lifeline()
            }}
            onUseSwitch={() => { enable(); dispatch({ type: 'USE_SWITCH_QUESTION' }); lifeline(); }}
            fiftyUsed={state.usedLifelines.fiftyFifty}
            audienceUsed={state.usedLifelines.audience}
            switchUsed={state.usedLifelines.switch}
            disableAll={state.answered || state.remainingTime === 0}
          />
          <PrizeLadder currentLevel={state.level} lastSafeLevel={state.lastSafeLevel} pulseLevel={pulseLevel} />
        </aside>
      </div>

      {showResults && (
        <Modal onClose={() => setShowResults(false)} ariaLabelledby="results-title" closeOnBackdropClick>
          <section className="space-y-4 text-center">
            <h2 id="results-title" className="text-2xl font-bold">Results</h2>
            <p className="text-xl font-extrabold"><span className="nm-gradient-text">Final Winnings: {formattedWinnings}</span></p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setShowResults(false)}
                className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white"
                aria-label="Close results"
              >
                Close
              </button>
              <button
                onClick={() => { clearSession(); navigate('/') }}
                className="rounded nm-gradient-bg px-4 py-2 text-sm font-semibold text-slate-900"
                aria-label="Play again"
              >
                Play Again
              </button>
            </div>
          </section>
        </Modal>
      )}
    </main>
  )
}
