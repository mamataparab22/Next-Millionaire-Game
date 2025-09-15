import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

// Simple in-memory sample; could be replaced by DB/LLM later


app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/questions', (req, res) => {
  const { categories: picked = [], count = 15 } = req.body ?? {}
  const pool = categories.filter((c) => picked.length === 0 || picked.includes(c))
  const mk = (i, difficulty) => ({
    id: `api-${difficulty}-${i+1}`,
    category: pool[(i + difficulty.length) % (pool.length || 1)] || 'General Knowledge',
    difficulty,
    prompt: `Generated ${difficulty} question #${i+1}`,
    choices: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  })
  const out = []
  for (let i = 0; i < count; i++) {
    const level = i + 1
    const diff = level <= 5 ? 'easy' : level <= 10 ? 'medium' : 'hard'
    out.push(mk(i, diff))
  }
  res.json({ questions: out })
})

