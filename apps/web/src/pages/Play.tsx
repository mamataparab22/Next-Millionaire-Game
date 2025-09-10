import { useEffect, useMemo, useReducer, useState } from 'react'
import { PrizeLadder } from '../components/PrizeLadder'
import { Lifelines } from '../components/Lifelines'
import { Card } from '../components/Card'
import { initialState, reducer, getCurrentQuestion } from '../game/reducer'
import { SAMPLE_QUESTIONS } from '../game/sample'
import { Modal } from '../components/Modal'

export function Play() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [showPoll, setShowPoll] = useState(false)
  const [animatePoll, setAnimatePoll] = useState(false)

  useEffect(() => {
    dispatch({ type: 'LOAD_QUESTIONS', questions: SAMPLE_QUESTIONS })
  }, [])

  const q = getCurrentQuestion(state)
  const choices = useMemo(() => q?.choices ?? [], [q])

  // Simple timer effect: tick per second until answered or zero
  useEffect(() => {
    if (state.answered) return
    const id = setInterval(() => {
      dispatch({ type: 'TICK' })
    }, 1000)
    return () => clearInterval(id)
  }, [state.answered])

  useEffect(() => {
    if (state.remainingTime === 0 && !state.answered) {
      dispatch({ type: 'TIME_UP' })
    }
  }, [state.remainingTime, state.answered])

  return (
    <main className="min-h-[70vh]">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* Game Stage */}
        <section className="space-y-4">
          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <p>Category: {q?.category ?? '—'}</p>
                <p className={state.remainingTime <= 5 ? 'text-red-400 font-semibold' : ''}>
                  ⏱ {state.remainingTime}s
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
                    ? 'bg-green-700/60 border-green-600'
                    : isLocked
                    ? 'bg-red-800/60 border-red-700'
                    : 'bg-slate-900'
                  return (
                    <button
                      key={i}
                      disabled={showResult || state.remainingTime === 0}
                      onClick={() => dispatch({ type: 'SELECT_CHOICE', index: i })}
                      className={base + (showResult ? resultStyles : enabledStyles) + (isLocked ? ' ' + lockedStyles : '')}
                    >
                      {String.fromCharCode(65 + i)}) {c}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  className="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60 shadow hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  onClick={() => dispatch({ type: 'LOCK_IN' })}
                  disabled={state.lockedChoice == null || state.answered || state.remainingTime === 0}
                >
                  Lock in
                </button>
                <button
                  className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={() => dispatch({ type: 'NEXT' })}
                  disabled={!state.answered}
                >
                  Next
                </button>
              </div>
            </div>
          </Card>
          <Lifelines
            onUseFifty={() => dispatch({ type: 'USE_FIFTY_FIFTY' })}
            onUseAudience={() => {
              dispatch({ type: 'USE_AUDIENCE_POLL' })
              setShowPoll(true)
              // allow next tick for modal mount then trigger bar animation
              setTimeout(() => setAnimatePoll(true), 30)
            }}
            onUseSwitch={() => dispatch({ type: 'USE_SWITCH_QUESTION' })}
            fiftyUsed={state.usedLifelines.fiftyFifty}
            audienceUsed={state.usedLifelines.audience}
            switchUsed={state.usedLifelines.switch}
            disableAll={state.answered || state.remainingTime === 0}
          />

          {showPoll && state.pollResults && (
            <Modal onClose={() => { setAnimatePoll(false); setShowPoll(false) }}>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold">Audience Poll</h3>
                  <button
                    className="rounded bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                    onClick={() => {
                      setAnimatePoll(false)
                      setShowPoll(false)
                    }}
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
                            className="w-full rounded-b bg-yellow-400 transition-[height] duration-500 ease-out"
                            style={{
                              height: animatePoll ? `${value}%` : '0%',
                              transitionDelay: `${i * 60}ms`,
                            }}
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
        <PrizeLadder currentLevel={state.level} />
      </div>
    </main>
  )
}
