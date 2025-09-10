import { type GameAction, type GameState, type Question } from './types'

export const initialState: GameState = {
  level: 1,
  usedLifelines: { fiftyFifty: false, audience: false, switch: false },
  currentQuestionIndex: 0,
  questions: [],
  eliminatedChoices: [],
  lockedChoice: null,
  answered: false,
  correct: null,
  pollResults: null,
  remainingTime: 30,
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_QUESTIONS': {
      const qs = action.questions
      return {
        ...initialState,
        questions: qs,
  remainingTime: 30,
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
      return { ...state, answered: true, correct: isCorrect }
    }
    case 'NEXT': {
      const nextIndex = state.currentQuestionIndex + 1
      const nextLevel = state.level + (state.correct ? 1 : 0)
      const done = nextIndex >= state.questions.length
      return {
        ...state,
        level: done ? state.level : nextLevel,
        currentQuestionIndex: Math.min(nextIndex, state.questions.length - 1),
        eliminatedChoices: [],
        lockedChoice: null,
        answered: false,
        correct: null,
  pollResults: null,
  remainingTime: 30,
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
      const q = state.questions[state.currentQuestionIndex]
      if (!q) return state
      // Naive switch: rotate to next question in the list that is different.
      const nextIdx = (state.currentQuestionIndex + 1) % state.questions.length
      if (nextIdx === state.currentQuestionIndex) return state
      return {
        ...state,
        usedLifelines: { ...state.usedLifelines, switch: true },
        currentQuestionIndex: nextIdx,
        eliminatedChoices: [],
        lockedChoice: null,
        answered: false,
        correct: null,
        pollResults: null,
        remainingTime: 30,
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
    case 'TICK': {
      if (state.answered) return state
      return { ...state, remainingTime: Math.max(0, state.remainingTime - 1) }
    }
    case 'TIME_UP': {
      if (state.answered) return state
      return { ...state, answered: true, correct: false }
    }
    default:
      return state
  }
}

export function getCurrentQuestion(state: GameState): Question | undefined {
  return state.questions[state.currentQuestionIndex]
}
