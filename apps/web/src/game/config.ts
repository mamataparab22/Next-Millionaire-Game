import type { Difficulty } from './types'

export const LADDER = [
  { level: 1, amount: 100 },
  { level: 2, amount: 200 },
  { level: 3, amount: 300 },
  { level: 4, amount: 500 },
  { level: 5, amount: 1000 }, // checkpoint
  { level: 6, amount: 2000 },
  { level: 7, amount: 4000 },
  { level: 8, amount: 8000 },
  { level: 9, amount: 16000 },
  { level: 10, amount: 32000 }, // checkpoint
  { level: 11, amount: 64000 },
  { level: 12, amount: 125000 },
  { level: 13, amount: 250000 },
  { level: 14, amount: 500000 },
  { level: 15, amount: 1000000 },
]

export const CHECKPOINTS = new Set([5, 10])

export function isCheckpoint(level: number): boolean {
  return CHECKPOINTS.has(level)
}

export function prizeForLevel(level: number): number {
  const found = LADDER.find((l) => l.level === level)
  return found ? found.amount : 0
}

export function lastSafeLevel(level: number): number {
  if (level >= 10) return 10
  if (level >= 5) return 5
  return 0
}

export const MAX_LEVEL = 15

export function levelToDifficulty(level: number): Difficulty {
  if (level <= 5) return 'easy'
  if (level <= 10) return 'medium'
  return 'hard'
}

// Base time per level (seconds). Later, can be overridden via env/config.
export function timeForLevel(level: number): number {
  const diff = levelToDifficulty(level)
  switch (diff) {
    case 'easy':
      return 30
    case 'medium':
      return 45
    case 'hard':
      return 60
    default:
      return 30
  }
}
