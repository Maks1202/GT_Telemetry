# OPS-MINT-DATA-MIGRATE-001

Status: AUTHORIZED (SysAdmin)

## Goal

Copy the full local telemetry dataset from the Mac checkout to host `mint` (`~/Projects/GT_Telemetry/data`), rewrite absolute `jsonl_path` values so they resolve on Mint, restart the systemd app units, and confirm laps/tracks load.

## Why rewrite

`laps.jsonl_path` currently stores absolute Mac paths such as  
`/Users/maks1202/Projects/GT_Telemetry/data/laps/...`.  
Copying files alone leaves broken paths on Mint. After copy, replace the Mac repo prefix with `/home/maks/Projects/GT_Telemetry` in SQLite.

## Scope

- Source (Mac): `/Users/maks1202/Projects/GT_Telemetry/data/` — `telemetry.sqlite` + `laps/*.jsonl` (~120MB; ~67 laps, tracks in the same DB).
- Destination (mint): `/home/maks/Projects/GT_Telemetry/data/`
- Stop `gt-telemetry-api` / `gt-telemetry-web` on mint before replacing data; start them after.
- Backup any existing mint `data/` aside (e.g. `data.bak-<timestamp>`) before overwrite.
- Transfer via `rsync` or `scp` over `ssh mint` (LAN). Do not put `data/` into git.
- After copy, on mint with services stopped:
  `UPDATE laps SET jsonl_path = REPLACE(jsonl_path, '/Users/maks1202/Projects/GT_Telemetry', '/home/maks/Projects/GT_Telemetry');`
  Verify no remaining `/Users/maks1202` paths; spot-check that referenced jsonl files exist.
- Restart units; `GET /health`; `GET /api/laps` (or equivalent list) returns the migrated set; open one lap detail if the API exposes it.
- Run report: `.ai/sysadmin/runs/OPS-MINT-DATA-MIGRATE-001.md`

## Out of scope

- Application code changes (relative paths, sync daemon) — follow-up Develop task after this ops closeout.
- Docker, git-committing `data/`, SemVer bump.
- Bidirectional merge if Mint already has newer unique laps (if mint has real data, stop and report blocker with counts; do not invent a merge).

## Acceptance

1. Mint `data/telemetry.sqlite` and `data/laps/` match the Mac dataset (file counts / lap count).
2. All `jsonl_path` values start with `/home/maks/Projects/GT_Telemetry/`.
3. Services active; health OK; lap list non-empty with expected count (~67).
4. Russian SysAdmin report filed; next actor Architect closeout.
