# Next-Millionaire-Game

Overview

The goal is to build a web-based interactive quiz game inspired by the reality show Who Wants to Be a Millionaire?, powered by the company’s internal LLM platform.
The app will deliver a rich user experience with:

Question/answer generation across user-chosen specialties.

Three lifelines (50:50, Audience Poll, Switch Question).

An AI “host” that speaks questions, adds suspense, and reveals answers.

Authentic design with prize ladder, timer, and sound effects.

This project leverages LLM features: Chat, Analyze, Ask Source, Ask Web, Speak, Transcribe, and Recognize.



1) High-level design

Stack

Frontend: React + Vite + TypeScript, Tailwind for styling, Howler.js for SFX, Web Speech API or your internal Speak TTS for host voice; optional STT for voice answers via Transcribe.

Backend: Node/Express (or Fastify) as a thin proxy to your internal LLM endpoints (Chat, Analyze, Recognize, Ask Web/Source, Speak). Add Socket.IO for audience-poll animation and event pushes.

State: XState (finite state machine) or simple React reducer for game flow; server stores authoritative state if you want anti-cheat / multi-player.

Persistence (optional): Redis for short-lived sessions, Postgres for leaderboards.

Game flow (states)
Intro → CategorySelect → GenerateQuestion → ReadQuestion → Answering(timer) → Evaluate → Correct|Wrong → (NextLevel or GameOver) → Results

2) Data models (TypeScript)
export type Category = "History" | "Geography" | "Sports" | "Recent Events" | "Science" | "Movies" | "Music";

export type LifelineType = "5050" | "AudiencePoll" | "SwitchQuestion";

export interface Question {
  id: string;
  category: Category;
  level: number;                // 1..15
  prompt: string;               // stem
  options: { key: "A"|"B"|"C"|"D"; text: string }[];
  correctKey: "A"|"B"|"C"|"D";
  explanation?: string;         // short rationale
  source?: string;              // optional citation if "Ask Web"/"Ask Source" used during gen
  difficulty: "easy"|"medium"|"hard";
}

export interface Lifelines {
  "5050": { used: boolean; removedKeys?: ("A"|"B"|"C"|"D")[] };
  "AudiencePoll": { used: boolean; distribution?: Record<"A"|"B"|"C"|"D", number> };
  "SwitchQuestion": { used: boolean };
}

export interface GameState {
  playerName: string;
  categories: Category[];
  level: number;                // 1..15
  earnings: number;             // ladder
  current?: Question;
  lifelines: Lifelines;
  timerSeconds?: number;        // level 1-6 only
  lockedIn?: "A"|"B"|"C"|"D" | null;
  isOver: boolean;
}

3) Money ladder & timers

Ladder (example): $100, $200, $300, $500, $1k, $2k, $4k, $8k, $16k, $32k, $64k, $125k, $250k, $500k, $1M

Timer: levels 1–6 only (e.g., 30s → 45s). Pause timer when lifeline dialog is open or host is speaking.

4) LLM prompting (robust + deterministic-ish)
4.1 Question generation (server side)

Use Chat with tools Ask Web for recency only when needed (e.g., “Recent events”). For stable topics, don’t browse to reduce drift. Provide a schema and ask the model to fill it.

System

You are a calibrated question writer for a Millionaire-style quiz.
Constraints:
- 1 correct answer + 3 plausible distractors.
- Difficulty must match requested level: levels 1-5 easy, 6-10 medium, 11-15 hard.
- Options must be short and mutually exclusive.
- If category = "Recent Events", only use facts from the last 12 months; cite a URL in `source`.
- Return VALID JSON only for the provided schema.


User

Generate 1 question.
category: {{category}}
level: {{level}}
difficulty: {{difficulty}}
style: American quiz show
json schema:
{
  "prompt": "string",
  "options": [{"key":"A|B|C|D","text":"string"}, ... 4 total],
  "correctKey":"A|B|C|D",
  "explanation":"string",
  "source":"string|null"
}


Validation: Server validates JSON, uniqueness of options, and runs a quick Analyze call: “Is the correct option actually correct? Answer YES/NO with 1-sentence rationale.” If NO, discard and regenerate.

4.2 Host speech (Speak)

Use Speak to TTS: intro, reading Q+options, “Lock it in?”, suspense beat (inject ~1–2s silence token if supported), reveal line.

Keep a “voice persona” (“Warm, confident game-show host, 120–140 wpm”).

4.3 “Recent events”

If category is “Recent Events” or prompt contains a date, call Ask Web with freshness constraint; store source and show a small “source” icon on UI.

5) Lifelines — exact logic
5.1 50:50

Remove two wrong options, chosen at random from the 3 wrong ones; never remove the correct one.

If already 50:50 used, disable.

If player triggers 50:50 after AudiencePoll, re-render poll with filtered options OR keep original bars greyed for removed options.

5.2 Audience Poll

Animate bars for A/B/C/D (Socket.IO can emit gradual increments for a nice effect).

Distribution logic:

For easy: correct gets 55–80%.

medium: 45–65%.

hard: 30–55%.

If 50:50 already used: renormalize only remaining options; increase confidence band (+10–15% on correct).

Optionally ask Analyze to compute distribution from rationale for extra realism:

Prompt: “Given the question and correct option, generate a believable audience poll distribution that sums to 100 based on difficulty.”

5.3 Switch the Question

Mark used; discard current; generate another with same category+level. Keep timer paused for 3s while host says the line.

6) UI & UX (Millionaire-style)

Top bar: logo, prize ladder (highlight current level), remaining lifelines (icons).

Center: question card; four large option buttons (A/B/C/D).

Bottom: timer ring (for Q1–6), “Lock In” state, subtle pulsing glow on hover.

Host avatar bubble or speaker icon with a live waveform while Speak is active.

SFX:

Start question “swoosh”

Tick-tock during timer

Lock-in “click”

Correct “win sting” vs Wrong “buzz”

Reveal suspense bed (short loop)

7) Minimal backend API (Express)
// src/server.ts
import express from "express";
import { v4 as uuid } from "uuid";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/question", async (req, res) => {
  const { category, level } = req.body as { category: string; level: number };
  const difficulty = level <= 5 ? "easy" : level <= 10 ? "medium" : "hard";

  // 1) Call internal LLM (Chat) with system+user prompts (from §4.1)
  const raw = await callLLMGenerateQuestion({ category, level, difficulty });

  // 2) Validate shape + correctness
  const q = validateQuestion(raw);          // throws if invalid
  const ok = await sanityCheckWithAnalyze(q);
  if (!ok) return res.status(422).json({ error: "Model produced inconsistent question" });

  const id = uuid();
  return res.json({ id, ...q, level, category, difficulty });
});

app.post("/api/lifeline/5050", (req, res) => {
  const { correctKey } = req.body as { correctKey: "A"|"B"|"C"|"D" };
  const keys: ("A"|"B"|"C"|"D")[] = ["A","B","C","D"];
  const wrong = keys.filter(k => k !== correctKey);
  // pick 2 wrong to remove
  const removed = shuffle(wrong).slice(0,2);
  res.json({ removedKeys: removed });
});

app.post("/api/lifeline/audience", (req, res) => {
  const { correctKey, difficulty, remainingKeys } =
    req.body as { correctKey: "A"|"B"|"C"|"D"; difficulty: "easy"|"medium"|"hard"; remainingKeys?: string[] };

  const keys = (remainingKeys?.length ? remainingKeys : ["A","B","C","D"]) as ("A"|"B"|"C"|"D")[];
  const base = difficulty === "easy" ? [0.65, 0.15, 0.1, 0.1]
             : difficulty === "medium" ? [0.5, 0.2, 0.15, 0.15]
             : [0.4, 0.25, 0.2, 0.15];

  // Map to keys so correctKey takes first slot weight; then jitter & renormalize
  const dist = computeDistribution(keys, correctKey, base);
  res.json({ distribution: dist }); // {A: 62, B: 18, C: 11, D: 9}
});

app.post("/api/lifeline/switch", async (req, res) => {
  const { category, level } = req.body;
  const newQ = await /* same as /api/question */;
  res.json(newQ);
});

app.listen(5174);


(helper functions omitted for brevity — but straightforward)

8) Minimal React shell (Vite)
// src/App.tsx
import { useEffect, useReducer, useRef } from "react";
import { Howl } from "howler";

type AnsKey = "A"|"B"|"C"|"D";

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const speakRef = useRef<ReturnType<typeof Howl> | null>(null);

  useEffect(() => {
    if (state.phase === "ReadQuestion" && state.current) {
      // Call /speak to synthesize Q+options, or use Web Speech API
      fetch("/api/speak", { method: "POST", body: JSON.stringify({ text: readOut(state.current) }) });
    }
  }, [state.phase]);

  return (
    <div className="min-h-screen bg-neutral-900 text-white grid grid-rows-[auto_1fr_auto]">
      <TopBar state={state} />
      <main className="grid place-items-center p-6">
        <QuestionCard state={state} onAnswer={(k)=>dispatch({type:"LOCK_IN", key:k})} />
      </main>
      <BottomBar state={state} dispatch={dispatch} />
    </div>
  );
}


(Implement reducer, QuestionCard, TopBar, BottomBar, and a circular timer with CSS. Use Tailwind rings and transitions for glow/hover.)

9) Prompts for host lines (Speak)

Intro: “Welcome to Next Millionaire! I’m your host. You’ve chosen {cat1}, {cat2}, {cat3}, {cat4}, and {cat5}. Let’s play!”

Reading Q: “For ${amount}, here is your question. {prompt}. Is it A: {A}, B: {B}, C: {C}, or D: {D}?”

Lock in: “Final answer… locked!”

Reveal (with suspense): “The correct answer… is… {pause 2s} {Correct}. {Cheer}”

Wrong: “Oh no. The correct answer was {Correct}. You leave with ${earnings}. Thanks for playing!”

10) Sound pack (file names you can drop in /public/sfx)

intro_sting.mp3, tick.mp3 (loop), lock.mp3, correct_fanfare.mp3, wrong_buzz.mp3, reveal_bed_loop.mp3, lifeline_whoosh.mp3

11) Accuracy & fairness guardrails

Moderation: If a generated question contains sensitive topics, regenerate with “No sensitive/NSFW/personal topics.”

Recency: For “Recent Events,” always store source and display a small “from: example.com” tooltip.

Repeat-avoidance: Keep a per-session hash of prompts+answers to avoid duplicates.

Determinism: Seed randomness (50:50 removal, poll distribution) per question id for repeatable replays.

12) Testing checklist

JSON schema validation (Joi/Zod) for LLM outputs.

Unit tests for lifeline math & timer (Vitest).

E2E happy path: win the million; E2E fail paths: timeout, wrong after lifeline.

Voice: ensure TTS queues don’t overlap with SFX (gate with a simple audio bus).

13) Repo layout
next-millionaire/
  apps/
    web/               # React + Vite + TS + Tailwind
      src/
        App.tsx
        components/
        state/
        sfx/
      index.html
      vite.config.ts
    api/               # Node/Express proxy to internal LLMs
      src/
        server.ts
        routes/
          question.ts
          lifelines.ts
          speak.ts
        llm/
          chat.ts       # wraps Chat, Analyze, Ask Web/Source
          validate.ts
      package.json
  package.json
  pnpm-workspace.yaml
  README.md
