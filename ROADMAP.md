# 🚀 Next Millionaire Game — Development Roadmap

This roadmap turns the README vision into a phased, step-by-step plan you can execute. Use the status buckets (Completed, In Progress, TODO) to track progress. Keep this file updated as you work.

Legend: ✅ Completed · 🟡 In Progress · ⬜ TODO

---

## How to use this roadmap
- Update statuses as you progress. Move items between TODO → In Progress → Completed.
- When opening issues/PRs, reference the roadmap item text so history is easy to follow.
- Keep phases sequential where possible, but parallelize safe tasks (e.g., docs, tests, CI).

---

## Phase 0 — Planning & Project Scaffolding
Goal: Establish foundations and shared conventions.

### Completed ✅
- Draft project vision and features in `README.md`
- Create development roadmap (`ROADMAP.md`)

### In Progress 🟡
- —

### TODO ⬜
- Choose repo layout (monorepo vs. multi-app folders) consistent with README structure
- Define coding standards: TypeScript strictness, ESLint + Prettier rules
- Decide on state model: Reducer vs. XState (align with README)
- Define semantic commit and PR guidelines
- Add issue/PR templates and labels (Bugs, Feature, Docs, Good First Issue)
- Add `LICENSE` and `CODE_OF_CONDUCT.md` if not present

---

## Phase 1 — Frontend Foundation (React + Vite + TS + Tailwind)
Goal: Boot a minimal, accessible shell of the game UI.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Scaffold `apps/web` with Vite (React + TypeScript)
- Configure Tailwind CSS and base theme (colors, typography)
- App shell: header, main game stage, sidebar (lifelines), footer
- Route structure: `/` (home), `/play`, `/results`
- Implement responsive layout (mobile-first)
- Set up shared UI atoms: Button, Card, Modal, Progress/Prize Ladder
- Accessibility: focus styles, keyboard nav, ARIA landmarks

---

## Phase 2 — Core Game Engine & State
Goal: Deterministic, testable game state and transitions.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Define domain models: Category, Question, Answer, Lifeline, GameState
- Choose and implement state management (Reducer or XState)
- Prize ladder config and progression logic (checkpoints)
- Timer service with per-question time rules (shorter early questions)
- Question queue management and difficulty scaling
- Persistence for session (resume after refresh)
- Error states and recovery (e.g., API failure → safe fallback)

---

## Phase 3 — Backend API (Express) & Env Config
Goal: Secure API surface for question generation/validation and web proxying.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Scaffold `apps/api` with Express + TypeScript
- Env handling via `.env` and schema validation (zod or env-var)
- Endpoints:
  - `POST /llm/generate` — generate question set by categories + difficulty
  - `POST /llm/validate` — validate answers/questions for consistency
- LLM client abstraction (provider-agnostic)
- Rate limiting and input validation
- Error handling and structured logs
- Local dev proxy for web app; CORS config
- Unit tests for routes and llm client

---

## Phase 4 — AI Integration & Content Safety
Goal: High-quality, safe question generation aligned with categories and difficulty.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Prompt templates for generation and validation (few-shot + rules)
- Difficulty calibration: easy/medium/hard distributions per level
- Category coverage and deduplication
- Current events support (last 12 months) via web search API ("Ask Web")
- Content moderation and safe words filtering
- Deterministic answer encoding (e.g., lettered choices with single truth)
- Telemetry for rejected/low-quality prompts

---

## Phase 5 — Lifelines
Goal: Implement classic lifelines governed by game rules.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- 50:50 — remove two incorrect answers (state + UI)
- Audience Poll — animated results; non-network and Socket.IO real-time variant
- Switch Question — replace current question; preserve difficulty curve
- Enforce per-level availability and single-use constraints
- Tests: edge cases (e.g., already used, no alternatives available)

---

## Phase 6 — Audio & Voice
Goal: Authentic show feel through music, SFX, and spoken host.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Integrate Howler.js with a central AudioManager
- Background music loops and transitions
- SFX triggers for correct/incorrect/lock-in/tension
- Web Speech API / TTS integration for host narration (with user controls)
- Fallbacks for browsers without TTS; mute/volume settings persisted

---

## Phase 7 — UI/UX Polish & Accessibility
Goal: Production-ready look-and-feel with inclusive design.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Visual polish: animations, micro-interactions, suspense moments
- Prize ladder highlight and checkpoint visuals
- Category selection UX (choose 5 of N)
- Loading states and skeletons for API calls
- WCAG AA: color contrast, screen reader cues, focus management

---

## Phase 8 — Testing, QA, and Tooling
Goal: Confidence through automated checks and quality gates.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Unit tests: reducers/XState, utility functions, audio manager
- API tests: route handlers, prompt builder, validators
- E2E tests: Playwright or Cypress happy-path + lifelines
- Linting (ESLint) and formatting (Prettier) scripts
- Git hooks (pre-commit lint/test via Husky)
- GitHub Actions CI: build, lint, test, typecheck

---

## Phase 9 — Build, Release, and Deployment
Goal: Ship to users with reliable environments.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Production builds for web (Vite) and API
- Env strategy for prod/secrets (keys, URLs)
- Deployment targets:
  - Web: Vercel/Netlify
  - API: Render/Fly/Heroku (or serverless)
- Observability: basic logs + error tracking (Sentry)
- Release notes and versioning (Keep a Changelog)
- Smoke tests post-deploy

---

## Phase 10 — Enhancements & Stretch Goals
Goal: Delight users and extend capabilities.

### Completed ✅
- —

### In Progress 🟡
- —

### TODO ⬜
- Localization and i18n for questions/UI
- Save/Resume, profiles, and leaderboards
- Achievements and streaks
- Admin tools: seed curated questions, moderate content
- Analytics (privacy-respecting): engagement, difficulty tuning

---

## Milestones & Suggested Sequencing
1) MVP (Phases 1–3, parts of 4 and 2): playable game with local generation stub
2) Show Feel (Phase 6 + select 7): audio/voice and polish
3) Lifelines (Phase 5): complete feature parity
4) Quality & Launch (Phases 8–9): tests, CI, deploy
5) Stretch (Phase 10): advanced features

---

## Links
- Vision & features: `README.md`
- This plan: `ROADMAP.md`

> Keep commits small, ship iteratively, and update statuses after every PR.

---

## Appendix — LLM Provider Strategy (Gemini now → Internal later)

Goal: Start with Google Gemini for speed-to-MVP while keeping a clean, swappable abstraction to migrate to an internal company LLM with minimal changes.

### Contract (interface-first)
Define a narrow, provider-agnostic interface used by the API layer:

- Inputs: { categories: string[], difficulty: "easy"|"medium"|"hard", count: number, currentLevel: number, seed?: string }
- Outputs: { questions: Array<{ id: string, prompt: string, choices: string[], correctIndex: number, category: string, difficulty: string, explanation?: string }> }
- Methods:
  - generateQuestions(input)
  - validateQuestion(question)
- Error model: { code: "RATE_LIMIT"|"INVALID_PROMPT"|"PROVIDER_ERROR", message, details? }

### Adapter pattern
- Create `LLMClient` interface and two adapters:
  - `GeminiClient` (MVP)
  - `InternalLLMClient` (stub initially)
- Provider chosen at runtime via env: `LLM_PROVIDER=gemini|internal`.
- Keep prompt building separate: `PromptBuilder` returns provider-agnostic strings/JSON schemas.

### Configuration & security
- Server-side only: never expose keys to the browser.
- Env vars:
  - `LLM_PROVIDER=gemini`
  - `GEMINI_API_KEY=...`
  - `INTERNAL_LLM_BASE_URL=...` (future)
  - `INTERNAL_LLM_API_KEY=...` (future)
- Add zod/env-var schema validation with clear startup errors.

### Output format discipline
- Prefer structured outputs (JSON) with schema validation; fall back to robust text parsing when JSON mode is unavailable.
- Create golden tests for prompt+parse routines to detect regressions when swapping providers.

### Capability matrix (track & adapt)
- Compare: max tokens, JSON mode, function/tool calling, streaming, safety filters, rate limits.
- Implement shims where needed (e.g., manual JSON enforcement if provider lacks it).

### Observability
- Redact and log: latency, tokens used, rate-limit hits, validation failures.
- Add sampling for prompt/response pairs (PII-safe) to evaluate quality across providers.

### Migration steps
1. Implement `LLMClient` interface + `GeminiClient` adapter.
2. Build `PromptBuilder` with templates for generation/validation and golden tests.
3. Wire API routes (`/llm/generate`, `/llm/validate`) to `LLMClient` via DI/factory.
4. Add feature flag/env switch `LLM_PROVIDER` and boot-time logs of active provider.
5. Create `InternalLLMClient` stub with mocked responses; run integration tests using the same golden tests.
6. Add a provider conformance test suite to ensure both adapters meet the contract.
7. Staging trial: route small % of traffic to internal LLM (if infra supports) or A/B in QA.
8. Measure quality, latency, error rates; tune prompts and parsing as needed.
9. Cutover: switch `LLM_PROVIDER=internal` in staging → prod; monitor SLOs.

### Rollback plan
- Keep both adapters deployable; switching is a config change only.
- If error budget is breached or validation fails spike, revert `LLM_PROVIDER` to `gemini`.

### Roadmap checkboxes (map to phases)
- Phase 3 (Backend):
  - ⬜ Define `LLMClient` interface and factory
  - ⬜ Implement `GeminiClient` + env validation
  - ⬜ Add `InternalLLMClient` stub and tests
  - ⬜ Rate limiting, retries with backoff, and error normalization
- Phase 4 (AI Integration):
  - ⬜ Prompt templates + golden tests
  - ⬜ JSON schema validation for outputs
  - ⬜ Capability matrix documented and gaps addressed
- Phase 8 (Testing/CI):
  - ⬜ Conformance tests run in CI for both adapters (stubbed for internal)
  - ⬜ Telemetry assertions (latency budgets) in smoke tests
- Phase 9 (Release):
  - ⬜ Feature flag rollout and monitoring dashboards
  - ⬜ Rollback procedure documented in `OPERATIONS.md`
