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
  - UI atoms: Button, Card, Modal; theme switched to yellow accents
  - Prize Ladder component and basic highlight logic
  - Minimal game state (types, reducer), wired to Play; sample questions
  - Lifeline 50:50: implemented, hides two wrong answers, disables after use
  - Audience Poll: implemented as dismissible modal with vertical bar chart; filters to remaining options; animated bars; ESC-to-close and focus trap
  - Per-question timer: countdown in UI, auto-fail on timeout; disables interactions
  - Switch Question: refined sourcing implemented; picks unseen question matching current difficulty when available, falls back gracefully; resets timer/state; friendly notice if none
- In Progress
  - Coding standards (ESLint config partially set), accessibility pass (broader app)
  - Game progression polish (ladder checkpoints/leveling rules)
- TODO (near-term)
  - Difficulty scaling and per-level timing tweaks
  - Formalize ESLint/Prettier config and add CI

---

## Phase 0 — Planning & Project Scaffolding
Goal: Establish foundations and shared conventions.

### Completed ✅
- Draft project vision and features in `README.md`
- Create development roadmap (`ROADMAP.md`)
- Choose repo layout (monorepo with npm workspaces)
- Prettier baseline (`.prettierrc`)

### In Progress 🟡
- Define coding standards: TypeScript strictness (enabled in web), ESLint rules (partial)
- Decide on state model: Reducer chosen and implemented minimally

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
- Prize ladder progression and checkpoints (baseline present; refine rules)

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
- Switch Question — basic rotation to next question; resets timer/state

### In Progress 🟡
- —

### TODO ⬜
- Refine Switch sourcing — fetch a truly new question (not yet seen), avoid duplicates, preserve difficulty curve; clear lifeline state as needed
- Enforce per-level availability if rules demand
- Tests for lifeline edge cases

---

## Phase 7 — UI/UX Polish & Accessibility
Goal: Production-ready look-and-feel with inclusive design.

### Completed ✅
- Theme accents updated to yellow to match show feel
- Modal entrance animation (fade/scale) and poll bar grow animations
- Modal accessibility: focus trap and ESC-to-close

### In Progress 🟡
- Broader accessibility sweep (focus management across pages, ARIA landmarks)

### TODO ⬜
- Prize ladder checkpoint visuals improvement, micro-interactions
- Loading/skeleton states for API calls (future)

---

## Next work items (order of attack)
1) Quality gates
  - Finalize ESLint config at repo root and add GitHub Actions CI (build, lint, typecheck) — Implemented
2) Prize ladder checkpoints/leveling rules polish
  - Lock-in amounts at checkpoints; update visuals

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
