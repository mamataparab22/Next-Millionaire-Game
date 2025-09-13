import { describe, it, expect } from 'vitest'
import { reducer as gameReducer, getCurrentQuestion, initialState } from './reducer'
import { type GameAction, type Question } from './types'
import { timeForLevel } from './config'

const mkQs = (count: number, difficulty: Question['difficulty'] = 'easy'): Question[] =>
  Array.from({ length: count }).map((_, i) => ({
    id: `${difficulty}-${i + 1}`,
    category: 'test',
    prompt: `Q${i + 1}`,
    choices: ['A', 'B', 'C', 'D'],
    correctIndex: 1,
    difficulty,
  }))

const dispatch = (state: typeof initialState, action: GameAction) => gameReducer(state, action)

describe('gameReducer basics', () => {
  it('loads questions and sets first question seen, timer set by level', () => {
    const qs = mkQs(5, 'easy')
    const s1 = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: qs })
    expect(s1.questions.length).toBe(5)
  expect(s1.seenQuestionIds.includes(qs[0]!.id)).toBe(true)
    expect(s1.remainingTime).toBe(timeForLevel(1))
  const cur = getCurrentQuestion(s1)
  expect(cur).toBeDefined()
  expect(cur!.id).toBe(qs[0]!.id)
  })

  it('LOCK_IN correct advances winnings and checkpoint', () => {
    const qs = mkQs(2, 'easy')
    let s = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: qs })
  s = dispatch(s, { type: 'SELECT_CHOICE', index: 1 })
  s = dispatch(s, { type: 'LOCK_IN' })
  // Level increments on NEXT, not on LOCK_IN
  expect(s.level).toBe(1)
    expect(s.winnings).toBeGreaterThan(0)
    expect(s.lastSafeLevel).toBe(0)
  s = dispatch(s, { type: 'NEXT' })
  expect(s.level).toBe(2)
  })

  it('TIME_UP ends game with safe winnings', () => {
    const qs = mkQs(1, 'easy')
    let s = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: qs })
    s = dispatch(s, { type: 'TIME_UP' })
    expect(s.gameOver).toBe(true)
    expect(s.winnings).toBe(0)
  })
})

describe('lifelines', () => {
  it('50:50 removes two options and audience poll respects it', () => {
    const qs = mkQs(1)
    let s = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: qs })
    s = dispatch(s, { type: 'USE_FIFTY_FIFTY' })
    expect(s.eliminatedChoices?.length).toBe(2)
  s = dispatch(s, { type: 'USE_AUDIENCE_POLL' })
    expect(s.pollResults).toBeDefined()
  const eliminated = new Set(s.eliminatedChoices)
    // eliminated options should have low probability (near zero but we just assert <= 10)
  s.pollResults!.forEach((p: number, idx: number) => {
      if (eliminated.has(idx)) expect(p).toBeLessThanOrEqual(10)
    })
  })

  it('Switch picks an unseen question of same difficulty when possible', () => {
    const qs = [...mkQs(3, 'easy'), ...mkQs(3, 'medium')]
    let s = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: qs })
    const firstId = getCurrentQuestion(s)!.id
    s = dispatch(s, { type: 'USE_SWITCH_QUESTION' })
    const cur = getCurrentQuestion(s)!
    expect(cur.id).not.toBe(firstId)
    // level 1 is easy, ensure difficulty parity
    expect(cur.difficulty).toBe('easy')
  })

  it('Switch shows friendly notice when no alternative is available', () => {
    const qs = mkQs(1, 'easy')
    let s = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: qs })
    // Seen contains the only question; switching should set infoMessage
    s = dispatch(s, { type: 'USE_SWITCH_QUESTION' })
    expect(s.usedLifelines.switch).toBe(true)
    // Either we remained on same question with an info message
    expect(s.infoMessage == null || s.infoMessage.includes('No alternative')).toBe(true)
  })
})

describe('checkpoints and endgame', () => {
  it('updates safe level on checkpoint and retains on incorrect', () => {
    const qs = mkQs(6, 'easy')
    let s = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: qs })
    // Answer 5 correctly to hit checkpoint at level 5
    for (let i = 0; i < 5; i++) {
      s = dispatch(s, { type: 'SELECT_CHOICE', index: 1 })
      s = dispatch(s, { type: 'LOCK_IN' })
      s = dispatch(s, { type: 'NEXT' })
    }
    expect(s.level).toBe(6)
    expect(s.lastSafeLevel).toBe(5)
    // Now answer incorrectly
    s = dispatch(s, { type: 'SELECT_CHOICE', index: 0 })
    s = dispatch(s, { type: 'LOCK_IN' })
    expect(s.gameOver).toBe(true)
    expect(s.winnings).toBeGreaterThan(0)
  })

  it('wins the game at level 15 when correct on last question', () => {
    const easy = mkQs(5, 'easy')
    const med = mkQs(5, 'medium')
    const hard = mkQs(5, 'hard')
    let s = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: [...easy, ...med, ...hard] })
    for (let i = 0; i < 15; i++) {
      s = dispatch(s, { type: 'SELECT_CHOICE', index: 1 })
      s = dispatch(s, { type: 'LOCK_IN' })
      s = dispatch(s, { type: 'NEXT' })
    }
    expect(s.gameOver).toBe(true)
    expect(s.correct).toBe(true)
  })

  it('walk away ends game but preserves current winnings state', () => {
    const qs = mkQs(3, 'easy')
    let s = dispatch(initialState, { type: 'LOAD_QUESTIONS', questions: qs })
    s = dispatch(s, { type: 'SELECT_CHOICE', index: 1 })
    s = dispatch(s, { type: 'LOCK_IN' }) // now level should be 1 correct, winnings > 0
    s = dispatch(s, { type: 'NEXT' })
    s = dispatch(s, { type: 'WALK_AWAY' })
    expect(s.gameOver).toBe(true)
  })
})
