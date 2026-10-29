---
name: harness
description: Run a bounded, plan-first coding task in this repository with acceptance checks and an evidence-based handoff. Use for an explicit harness run or a multi-step task that requires planning and verification artifacts, not an ordinary one-step edit.
metadata:
  short-description: Plan-first coding with verified handoff
---

# Harness

Use this skill for non-trivial work that needs planning, implementation, verification, and durable project memory. Do not use it for a one-step answer, a simple file read, or a tiny edit with no meaningful acceptance checks.

## Intake

Extract these fields from the user request and repository context:

| Field | Meaning |
| --- | --- |
| `TASK` | The concrete outcome to deliver |
| `OUTPUT` | Files or directories that must exist when finished |
| `CHECKS` | Commands, tests, builds, or observable evidence that define acceptance |
| `SOURCES` | Repository files, docs, logs, or external sources that constrain the work |
| `SCOPE` | Files and directories that may change |
| `LIMIT` | Maximum retries, time, or other stopping condition |

If `TASK` is unclear, ask one focused question. If the other fields are absent, infer conservative defaults from the request and existing project conventions, then record material assumptions in `plan.md`. Do not block on information that does not change the result.

## Context and deterministic rules

- Load only the sources needed for the current step. Do not preload the whole repository when a targeted search or file read is enough.
- Keep long command output out of the main context. Record the command, exit status, and relevant excerpt in `checks.md` or `progress.md`.
- If a rule must apply every time, such as formatting, linting, type checking, or blocking a path, use an existing deterministic script or package command and include it in the checks. Do not rely on memory or repeated prose instructions.
- Do not change global Codex configuration, shell profiles, or user-level hooks unless the user explicitly asks.

## Codex operating rules

- Read applicable `AGENTS.md` files from the repository root through the current directory before editing. Also read instructions for each file you touch.
- Inspect `git status` and the relevant existing files before changes. Preserve unrelated worktree changes.
- Follow the active sandbox and approval policy. Ask before actions that need additional permission; never bypass a restriction.
- Use `apply_patch` for file edits and the available shell tools for inspection and checks.
- Do not commit, push, deploy, publish, send external messages, make purchases, incur costs, install dependencies, or change secrets unless the user explicitly asks.
- Do not spawn subagents unless the user explicitly asks or applicable `AGENTS.md` instructions authorize delegation. If allowed, assign disjoint files or read-only investigations and keep the blocking work local.
- Keep changes inside `SCOPE`. If a correct fix requires leaving it, stop and ask before editing outside the boundary.
- Never let two workers edit the same file. Do not edit generated or vendored files unless the task requires it.

## Workflow

### 1. Plan

Write `plan.md` with one row or section per step. For every step, list:

- The files to read and write.
- The observable output.
- The check that proves the step is complete.
- Whether the step can run in parallel without sharing writable files.

For multi-step implementation, present the plan and pause for approval before editing unless the user already approved execution or explicitly asked to proceed without a plan gate.

### 2. Execute

Make small, coherent changes. Update `progress.md` after each phase with what changed, the latest evidence, decisions, blockers, and the next step.

When a check fails, retry only the failed step. Pass the failure evidence, the narrow correction scope, and the original acceptance check back into the retry. Limit a step to three attempts unless the user approves more. Do not rerun an unchanged failing command indefinitely.

### 3. Verify

Run every acceptance check against the final code, not an earlier revision. Write `checks.md` with this table:

```text
step | requirement | verdict | evidence
```

Use `pass`, `fail`, or `unresolved`. Evidence must identify the actual command, exit status, test result, log, or artifact. Do not mark a check as pass when no suitable check exists; record `unresolved` and explain the gap.

### 4. Record durable rules

Update `AGENTS.md` only when the run produced a reusable, non-obvious rule that should change future work. Preserve existing content, avoid duplicates, and keep the rule scoped to the directory where it applies.

If no `AGENTS.md` exists, create one only when the rule is durable and the user permits repository instruction changes. Do not store transient task details or one-off fixes there.

### 5. Complete

Confirm all of the following:

- Every declared `OUTPUT` exists and can be opened.
- Every acceptance check has a fresh verdict.
- All failures are fixed or reported as `unresolved` with evidence.
- `plan.md`, `checks.md`, and `progress.md` are current.
- Any `AGENTS.md` update contains only durable project guidance.
- `git diff` contains no accidental changes outside `SCOPE`.

If the limit is reached or a blocker prevents completion, return a partial result with exact per-check status. Do not claim completion or loop indefinitely for a pass.

## Handoff

Report concisely:

- Overall status and the output paths.
- Checks passed, failed, or unresolved, with evidence.
- Important decisions and assumptions.
- Remaining blockers or risks.
- Changes to `AGENTS.md`, or state that none were needed.

Only report token or usage figures when the environment provides them. Write the final response in the user's language.
