# 🎯 Next Millionaire Game

An open-source web quiz game inspired by "Who Wants to Be a Millionaire?" with classic lifelines, a prize ladder, timers, and a simple Python API.

## 🌟 Overview

This app recreates the core Millionaire gameplay: 15 questions, increasing difficulty, lifelines (50:50, Audience Poll, Switch), prize ladder with safe checkpoints, and a results screen. The frontend can use a local Python FastAPI service for questions or fall back to built-in samples. Categories are loaded dynamically from the API when available.

## ✨ Features

- Classic lifelines: 50:50, Audience Poll (modal), Switch Question
- Prize ladder with checkpoints (Q5 and Q10), safe winnings, and results page
- Per-question timers with difficulty scaling (easy/medium/hard)
- Difficulty-aware question progression and refined Switch sourcing (unseen if possible)
- Category selection on Home; dynamic /categories fetch with loading/fallback banners
- Play page fetches /questions with a loading banner; falls back to local samples if API is unavailable
- Session persistence: resume after refresh; New Game clears saved session
- CI with lint, typecheck, build, and tests

## 🚀 Get started

### Prerequisites
- Python 3.10+
- npm or pnpm (for the web app)

### Install dependencies
```powershell
# from repo root
npm install
# or
pnpm install
```

### Run (Windows PowerShell)
You can run both API and web together via the helper script:

```powershell
./dev.ps1
# Optional params: -ApiPort 5177 -WebPort 5173 -ViteApiBase http://localhost:5177
```

This starts:
- FastAPI on http://localhost:5177
- Vite dev server on http://localhost:5173 with VITE_API_BASE set

If you only want the API:

```powershell
cd apps/api
python -m venv .venv
./.venv/Scripts/Activate.ps1
python -m pip install --upgrade pip
pip install -e .
api-dev
```

Point the web app at the API by setting an env var when running Vite or via `apps/web/.env`:

```
VITE_API_BASE=http://localhost:5177
```

### Useful scripts

Root (workspaces):
- `npm run dev` — run all workspace dev scripts (requires npm/pnpm installed)
- `npm run build` — build all
- `npm run lint` — lint across workspaces
- `npm run typecheck` — typecheck web
- `npm run test` — run tests

Web (apps/web):
- `npm --prefix apps/web run dev`
- `npm --prefix apps/web run build`
- `npm --prefix apps/web run test`

API (apps/api):
- See the section above for Python commands

## �️ Tech stack

- Frontend: React + Vite + TypeScript + Tailwind CSS
- State: Typed reducer (lifelines, timers, winnings, persistence)
- Backend: Python FastAPI (endpoints: GET /health, GET /categories, POST /questions)
- Tests: Vitest (jsdom)
- CI: GitHub Actions (lint, typecheck, build, tests)

## 🧩 Gameplay notes

- 15-question ladder with checkpoints at 5 and 10
- Time budgets: easy 30s, medium 45s, hard 60s
- Switch selects an unseen same-difficulty question if available; otherwise falls back and shows a friendly notice

## 🧪 Testing

```powershell
npm --prefix apps/web run test
```

## 📜 Roadmap

See `ROADMAP.md` for detailed phases and next work items (accessibility and expanded tests are next).

## 📄 License

MIT — see `LICENSE`.

## � Acknowledgments

Inspired by the classic TV show. Built with modern web tooling and a simple Python API.
