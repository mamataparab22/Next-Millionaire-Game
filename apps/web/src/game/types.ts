export type Difficulty = 'easy' | 'medium' | 'hard'

export type Question = {
  id: string
  category: string
  difficulty: Difficulty
  prompt: string
  choices: string[]
  correctIndex: number
}

export type GameState = {
  level: number // 1..15
  usedLifelines: {
    fiftyFifty: boolean
    audience: boolean
    switch: boolean
  }
  currentQuestionIndex: number
  questions: Question[]
  eliminatedChoices: number[] // indexes eliminated by 50:50
  lockedChoice: number | null
  answered: boolean
  correct: boolean | null
  pollResults: number[] | null // percentages per choice (0-100), null when not used
  remainingTime: number // seconds left for current question
}

export type GameAction =
  | { type: 'LOAD_QUESTIONS'; questions: Question[] }
  | { type: 'SELECT_CHOICE'; index: number }
  | { type: 'LOCK_IN' }
  | { type: 'NEXT' }
  | { type: 'USE_FIFTY_FIFTY' }
  | { type: 'USE_AUDIENCE_POLL' }
  | { type: 'USE_SWITCH_QUESTION' }
  | { type: 'TICK' }
  | { type: 'TIME_UP' }
  | { type: 'RESET' }
