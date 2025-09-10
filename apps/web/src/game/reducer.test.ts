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
    expect(s.level).toBe(2)
    expect(s.winnings).toBeGreaterThan(0)
    expect(s.lastSafeLevel).toBe(0)
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
})
