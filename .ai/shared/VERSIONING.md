# Versioning (HARD)

Semantic Versioning 2.0.0. One product version: `MAJOR.MINOR.PATCH`.

Architect owns the number. Developer, Reviewer, SysAdmin, and Designer do not choose it and do not edit it.

## Current version

`0.18.1` in both product packages. They stay identical.

- `apps/server/pyproject.toml`
- `apps/web/package.json`

`0.18.1` clears the race path when a new lap starts while recording is armed. The next bump happens only at a later code closeout. Do not edit version files under `legacy/`.

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

When the number changes, the same closeout publishes that version on GitHub. A tag without a release is not enough.

- Annotated tag `vMAJOR.MINOR.PATCH` on the version commit. Example: `v0.13.1`.
- Push that tag. Do not force-push it. Do not move an existing tag.
- GitHub release with that same tag, in the same closeout. The title is the version number. The notes are the changelog section for that version, in Russian. The release points at the version commit, not at a later docs-only commit.
- One release per product version from `0.13.1` onward. Tags `v0.1.0` through `v0.13.0` stay tags. Do not backfill those releases unless the PO asks.
