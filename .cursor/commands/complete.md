# Complete Current Task

You are finishing a development task.

Perform the following workflow. Enforce `.cursor/rules/testing.mdc` —
behavior changes without proportionate executed tests are **not ready**.

## Step 1

Review all changes.

## Step 2

Identify:

- bugs
- code smells
- security issues
- performance issues

## Step 3

Recommend improvements.

## Step 4

Review testing (hard gate).

Identify:

- missing tests for every touched behavioral layer (api and/or web)
- domain-invariant gaps (mapper guards, propose/confirm, gravity, RLS)
- regression risks

Then **run** the relevant filter(s) if code was touched:

```bash
pnpm --filter @eduai/api test
pnpm --filter @eduai/web test
```

If tests are missing or failing, DoD is not met — do not mark Ready for
Commit/PR until fixed or the user explicitly waives testing.

## Step 5

Review documentation.

Generate updates if necessary.

## Step 6

Generate Conventional Commit.

## Step 7

Prepare Pull Request summary.

Include:

Purpose

Changes

Testing (what was added + commands run + results)

Risks

Rollback

## Step 8

Determine readiness.

Output each only if earned:

✔ Ready for Commit — tests present and green for touched layers

✔ Ready for Push

✔ Ready for PR

✔ Ready for Merge

If testing DoD failed, output instead:

✘ Not ready — Testing DoD unmet: \<specific gaps\>

## Final Output

Summary

Files Changed

Commit Message

Testing (commands run + pass/fail)

Known Risks

Next Recommended Task
