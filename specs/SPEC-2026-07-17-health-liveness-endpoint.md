# Spec: `GET /health` liveness endpoint   |   Spec ID: SPEC-2026-07-17-health-liveness-endpoint   |   Status: approved
Supersedes: none

_Mode: lightweight — single module (the status service), an additive new HTTP route, no new
cross-module contract, and no new untrusted-input surface. The endpoint consumes no request
input and reaches no dependency._

## Problem & why
pulse-board exposes `/status.json` (version, uptime, last-checked timestamp) and a static status
page, but has no dedicated **liveness** endpoint. Orchestrators, uptime monitors, and load-balancer
health checks want a single, cheap, unambiguous "is this process alive and able to answer?" signal,
not the richer status snapshot. Reusing `/status.json` for that purpose is wrong: it computes and
returns fields a probe does not need, couples the probe to the status payload's evolution (a sibling
spec is already adding a derived `state` field to it), and blurs "the process is up" with "the
service reports itself healthy". A separate `GET /health` gives a stable, minimal contract a probe
can poll frequently. Because the project has no persistence and makes no external calls, there is no
downstream dependency to check — liveness is simply "the event loop is responsive enough to return a
constant body", which is exactly what a liveness (not readiness) probe should assert.

## Goals / Non-goals
- Goal: Add a `GET /health` endpoint that responds `200` with a minimal constant JSON body
  (`{ "status": "ok" }`) whenever the process is running and able to service requests.
- Goal: Keep it deterministic, stateless, and I/O-free — computed from nothing but a constant, so it
  stays the cheapest endpoint in the service.
- Goal: Follow the existing architecture convention — health logic in a dedicated `*-service.ts`,
  the route only reads from that service and shapes the response, and the response shape lives in
  `src/types.ts`.
- Non-goal: This is **liveness**, not readiness — it does not check, and must not add, any
  dependency probe (no DB, no external HTTP, no filesystem), consistent with the project's
  no-persistence rule.
- Non-goal: Not a second copy of `/status.json` — it deliberately omits `version`, `uptimeSeconds`,
  `lastCheckedAt`, and the sibling spec's `state` field. Enriching the health body is out of scope.
- Non-goal: No front-end change — the static status page keeps talking only to `/status.json`; the
  health endpoint is for machine probes.
- Non-goal: No authentication, rate limiting, or per-method handling beyond `GET` (the framework's
  default behaviour for other methods stands).

## User stories
- As an uptime monitor / orchestrator, I want a single cheap endpoint that returns `200` while the
  process is alive, so that I can detect an unresponsive process without parsing the status payload.
- As an operator, I want liveness kept separate from the status snapshot, so that changes to
  `/status.json` never alter the probe contract my tooling depends on.

## Acceptance criteria (EARS)
- AC-1: WHEN a client sends `GET /health`, the system **shall** respond with HTTP status `200` while
  the process is running and able to service requests.
  _(observable: `app.inject({ method: "GET", url: "/health" })` → `res.statusCode === 200`)_
- AC-2: WHEN a client sends `GET /health`, the system **shall** return a JSON body deep-equal to
  `{ "status": "ok" }` — no additional fields.
  _(observable: `res.json()` deep-equals `{ status: "ok" }`)_
- AC-3: WHEN a client sends `GET /health`, the system **shall** respond with a JSON content-type.
  _(observable: `res.headers["content-type"]` matches `/application\/json/`)_
- AC-4: The system **shall** produce the health response from process-local constant state only,
  performing no database access, filesystem access, or external network call.
  _(observable: the health service function returns synchronously without awaiting any external
  resource; a unit test calls it directly and asserts the returned value)_
- AC-5: WHILE the process is running, the system **shall** return the byte-identical
  `{ "status": "ok" }` body for every `GET /health` request, independent of uptime, request count,
  or concurrent invocation.
  _(observable: two concurrent/sequential injects return identical status code and body)_

## Edge cases
- Non-`GET` method on `/health` (e.g. `POST /health`) → accepted: no custom handling; the framework's
  default response for an unregistered method/path stands (Fastify returns `404`). Not part of the
  liveness contract.
- Query string on the request (e.g. `/health?probe=1`) → ignored; response is still `200` with
  `{ "status": "ok" }` → AC-2, AC-5.
- Request body sent on `GET /health` → ignored; no input is consumed → AC-2.
- Concurrent probes at high frequency → AC-5 (deterministic, stateless, safe).
- External dependency failure → accepted: no dependency exists by design; there is nothing to fail.
- Process deadlocked / crashed / event loop blocked → accepted: no in-process handling. The endpoint
  cannot answer, so the probe times out or the connection fails — that unreachability **is** the
  intended negative liveness signal, not a `200` with an error body.

## Assumptions
- Assumed the response body is exactly `{ "status": "ok" }` with `status` typed as the string
  literal `"ok"` (added to `src/types.ts`, e.g. a `HealthSnapshot` shape), and that it carries no
  timestamp, uptime, or version — those belong to `/status.json`. Say so if a richer probe body is
  wanted (which would push this toward readiness and out of the current scope).
- Assumed the path is exactly `/health` (no `/healthz`, no `/health.json`, no version prefix) — say
  so if a different path convention is required.
- Assumed liveness semantics (always `200` while responsive), not readiness — no `503`/degraded
  branch, since there is no dependency to gate on. Say so if a readiness variant is actually wanted.
- Assumed the existing service/route/types layering convention from CLAUDE.md is binding: the health
  computation lives in its own `*-service.ts`, the route only reads from it and shapes the response,
  and the shape is shared via `src/types.ts`.

## Open questions
- None.
