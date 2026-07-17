# Implementation Plan: GET /health liveness endpoint

## Overview
Add a dedicated `GET /health` liveness endpoint to pulse-board that returns a constant
`200 { "status": "ok" }` while the process can service requests. It follows the existing
service/route/types layering: health logic in `src/health-service.ts`, an HTTP route in
`src/routes/health.ts` that only reads the service and shapes the response, and the shape shared
via `src/types.ts`. Liveness only — no dependency probe, no persistence, no front-end change.

## Execution mode
multi-agent (parallel) — **assumed default; confirm** (see Open questions Q1). The interactive
question tool is unavailable inside a subagent, so this was chosen, not user-confirmed. It fits the
stated context: this feature and the sibling `status-state-field` feature are built concurrently on
one branch (`feature/status-uptime-and-health`), which makes non-overlapping `Owned paths` a real
correctness constraint. Note: within *this* plan the three tasks form a near-linear chain
(T1 → T2 → T3), so almost all realizable parallelism is *across* the two features, not inside this
one. If you would rather run this feature top-to-bottom in one pass, switch to single-agent — the
task list is unchanged, only the dispatch differs.

## Requirements (verified)
- Source: `specs/SPEC-2026-07-17-health-liveness-endpoint.md` (approved) — ACs: AC-1..AC-5
- Spec is lightweight, single-module, additive; its "Open questions" section is `None` and all
  Assumptions are internally resolved. No deltas or disputes — the plan implements the ACs as written.

## Open questions & recommendations
- Q1: Execution mode → default: **multi-agent (parallel)**. Could not prompt (subagent context).
  Single-agent is an equally valid fit given the near-linear DAG; flip if preferred.
- Rec: Keep `src/types.ts` edits append-only in both this plan and the sibling `status-state-field`
  plan (add new interfaces below existing ones; never reorder or rewrite `StatusSnapshot`). This
  keeps the two features' edits to the shared file trivially mergeable and non-conflicting.
- Rec: Register the health route as its own Fastify plugin (`healthRoutes`), mirroring
  `statusRoutes`, rather than adding a bare `app.get` in `app.ts` — preserves the composition-root
  convention (`app.ts` wires plugins; routes live in `src/routes/*`).

## Affected modules & contracts
- pulse-board (single module) — adds one service, one route plugin, one type, one route
  registration line, and one test file.
- Contracts: one new shared shape `HealthSnapshot` added to `src/types.ts` (the existing shared
  types file). No new cross-module contract; the shape is internal to this service.

## Shared touch point (cross-feature callout)
`src/types.ts` is touched by **both** this feature and the sibling `status-state-field` feature
(spec `specs/SPEC-2026-07-17-status-state-field.md`), which are planned and implemented separately
on the same branch. Consequences the orchestrator must honour:
- This plan's **T1** owns `src/types.ts` exclusively *within this plan*. No other task in this plan
  touches it.
- Across the two plans, T1 and the sibling's type-adding task **must not run concurrently** — they
  edit the same file on the same branch with no worktree isolation. Serialize them (run one, then
  the other) or make one depend on the other. Both edits are additive (append a new interface), so
  serialized they compose cleanly; run concurrently they will collide.
- No other file in this plan (`src/health-service.ts`, `src/routes/health.ts`, `src/app.ts`,
  `test/health.test.ts`) overlaps the sibling feature, which changes `src/status-service.ts`,
  `src/routes/status.ts` and `public/*`.

## Architecture changes
- `src/types.ts` (core / shared shapes) — add `HealthSnapshot` interface: `{ status: "ok" }` with
  `status` typed as the string literal `"ok"`.
- `src/health-service.ts` (application / service layer) — new. Exports `getHealth(): HealthSnapshot`
  returning a constant `{ status: "ok" }`. Pure, synchronous, no I/O — the cheapest endpoint.
- `src/routes/health.ts` (transport layer) — new. Exports `healthRoutes(app)` registering
  `app.get("/health", ...)` that reads `getHealth()` and returns it. No logic in the handler.
- `src/app.ts` (composition root) — register `healthRoutes` alongside `statusRoutes`.

## Phased tasks

### Phase 1 — Contract
- **T1**
  - **Action:** In `src/types.ts`, append a new exported interface `HealthSnapshot` with a single
    field `status` typed as the string literal `"ok"`. Append it *below* the existing
    `StatusSnapshot` interface; do not modify, reorder, or rewrite `StatusSnapshot`.
  - **Module:** pulse-board
  - **Type:** core
  - **Skills to use:** typescript-expert (string-literal type for a constant contract)
  - **Owned paths:** `src/types.ts`
  - **Depends-on:** none
  - **Covers:** AC-2, AC-4, AC-5
  - **Risk:** low
  - **Known gotchas:** Shared cross-feature file — see "Shared touch point". Append only; must not
    run concurrently with the sibling feature's `src/types.ts` edit on this branch.
  - **Acceptance:** `npm run typecheck` passes; `src/types.ts` exports both `StatusSnapshot`
    (unchanged) and a new `HealthSnapshot` whose `status` is the literal `"ok"` (not `string`).

### Phase 2 — Service, route, and wiring
- **T2**
  - **Action:** (1) Create `src/health-service.ts` exporting `getHealth(): HealthSnapshot` that
    returns a constant `{ status: "ok" }` — synchronous, no `await`, no I/O, no module-level clock
    or counter. Import the type from `./types.js` (ESM `.js` extension per project convention).
    (2) Create `src/routes/health.ts` exporting `async function healthRoutes(app: FastifyInstance)`
    that registers `app.get("/health", async () => getHealth())`, mirroring `src/routes/status.ts`.
    Import `getHealth` from `../health-service.js`. (3) In `src/app.ts`, register the new plugin with
    `app.register(healthRoutes)` next to the existing `app.register(statusRoutes)`, adding the
    corresponding import.
  - **Module:** pulse-board
  - **Type:** backend
  - **Skills to use:** fastify-best-practices (route-as-plugin, handler returns object → Fastify
    serializes as `application/json`), onion-architecture (route reads service only; service holds no
    transport concerns), typescript-expert
  - **Owned paths:** `src/health-service.ts`, `src/routes/health.ts`, `src/app.ts`
  - **Depends-on:** T1
  - **Covers:** AC-1, AC-2, AC-3, AC-4, AC-5
  - **Risk:** low
  - **Known gotchas:** ESM relative imports carry the `.js` extension even though sources are `.ts`.
    `src/app.ts` (`buildApp()`) must stay listener-free so tests can `app.inject()`. Do not add a
    body/query schema — the endpoint consumes no input. Content-type is satisfied automatically by
    returning a plain object (no need to set headers manually).
  - **Acceptance:** `npm run typecheck` passes. Manual/inject check (formalised in T3):
    `GET /health` → `200`, body deep-equals `{ status: "ok" }`, `content-type` matches
    `/application\/json/`.

### Phase 3 — Tests
- **T3**
  - **Action:** Create `test/health.test.ts` with two describe blocks mirroring the existing test
    style (`vitest`, `buildApp().inject`). (a) Unit: import `getHealth` from
    `../src/health-service.js`, assert it returns deep-equal `{ status: "ok" }` synchronously
    (AC-4). (b) Integration via `buildApp()` + `app.inject`: assert `GET /health` returns
    `statusCode === 200` (AC-1), `res.json()` deep-equals `{ status: "ok" }` (AC-2),
    `res.headers["content-type"]` matches `/application\/json/` (AC-3), and that two
    sequential injects return byte-identical status and body (AC-5). Optionally assert
    `POST /health` → `404` (edge case; framework default).
  - **Module:** pulse-board
  - **Type:** backend
  - **Skills to use:** fastify-best-practices (testing with `inject()`), typescript-expert
  - **Owned paths:** `test/health.test.ts`
  - **Depends-on:** T2
  - **Covers:** AC-1, AC-2, AC-3, AC-4, AC-5
  - **Risk:** low
  - **Known gotchas:** Import from `../src/health-service.js` (ESM `.js`). Vitest discovers
    `test/*.test.ts` (see existing `test/app.test.ts`, `test/status.test.ts`) — match that path and
    `.test.ts` suffix or the file will not run. Use `toEqual` for deep-equality, not `toBe`.
  - **Acceptance:** `npm test` passes with the new `test/health.test.ts` green and all five ACs
    asserted; existing status/app tests remain green.

## Testing strategy
- Unit + integration in one file, `test/health.test.ts`, run with `npm test` (vitest).
  - Unit: `getHealth()` returns `{ status: "ok" }` synchronously — covers AC-4.
  - Integration: `buildApp().inject({ method: "GET", url: "/health" })` — covers AC-1, AC-2, AC-3,
    AC-5 (repeat inject for determinism).
- Typecheck: `npm run typecheck` (`tsc --noEmit`) must pass after T1 and T2.
- Full gate before commit: `npm test` (must pass per CLAUDE.md).

## Risks & mitigations
- Concurrent `src/types.ts` edits with the sibling feature on the same branch → collision.
  Mitigation: serialize the two type-adding tasks (append-only), per "Shared touch point".
- Over-enrichment drift (adding uptime/version/timestamp to the health body) → violates spec
  non-goals. Mitigation: `HealthSnapshot` is exactly `{ status: "ok" }` and tests assert deep
  equality with no extra fields (AC-2).
- Accidental readiness creep (adding a dependency/`503` branch) → out of scope. Mitigation: service
  is a pure constant; AC-4 unit test asserts synchronous, I/O-free return.

## Red-flags check
- [x] Every requirement maps to a task (AC-1..AC-5 → T1/T2/T3)
- [x] Every AC-N from the spec is covered by at least one task's `Covers`
- [x] No specification was authored or edited — the spec is input only
- [x] Execution mode is recorded (multi-agent, assumed default; flagged as Q1) and the plan is shaped for it
- [x] Dependencies form a DAG (T1 → T2 → T3; no cycles)
- [x] (multi-agent) Concurrent tasks have non-overlapping Owned paths — within this plan tasks are
      sequential; the only cross-feature overlap (`src/types.ts`) is called out and must be serialized
- [x] Every Acceptance is measurable (typecheck result, test name/command, deep-equal body, status code)
- [x] No edits to existing shared contracts without an explicit callout (`StatusSnapshot` untouched; `src/types.ts` shared-touch-point callout provided)
- [x] No AC prose restated from the spec (referenced by ID; ACs cited, not copied)
- [x] No task `Action` has 10+ numbered steps; no sub-5-minute sibling tasks left unmerged (service+route+wiring bundled in T2)
- [x] Every cross-cutting Owned path is grep-verified — `src/app.ts` registration point confirmed
      (`app.register(statusRoutes)` at src/app.ts:15); `src/types.ts` confirmed to hold only `StatusSnapshot`
- [x] No deleted/narrowed shared symbols (all changes are additive) — consumer sweep n/a
- [x] New test file matches the discovering glob — `test/*.test.ts` (matches existing test files)
