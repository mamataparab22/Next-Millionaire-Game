import { type Question } from './types'

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    category: 'General Knowledge',
    difficulty: 'easy',
    prompt: 'Which planet is known as the Red Planet?',
    choices: ['Mercury', 'Venus', 'Earth', 'Mars'],
    correctIndex: 3,
  },
  {
    id: 'q2',
    category: 'Science',
    difficulty: 'easy',
    prompt: 'What is H2O commonly known as?',
    choices: ['Salt', 'Water', 'Oxygen', 'Hydrogen'],
    correctIndex: 1,
  },
]
