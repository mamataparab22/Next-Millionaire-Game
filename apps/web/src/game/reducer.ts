import { type GameAction, type GameState, type Question } from './types'
import { levelToDifficulty, timeForLevel, isCheckpoint, prizeForLevel, lastSafeLevel as computeLastSafe } from './config'

export const initialState: GameState = {
  level: 1,
  usedLifelines: { fiftyFifty: false, audience: false, switch: false },
  currentQuestionIndex: 0,
  questions: [],
  seenQuestionIds: [],
  eliminatedChoices: [],
  lockedChoice: null,
  answered: false,
  correct: null,
  pollResults: null,
  remainingTime: timeForLevel(1),
  infoMessage: null,
  winnings: 0,
  lastSafeLevel: 0,
  gameOver: false,
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'HYDRATE': {
      const next = action.state
      const maxTime = timeForLevel(next.level)
      const safeTime = Math.max(0, Math.min(next.remainingTime ?? maxTime, maxTime))
      return { ...next, remainingTime: safeTime }
    }
    case 'LOAD_QUESTIONS': {
      // If questions are already loaded, ignore further loads to avoid accidental resets (e.g., late API response or re-mounts)
      if (state.questions && state.questions.length > 0) {
        return state
      }
      const qs = action.questions
      return {
        ...initialState,
        questions: qs,
        remainingTime: timeForLevel(1),
        // mark the first question as seen if present
        seenQuestionIds: qs[0] ? [qs[0].id] : [],
      }
    }
    case 'SELECT_CHOICE': {
      if (state.answered) return state
      return { ...state, lockedChoice: action.index }
    }
    case 'LOCK_IN': {
      if (state.lockedChoice == null || state.answered) return state
      const q = state.questions[state.currentQuestionIndex]
      if (!q) return state
      const isCorrect = state.lockedChoice === q.correctIndex
      if (isCorrect) {
        // Update winnings to prize for current level; update safe level if checkpoint
        const newWinnings = prizeForLevel(state.level)
        const newSafe = isCheckpoint(state.level) ? state.level : state.lastSafeLevel
        return { ...state, answered: true, correct: true, winnings: newWinnings, lastSafeLevel: newSafe }
      }
      // Incorrect: end game immediately
      const safeLevel = state.lastSafeLevel
      const finalAmount = prizeForLevel(safeLevel)
      return { ...state, answered: true, correct: false, gameOver: true, winnings: finalAmount }
    }
    case 'NEXT': {
      const nextIndex = state.currentQuestionIndex + 1
  const nextLevel = state.level + (state.correct ? 1 : 0)
      const done = nextIndex >= state.questions.length
      // If last question was correct and level was 15, game won
      if (state.correct && state.level === 15) {
        return {
          ...state,
          gameOver: true,
          answered: true,
          correct: true,
          // winnings already set to $1,000,000 on LOCK_IN
        }
      }
      return {
        ...state,
        level: done ? state.level : nextLevel,
        currentQuestionIndex: Math.min(nextIndex, state.questions.length - 1),
        eliminatedChoices: [],
        lockedChoice: null,
        answered: false,
        correct: null,
        pollResults: null,
  remainingTime: timeForLevel(done ? state.level : nextLevel),
        infoMessage: null,
        seenQuestionIds:
          done
            ? state.seenQuestionIds
            : Array.from(new Set([...state.seenQuestionIds, state.questions[Math.min(nextIndex, state.questions.length - 1)]?.id].filter(Boolean) as string[])),
      }
    }
    case 'USE_FIFTY_FIFTY': {
      if (state.usedLifelines.fiftyFifty || state.answered) return state
      const q = state.questions[state.currentQuestionIndex]
      if (!q) return state
      // pick two incorrect indexes to eliminate
      const incorrect = [0, 1, 2, 3].filter((i) => i !== q.correctIndex)
      const eliminated = incorrect.sort(() => 0.5 - Math.random()).slice(0, 2)
      return {
        ...state,
        usedLifelines: { ...state.usedLifelines, fiftyFifty: true },
        eliminatedChoices: eliminated,
      }
    }
    case 'USE_SWITCH_QUESTION': {
      if (state.usedLifelines.switch || state.answered) return state
      const current = state.questions[state.currentQuestionIndex]
      if (!current) return state

  // Determine desired difficulty based on current level
  const desiredDifficulty: Question['difficulty'] = levelToDifficulty(state.level)

      // Build candidate lists
      const unseenIndices = state.questions
        .map((q, idx) => ({ q, idx }))
        .filter(({ q }) => !state.seenQuestionIds.includes(q.id))

      // First try: unseen and matching difficulty
      const best = unseenIndices.find(({ q }) => q.difficulty === desiredDifficulty)

      // Fallback 1: any unseen regardless of difficulty
      const anyUnseen = best ? best : unseenIndices[0]

      // Fallback 2: if nothing unseen, try a not-current index with same difficulty but seen before
      const sameDiffSeen = !anyUnseen
        ? state.questions
            .map((q, idx) => ({ q, idx }))
            .find(({ q, idx }) => idx !== state.currentQuestionIndex && q.difficulty === desiredDifficulty)
        : undefined

      // If no options, keep current and show notice
      const target = anyUnseen ?? sameDiffSeen
      if (!target) {
        return {
          ...state,
          usedLifelines: { ...state.usedLifelines, switch: true },
          infoMessage: 'No alternative question available at this level.',
        }
      }

      const nextIdx = target.idx
      const nextId = state.questions[nextIdx]?.id
      return {
        ...state,
        usedLifelines: { ...state.usedLifelines, switch: true },
        currentQuestionIndex: nextIdx,
        eliminatedChoices: [],
        lockedChoice: null,
        answered: false,
        correct: null,
        pollResults: null,
  remainingTime: timeForLevel(state.level),
        infoMessage: null,
        seenQuestionIds: nextId ? Array.from(new Set([...state.seenQuestionIds, nextId])) : state.seenQuestionIds,
      }
    }
    case 'USE_AUDIENCE_POLL': {
      if (state.usedLifelines.audience || state.answered) return state
      const q = state.questions[state.currentQuestionIndex]
      if (!q) return state
      // Available options are those not eliminated by 50:50.
      const available = [0, 1, 2, 3].filter((i) => !state.eliminatedChoices.includes(i))
      // Simulate distribution biased to the correct answer among available choices only.
      const hasCorrect = available.includes(q.correctIndex)
      const baseConf = Math.max(0.4, 0.8 - state.level * 0.025)
      const correctWeight = hasCorrect ? baseConf : 0.0
      const remaining = Math.max(0, 1 - correctWeight)
      const others = available.filter((i) => i !== q.correctIndex)
      const rand = others.map(() => Math.random())
      const randSum = rand.reduce((a, b) => a + b, 0) || 1
      const otherWeights = rand.map((r) => (r / randSum) * remaining)
      const weights: number[] = new Array(4).fill(0)
      if (hasCorrect) weights[q.correctIndex] = correctWeight
      others.forEach((idx, j) => {
        weights[idx] = otherWeights[j] ?? 0
      })
      // Convert to percentages and re-normalize to 100 across all four buckets.
      const perc = weights.map((w) => Math.round(w * 100))
      const total = perc.reduce((a, b) => a + b, 0)
      if (total !== 100) {
        const adjustIdx = available[available.length - 1] ?? 3
        perc[adjustIdx] = (perc[adjustIdx] ?? 0) + (100 - total)
      }
      return {
        ...state,
        usedLifelines: { ...state.usedLifelines, audience: true },
        pollResults: perc,
      }
    }
    case 'RESET':
      return initialState
    case 'WALK_AWAY': {
      if (state.answered || state.gameOver) return state
      // Walk away keeps current winnings (from last correct). If none yet, winnings = 0.
      return { ...state, gameOver: true, answered: true }
    }
    case 'TICK': {
      if (state.answered) return state
      return { ...state, remainingTime: Math.max(0, state.remainingTime - 1) }
    }
    case 'TIME_UP': {
      if (state.answered) return state
      // Timeout acts as incorrect; end game with safe amount
      const safeLevel = state.lastSafeLevel
      const finalAmount = prizeForLevel(safeLevel)
      return { ...state, answered: true, correct: false, gameOver: true, winnings: finalAmount }
    }
    default:
      return state
  }
}

export function getCurrentQuestion(state: GameState): Question | undefined {
  return state.questions[state.currentQuestionIndex]
}
