# Versioning (HARD)

Semantic Versioning 2.0.0. One product version: `MAJOR.MINOR.PATCH`.

Architect owns the number. Developer, Reviewer, SysAdmin, and Designer do not choose it and do not edit it.

## Current version

`0.5.0` in both product packages. They stay identical.

- `apps/server/pyproject.toml`
- `apps/web/package.json`

`0.5.0` shows the packet car code on the live page. A name appears only when the local table has that code. The track label stays неизвестно until a track is saved. The next bump happens only at a later code closeout. Do not edit version files under `legacy/`.

## When the number changes

Only when product code changes, and only at Architect closeout after Reviewer approval and the fast-forward merge.

| Change in the merged product code | Bump |
| --- | --- |
| Breaking change to existing behavior | MAJOR |
| New behavior that keeps existing behavior working | MINOR |
| Fix that does not add behavior | PATCH |

Product code is `apps/server` and `apps/web`: Python modules, UI, telemetry handling, and package metadata other than the version line itself. `legacy/` is not product code.

## When the number stays

- Agent rules, `.ai/` docs, README, roadmap, comments
- Tests that do not change runtime behavior
- A dependency reinstall that does not change product code
- This policy itself

No version bump is part of `LIVE-THROTTLE-BRAKE-001` until that task's product code is merged. Closeout of that feature is a MINOR bump to `1.1.0` if the live pedal display is the change that lands.

## Closeout

On code closeout the Architect, not the Developer, updates both version files, `.ai/architect/CHANGELOG.md`, and the current version line in `.ai/architect/REPOSITORY_STATE.md`. Docs-only closeout updates state and does not bump the number.
