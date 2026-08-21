# AGENTS.md

## Purpose

This file defines how Codex should work in the BasketballLife repository. The goal is to reduce common LLM coding mistakes: unjustified assumptions, unnecessary refactors, speculative features, over-engineering, oversized diffs, production risk, and unverified claims.

These rules favor correctness, clarity, minimal change, and production safety over raw speed. For trivial low-risk tasks, use reasonable judgment and avoid unnecessary ceremony.

---

## 1. Core Engineering Behavior

### Do not assume

- Do not silently guess what the user means.
- State material assumptions when they affect implementation.
- If multiple interpretations are plausible, surface them instead of silently choosing one.
- If an ambiguity materially affects correctness or safety, identify it before implementation.
- If a simpler solution exists, say so.
- Communicate meaningful tradeoffs explicitly.
- Do not hide uncertainty or confusion.
- Do not invent requirements just to keep moving.

For small, obvious, low-risk tasks, use judgment and do not ask unnecessary questions.

### Prefer the simplest correct solution

- Do not add features that were not requested.
- Do not add speculative functionality.
- Do not add unnecessary configurability or flexibility.
- Do not create abstractions for one-off code unless they clearly reduce complexity.
- Do not build extension points for hypothetical future needs.
- Prefer straightforward code over clever code.
- Prefer existing project patterns over new architecture.

Ask:

> Would a senior engineer consider this implementation unnecessarily complicated?

If yes, simplify it.

If a 200-line solution can reasonably be expressed in 50 clear lines, rewrite it.

### Make the smallest necessary change

Every changed line should be traceable to the user's request or to something directly required for that request to work.

When editing existing code:

- Modify only the necessary files and sections.
- Do not improve adjacent code merely because you noticed it.
- Do not reformat unrelated code.
- Do not rewrite unrelated comments.
- Do not refactor working code unless the task requires it.
- Preserve existing style even if you personally prefer another style.
- Avoid broad mechanical changes unless explicitly requested.

If your own change makes an import, variable, function, or temporary helper obsolete, remove that newly obsolete code. Do not delete unrelated existing dead code unless the user asks; mention it separately instead.

---

## 2. Define Success Before Coding

Convert the request into concrete, verifiable outcomes.

Examples:

- `Add validation` → identify or add invalid-input coverage, implement the minimum validation, verify invalid input fails and valid input still succeeds.
- `Fix this bug` → reproduce it where practical, apply the smallest fix, verify the reproduction no longer fails.
- `Refactor X` → establish current observable behavior/tests, refactor without changing behavior, verify the same behavior afterward.

For multi-step work, provide a short plan:

```text
1. [Step] → Verify: [check]
2. [Step] → Verify: [check]
3. [Step] → Verify: [check]
```

Do not create a long plan for a trivial local change.

Implementation is not complete until the relevant behavior has been checked. Use the narrowest verification that gives confidence: targeted tests, type checks, lint, build, focused runtime checks, or direct reproduction.

Do not claim something is fixed, working, deployed, or verified unless it was actually verified. If verification is not possible, state what was changed, what was not verified, why, and what would confirm it.

---

## 3. Scope Control

Do not:

- redesign unrelated UI
- rename unrelated symbols
- rewrite nearby functions
- update dependencies without need
- change public APIs unnecessarily
- reorganize folders without need
- introduce new libraries when existing code is sufficient
- add logging, telemetry, caching, retries, abstractions, or compatibility layers unless required

Before adding anything not explicitly requested, ask:

> Is this strictly necessary for the requested behavior?

If not, leave it out.

Unless the user explicitly asks for a broader behavior change, preserve existing behavior outside the requested area.

Prefer repository conventions: existing utilities, naming, component patterns, error handling, test structure, and dependencies.

Keep diffs reviewable and avoid mixing functional changes with unrelated cleanup.

---

# BasketballLife Project Rules

These repository-specific rules take precedence over general workflow preferences where they conflict.

## 4. Project Identity and Source of Truth

- Project: `BasketballLife`
- Repository: `AKai0013/basketballlife`
- Production branch: `main`
- Production site: `https://basketballlife.pages.dev/`
- Production platform: Cloudflare Pages
- Backend: Cloudflare Pages Functions + D1

The latest remote `main` branch is the only production source of truth.

Before modifying production-related code:

1. Read the latest relevant file(s) from `main`.
2. Confirm the edit is based on the current production version.
3. Do not overwrite current code using old attachments, stale local copies, copied HTML, cached files, or remembered versions.

If local state and `main` differ, determine which changes are current before editing.

> `main` is authoritative.

---

## 5. Production Write Restrictions

Unless the user explicitly authorizes it, do not:

- push or merge to `main`
- deploy production changes
- modify the production version number
- modify `README.md`
- alter production D1 data
- run destructive database operations
- delete leaderboard records
- reset production statistics
- replace production assets globally

Default workflow:

```text
read latest main
→ modify locally / Preview
→ test
→ report exact changes
→ wait for explicit approval
→ publish only after approval
→ verify published result
```

A direct instruction such as `上傳` authorizes publishing the already-described change set. Do not treat vague positive feedback as deployment authorization.

Never perform production-affecting actions silently and mention them only afterward.

---

## 6. Preview-First

For meaningful UI, game-logic, persistence, API, leaderboard, database, or cross-system changes, prefer Preview or an isolated development environment first.

Do not use production as a test environment when a safe Preview path exists.

Low-risk text or styling work may use a narrower workflow, but production write restrictions still apply.

---

## 7. Version and README Policy

Do not change the version number unless explicitly requested.

Do not modify `README.md` unless explicitly requested.

A code fix does not automatically imply:

- version bump
- changelog update
- README update
- release-note rewrite

Keep them separate unless requested.

---

## 8. Model Strategy

When model choice is available:

### GPT-5.3 Codex Spark — default for low-risk work

Use Spark first for:

- CSS / spacing / typography
- responsive layout
- 390px / 430px mobile adjustments
- copy changes
- small HTML edits
- targeted code search
- isolated JavaScript bugs
- single-component fixes
- clearly local non-core changes

Principle:

> Spark-first when the task is safely local.

### GPT-5.6 Sol — high-risk / core engineering

Reserve Sol for:

- Cloudflare Pages Functions
- D1
- API behavior
- leaderboard writes
- production data integrity
- save compatibility
- seed / RNG mechanics
- career simulation core
- schedule generation
- event probability systems
- injury systems
- contracts / free agency / retirement
- BL POWER
- Hall of Fame calculations
- cross-system bugs
- large refactors
- release-level regression work

For medium-risk work, first locate the issue and find the smallest safe change. Continue with Spark if it is truly local; escalate to Sol if core systems or broad consequences are involved.

---

## 9. Risk-Based Testing

### Low risk

Examples: CSS, copy, spacing, isolated display behavior.

Test only the changed area, relevant breakpoint(s), and immediate neighboring behavior.

### Medium risk

Test the changed feature, direct dependencies, adjacent user flow, and likely regression points.

### High risk

For core logic, saves, D1, rankings, simulation, RNG, schedules, retirement, or shared systems:

- run targeted regression tests
- inspect affected data paths
- validate backward compatibility where relevant
- run broader simulations only when justified

Principle:

> Modify as little as possible; test as deeply as the risk requires.

Do not automatically run expensive full-site/full-career regression for every tiny change.

---

## 10. D1 and Leaderboard Safety

Production D1 is high risk. Never use it as a scratch database.

Before a production database write or schema-affecting change:

- identify exact tables
- identify read/insert/update/delete/migration/schema scope
- assess impact on existing V7/V8 records
- prefer reversible or additive changes
- avoid broad updates without restrictive conditions
- verify row targeting before destructive operations

Do not delete suspicious leaderboard records solely based on assumption; report evidence first unless deletion was explicitly requested.

Leaderboard changes are core/high-risk. Consider:

- duplicate submissions
- missing submissions
- V7/V8 separation
- player counts vs career counts
- public-career visibility
- write frequency
- backward compatibility

Do not write test careers into the production leaderboard unless explicitly authorized.

---

## 11. Funnel Analytics

Current V8 safe default:

> Do not write step-by-step funnel events to D1.

Keep funnel progress in browser-local state unless the user explicitly approves server-side analytics.

Possible stages:

```text
home
start
career_created
major_event
retired
share
```

Do not create one D1 write per step.

If server-side aggregation is later approved, prefer one summarized session write instead of repeated per-step writes.

---

## 12. High-Risk Game Systems

The following are high-risk by default:

- career progression
- league transitions
- schedule generation / season length
- event probability
- injuries / medical-pressure events
- contracts / free agency
- retirement / forced retirement age
- RNG / Weekly Seed
- save / load
- BL POWER
- Hall of Fame
- leaderboard submission
- D1 validation

Do not modify these systems during unrelated UI/content work.

Every change to these systems should have explicit success criteria and targeted regression validation.

### Weekly Seed

Preserve deterministic behavior, correct weekly labeling, clear date range and settlement/reset timing, locked-seed behavior where applicable, and separation between tests and production leaderboard data.

Do not change RNG semantics as part of unrelated UI work.

### Save compatibility

Existing saves are user data. Changes to player structure, career state, avatar data, events, leagues, contracts, retirement, or seed state must consider older saves.

Do not casually remove, rename, or reinterpret persisted fields. Maintain compatibility where practical and never silently invalidate existing saves.

### Injury system

Consider frequency, severity, fatigue interaction, risk-taking choices, rewards for playing through injury, body-part/name consistency, long-term consequences, and season/career effects.

Do not globally increase arbitrary probabilities without understanding the surrounding system.

### Contract and retirement

Verify contract expiration, rejected offers, free agency, voluntary retirement, no-offer seasons, domestic returns, older-player continuation, and forced-retirement thresholds.

Do not make one rejected contract automatically equal retirement unless explicitly intended.

### BL POWER and Hall of Fame

Treat calculation changes as high risk. Avoid accidental double counting, especially repeated awards, and preserve historical comparability when practical.

Do not rebalance BL POWER during unrelated work.

---

## 13. UI / Mobile Rules

Important target widths:

- 390px
- 430px
- desktop

When modifying UI:

- verify text does not unexpectedly clip
- verify buttons remain tappable
- verify grids do not collapse incorrectly
- verify important content remains visible
- avoid horizontal overflow
- preserve desktop behavior

Do not redesign unrelated screens during focused UI fixes.

For production images/logos/avatars, confirm the exact asset path and all usage locations before replacement. Do not assume an image file is local to one screen if it may be reused globally.

---

## 14. Cloudflare Pages / Functions

Cloudflare Functions changes are high risk.

Before modifying:

- identify affected route/API
- inspect request and response contracts
- inspect D1 access
- consider production callers
- avoid unnecessary response-shape changes
- avoid additional production writes unless required

Verify relevant success and failure paths.

---

## 15. Completion Report

After BasketballLife work, report concisely:

```text
Changed:
- ...

Not changed:
- version
- README
- production/main (if not authorized)

Verified:
- ...

Risk / remaining issue:
- ...
```

Only include items relevant to the task.

If production was published, state exactly what was published and how it was verified.

If production was not published, explicitly state that `main` remains untouched.

---

## 16. Default Working Loop

```text
Understand
→ identify material ambiguity
→ read latest main
→ define success
→ identify risk
→ choose the simplest solution
→ make the smallest change
→ verify to the appropriate depth
→ report results
→ wait for upload approval when required
→ publish
→ verify production
```

Priority order when rules compete:

1. Explicit user requirements.
2. Correctness, data integrity, and production safety.
3. Preserve existing behavior outside requested scope.
4. Minimum necessary change.
5. Repository conventions.
6. Simplicity.
7. Optional cleanup or elegance.

> Never trade production safety for convenience.

The goal is not to produce the most code. The goal is to make the smallest correct, understandable, reviewable, and verifiable change that satisfies the request without introducing unrelated edits, unnecessary architecture, or unauthorized production risk.
