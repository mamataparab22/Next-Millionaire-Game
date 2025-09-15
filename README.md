# Next Millionaire

A sleek, Who Wants to Be a Millionaire–style quiz game built with React + Vite + TypeScript. Climb the 15-step money ladder, use lifelines wisely, and celebrate wins with confetti and fireworks.

## Repository
- GitHub: https://github.com/mamataparab22/Next-Millionaire-Game

## Getting Started

Prerequisites: Node.js 18+ and npm

Using npm (root):
```powershell
# Install dependencies
npm install

# Start the web app (runs Vite dev server)
npm run dev
```

Using npm (directly in the web app):
```powershell
# Install dependencies
npm install --prefix apps/web

# Start the web app
npm run dev --prefix apps/web
```

Open http://localhost:5173 in your browser.

VS Code Task:
- Run task `web: dev` (Terminal > Run Task > web: dev) to start the dev server.

Build & Preview:
```powershell
# Build production assets
npm run build --prefix apps/web

# Preview the production build
npm run preview --prefix apps/web
```

## What This Project Is
- A single-page game (SPA) that mirrors the classic Millionaire flow: 15 questions with increasing difficulty, safety milestones, and lifelines.
- Designed for smooth, celebratory feedback: clapping on correct answers, confetti bursts, and Lottie-based fireworks for milestone wins.
- Fully client-side UI with session persistence so you can leave and resume.

## Main Features
- Question Ladder: 15 questions across easy → medium → hard.
- Lifelines: 50:50, Audience Poll, and Switch Question.
- Timer: Clean circular countdown for the first 10 questions.
- Celebrations: Real clapping SFX, confetti, and fireworks at milestones.
- Accessibility: Keyboard focus styles, ARIA labels, readable contrast.
- SPA Routing: Home → Play → Results.
- Persistence: Saves in-progress game and final results locally.

## How the Project Uses AI
- Question Generation: Uses Azure OpenAI (Chat Completions) to produce structured JSON questions. The prompt includes a randomization nonce and sampling tweaks (temperature/top_p) to increase variety, plus client-side de-duplication.
- Explanations: A helper can generate short, friendly explanations of correct answers.
- Text-to-Speech (TTS):
  - Primary: Calls GPT-4o-mini-tts for OpenAI voices (e.g., Nova/Alloy/Shimmer) or Amazon Polly for other voices.
  - Fallback: Uses the browser’s built-in SpeechSynthesis if remote TTS is unavailable or blocked.

Note: Browsers often require a user gesture before audio can play. If narration doesn’t start, click anywhere in the app or toggle the Narration switch, then proceed.

## What Makes It Unique or Vibey
- Millionaire-Themed Polish: Gradient answer pills, pulsing countdown, prize ladder with milestone pulses.
- Celebratory UX: Crisp clapping sample with fade envelopes, confetti bursts, and full-screen Lottie fireworks on milestones.
- Smart Variety: Prompt engineering + nonce + client-side de-duplication for fresher questions each game.
- GitHub Pages–Friendly: Vite base path support and SPA fallback for easy static hosting.

## Troubleshooting
- No Sound / TTS Not Speaking:
  - Click once in the page (user gesture unlock), ensure Narration is enabled, and try the next question.
  - Some networks may block remote TTS calls; the app falls back to SpeechSynthesis automatically.
- Port Conflicts:
  - If port 5173 is busy, Vite will suggest another; follow the console hint and open the shown URL.

---
Enjoy the climb, and may you become the next millionaire!
