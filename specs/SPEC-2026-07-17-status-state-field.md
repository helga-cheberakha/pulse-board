# Spec: Derived health `state` field on the status payload   |   Spec ID: SPEC-2026-07-17-status-state-field   |   Status: approved
Supersedes: none

_Mode: lightweight — single module (the status service plus its paired static front end), no new
cross-module contract beyond the existing `/status.json` shape gaining one additive field, and no
new untrusted-input surface._

## Problem & why
Today `/status.json` reports `version`, `uptimeSeconds`, and `lastCheckedAt`, and the front-end
pulse dot only distinguishes "reachable" (green, pulsing) from "unreachable" (red, when the fetch
fails). There is no signal of whether the running process is actually healthy or under strain. A
status board that always shows green while reachable gives false confidence. We want a derived,
machine-readable `state` (`"healthy"` / `"degraded"`) computed fresh from in-process metrics, and a
front-end that colours the pulse dot by that state — so both a human glancing at the board and a
machine polling the endpoint can tell health apart from mere reachability. This must stay stateless
(no stored history, no DB/file), consistent with the project's "no persistence layer" rule.

## Goals / Non-goals
- Goal: Add a derived `state: "healthy" | "degraded"` field to the status payload, computed fresh
  on every request from current in-process metrics.
- Goal: Drive the classification from a single, concrete, testable threshold rule (heap usage
  ratio vs. a configurable threshold — see Assumptions).
- Goal: Colour the existing front-end pulse dot by `state`, keeping the current "unreachable" (red)
  behaviour intact and adding a visually distinct "degraded" (amber) state.
- Goal: Keep the change backward-compatible — existing fields and existing consumers are unaffected.
- Non-goal: No stored history, trend, rolling window, event-loop-lag sampling, or any state that
  persists between requests (would violate the stateless design).
- Non-goal: No database, file storage, or new persistence layer of any kind.
- Non-goal: No new endpoint — this is an additive field on the existing `/status.json`.
- Non-goal: No third `state` value beyond `healthy`/`degraded` (e.g. no `"warning"`/`"critical"`
  tier), no alerting/notification, no history chart.
- Non-goal: No UI framework, no build step, no new front-end dependency (framework-free `public/`
  stays as-is).

## User stories
- As an operator watching the board, I want the pulse dot to turn amber when the process is under
  strain, so that I can distinguish a degraded-but-running service from a healthy or an unreachable
  one at a glance.
- As a machine/consumer polling `/status.json`, I want a `state` field with a stable enum value, so
  that I can react to health programmatically without inferring it from raw metrics.

## Acceptance criteria (EARS)
- AC-1: The system **shall** include a `state` field whose value is exactly `"healthy"` or
  `"degraded"` in every `/status.json` response and in every `getStatus()` result, alongside the
  existing `version`, `uptimeSeconds`, and `lastCheckedAt` fields.
  _(observable: response/return body has `state` ∈ {`"healthy"`,`"degraded"`}; existing fields still present.)_
- AC-2: **WHEN** the process heap usage ratio (`heapUsed / heapTotal`) is strictly below the
  configured degraded threshold, the system **shall** set `state` to `"healthy"`.
  _(observable: unit test with the ratio below threshold yields `"healthy"`.)_
- AC-3: **WHEN** the process heap usage ratio is at or above the configured degraded threshold, the
  system **shall** set `state` to `"degraded"` (the boundary value `ratio == threshold` is degraded).
  _(observable: unit test forcing ratio ≥ threshold — e.g. by configuring a very low threshold — yields `"degraded"`.)_
- AC-4: The system **shall** read the degraded threshold from the `PULSE_DEGRADED_HEAP_RATIO`
  environment variable, and **shall** use a default of `0.9` when that variable is unset.
  _(observable: unset env → threshold 0.9; set env to a valid value → that value is used.)_
- AC-5: **IF** the configured threshold is missing, non-numeric, or outside the range `(0, 1]`,
  **THEN** the system **shall** use the default threshold `0.9`.
  _(observable: env set to `""`, `"abc"`, `"0"`, `"-1"`, or `"2"` all fall back to 0.9; no throw.)_
- AC-6: The system **shall** compute `state` fresh on each request from the current process metrics,
  **without** reading or writing any stored history, file, or database, and **without** mutating any
  shared state between requests.
  _(observable: repeated calls each recompute; no fs/db access in the computation path; concurrent calls do not interfere.)_
- AC-7: **IF** `heapTotal` is `0` or the computed heap ratio is not a finite number, **THEN** the
  system **shall** set `state` to `"healthy"` and **shall not** throw.
  _(observable: unit test with a non-finite ratio returns `"healthy"` without error.)_
- AC-8: **WHEN** `/status.json` returns `state` `"healthy"`, the front-end pulse indicator **shall**
  display the healthy styling (green, pulsing — the current default appearance).
  _(observable: after a healthy poll, the dot element carries healthy styling and no degraded/down styling.)_
- AC-9: **WHEN** `/status.json` returns `state` `"degraded"`, the front-end pulse indicator **shall**
  display the degraded styling (amber), visually distinct from both the healthy (green) and the
  unreachable (red) styling.
  _(observable: after a degraded poll, the dot element carries degraded styling distinguishable from healthy and down.)_
- AC-10: **IF** the `/status.json` request fails (network error or non-OK response), **THEN** the
  front-end **shall** display the existing unreachable styling (red, non-pulsing `down`), preserving
  the current behaviour.
  _(observable: a failed fetch results in the `down` styling exactly as today.)_
- AC-11: **WHERE** `/status.json` is reachable but returns a `state` value other than `"degraded"`
  (including missing or unexpected values), the front-end **shall** fall back to healthy styling.
  _(observable: response with absent/unknown `state` renders healthy styling, never degraded or down.)_

## Edge cases
- Heap ratio exactly equals the threshold → `"degraded"` (`>=` boundary). → AC-3
- `heapTotal == 0` or ratio is `NaN`/`Infinity` → `"healthy"`, no throw. → AC-7
- Threshold env var unset → default `0.9`. → AC-4
- Threshold env var invalid (non-numeric, `<= 0`, or `> 1`) → default `0.9`, no throw. → AC-5
- `/status.json` unreachable / non-OK → front-end shows existing `down` (red) styling. → AC-10
- Response missing `state` or with an unexpected value → front-end shows healthy styling (forward-compatible). → AC-11
- Concurrent requests → each recomputes independently from live metrics; no shared mutable state. → AC-6
- No request body / query input is consumed by this feature → empty/oversized/malformed input surface does not apply. → accepted: no handling (feature reads no caller-supplied input)

## Decisions (confirmed with the user)
- **Classification metric:** the **heap usage ratio** `heapUsed / heapTotal` from
  `process.memoryUsage()` — bounded `0..1`, portable across machines, and deterministically
  testable (not absolute RSS bytes, not an uptime heuristic). Drives AC-2, AC-3, AC-7.
- **Threshold configuration:** operator-configurable via the `PULSE_DEGRADED_HEAP_RATIO` env var
  with a default of `0.9`, so ops can tune it and automated tests can deterministically exercise
  both branches. Drives AC-4, AC-5.
- **Fail-safe direction:** a non-computable ratio (`heapTotal == 0` / non-finite) resolves to
  `"healthy"` (fail-safe, avoids false alarms), since a running Node process effectively never
  reports zero heap. Drives AC-7.

## Assumptions
- Assumed the degraded dot colour is **amber** (distinct from the existing healthy green and the
  unreachable red), chosen so all three states are visually separable. Exact hex is a cosmetic
  implementation detail; the requirement is only distinctness (AC-9).
- Assumed the field is purely additive — the endpoint is not versioned and no existing field
  changes — so current consumers keep working.
- Assumed `PULSE_DEGRADED_HEAP_RATIO` is server/operator configuration (not attacker-controlled) and
  the derived `state` string is the only thing surfaced — the raw threshold is never reflected in
  the response, so no new untrusted-input or information-disclosure surface is introduced.

## Open questions
- [NEEDS CLARIFICATION: Should the degraded dot keep the pulse animation (amber pulse) or render as
  a steady amber dot? Either satisfies AC-9's "visually distinct" requirement; this is a cosmetic
  choice for the implementer/designer.]
