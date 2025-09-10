# 🚀 Next Millionaire Game — Development Roadmap

This roadmap turns the README vision into a phased, step-by-step plan you can execute. Use the status buckets (Completed, In Progress, TODO) to track progress. Keep this file updated as you work.

Legend: ✅ Completed · 🟡 In Progress · ⬜ TODO

---

## How to use this roadmap
- Update statuses as you progress. Move items between TODO → In Progress → Completed.
- When opening issues/PRs, reference the roadmap item text so history is easy to follow.
- Keep phases sequential where possible, but parallelize safe tasks (e.g., docs, tests, CI).

---

## Progress snapshot — 2025-09-10

- Completed
  - Repo layout established (workspaces) and web app scaffolded (Vite + React + TS + Tailwind)
  - App shell and routing (Header, Layout, Home/Play/Results, NotFound)
  - UI atoms: Button, Card, Modal; theme accents
  - Prize Ladder component with highlight logic and checkpoint visuals
  - Core game state (types, reducer) wired to Play; sample questions across difficulties
  - Lifelines: 50:50, Audience Poll (modal), and Switch Question with refined sourcing (unseen same-difficulty, graceful fallbacks)
  - Per-question timer with auto TIME_UP → incorrect; disables interactions
  - Difficulty scaling + per-level timing (easy/medium/hard for levels 1–5/6–10/11–15)
  - Quality gates: root ESLint/Prettier and GitHub Actions CI (lint, typecheck, build, tests)
  - Prize ladder checkpoints (5, 10), safe winnings, game-over flow, Results page
  - UX polish: checkpoint pulse animation, confetti burst, and chime on crossing checkpoints
  - Walk Away action: keep current winnings and end game
  - Session persistence: versioned snapshot restore (HYDRATE), autosave/clear on game over
  - Backend: migrated to Python FastAPI with /health, /categories, /questions
  - Frontend API integration: Play fetches questions with loading banner and fallback notice when API unavailable; Home loads categories dynamically with its own loading/fallback banners
  - Dev experience: PowerShell script dev.ps1 to run API + Vite together (sets VITE_API_BASE)
- In Progress
  - Expand unit tests for lifeline edge cases, checkpoints, endgame
- TODO (near-term)
  - API enhancements: shuffle choices, seedable randomness, richer content source
  - Additional tests (switch fallback message, final level, dynamic categories path)
  - Accessibility sweep and ARIA landmarks
  - Deployment docs and hosting setup (web + API)

---

## Phase 0 — Planning & Project Scaffolding
Goal: Establish foundations and shared conventions.

### Completed ✅
- Draft project vision and features in `README.md`
- Create development roadmap (`ROADMAP.md`)
- Choose repo layout (monorepo with npm workspaces)
- Prettier baseline (`.prettierrc`)

### In Progress 🟡
-

### TODO ⬜
- Define semantic commit and PR guidelines
- Add issue/PR templates and labels
- Add `LICENSE` and `CODE_OF_CONDUCT.md`

---

## Phase 1 — Frontend Foundation (React + Vite + TS + Tailwind)
Goal: Boot a minimal, accessible shell of the game UI.

### Completed ✅
- Scaffold `apps/web` with Vite (React + TypeScript)
- Configure Tailwind CSS and base theme (yellow accent)
- App shell: Header, Layout, Footer area (via Layout container)
- Route structure: `/`, `/play`, `/results`, fallback 404
- Shared UI atoms: Button, Card, Modal, Prize Ladder
- Responsive layout for Play (stage + sidebar)

### In Progress 🟡
- Accessibility: focus styles, keyboard nav, ARIA landmarks

### TODO ⬜
- Additional polish and loading states

---

## Phase 2 — Core Game Engine & State
Goal: Deterministic, testable game state and transitions.

### Completed ✅
- Define domain models (Question, GameState, Lifeline flags)
- Implement reducer: select, lock-in, next; 50:50 logic; current level updates
- Wire state to UI (Play page); sample question data
- Timer service: per-question countdown, auto TIME_UP → incorrect; UI countdown

### In Progress 🟡
- Minor polish to prize ladder visuals and edge-case rules

### TODO ⬜
- Question queue management and difficulty scaling
- Persistence for session (resume after refresh)
- Error states and recovery

---

## Phase 5 — Lifelines
Goal: Implement classic lifelines governed by game rules.

### Completed ✅
- 50:50 — removes two incorrect answers; disables once used; reflected in UI
- Audience Poll — dismissible modal; vertical bars; filters to non-eliminated options; animated; ESC/Focus trap
- Switch Question — refined sourcing (unseen same-difficulty with graceful fallbacks); resets timer/state and sets friendly notice if none

### In Progress 🟡
- —

### TODO ⬜
- Enforce per-level availability if rules demand (optional rule variant)
- Tests for lifeline edge cases

---

## Phase 7 — UI/UX Polish & Accessibility
Goal: Production-ready look-and-feel with inclusive design.

### Completed ✅
- Theme accents updated to match show feel
- Modal entrance animation (fade/scale) and poll bar grow animations
- Modal accessibility: focus trap and ESC-to-close
- Checkpoint pulse animation, confetti burst, and chime on checkpoint
- Loading/fallback banners for API interactions (Play + Home)

### In Progress 🟡
- Broader accessibility sweep (focus management across pages, ARIA landmarks)

### TODO ⬜
- Further prize ladder micro-interactions
- Broader accessibility and keyboard nav

---

## Next work items (order of attack)
1) Accessibility sweep (high impact, low risk)
  - Landmarks, focus management, keyboard navigation across Play and modals
2) Testing & reliability improvements
  - Add unit tests for: checkpoints edge cases (5/10), final level completion, switch fallback message, dynamic categories path
3) API enhancements for question quality (medium)
  - Shuffle choices, seedable randomness, richer content source; maintain difficulty curve

---

## Appendix — LLM Provider Strategy (future; optional)

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
  - ⬜ Define optional `LLMClient` interface and factory (future)
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
