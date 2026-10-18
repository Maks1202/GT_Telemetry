# Task Journal

| ID | Type | Status | Branch | Review | Merge | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| BOOTSTRAP-MULTI-AGENT-PROCESS-001 | process docs | CLOSED | `main` (direct) | n/a — PO ordered Architect to commit docs on `main` | on `main` | Not a product Develop lifecycle |
| LIVE-THROTTLE-BRAKE-001 | develop | SUSPENDED | not created | n/a | not merged | Bokeh patch cancelled. legacy/ is a reference only |
| ADR-001 | architecture | ACCEPTED | n/a | n/a | docs only | Stack accepted. Folder tree created as scaffold |
| SCAFFOLD-001 | structure | DONE | `main` | n/a | on main by PO order | Empty apps/ tree. No reception |
| LIVE-PEDALS-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Live throttle and brake page. Pedal press not observed |
| LIVE-PANEL-001 | develop | IN_DEVELOP | task/LIVE-PANEL-001-live-gauges | waiting | not merged | Speed, rpm, gear, lap, last lap time |

## 2026-10-18 — BOOTSTRAP-MULTI-AGENT-PROCESS-001

- Asked by: PO, direct to Architect
- Scope: multi-agent roles, hard policies, Strict GitHub Flow, templates, Cursor rules
- Out of scope: product features, stack choice, application runtime code
- Result: process files on `main`. Repository State returned to `CLEAN`. No active Develop task.
- Next: PO describes the product in the Architect chat and asks to authorize the first real task

## 2026-10-18 — LIVE-THROTTLE-BRAKE-001

- Asked by: PO, direct to Architect
- Finding: `last_data.throttle` and `last_data.brake` update from UDP. The Bokeh page draws those channels only after a finished lap.
- Probe: `192.168.0.136` sent 479 `G7S0` packets in 8 s. Values stayed throttle 0, brake 0, speed 0. Pedals were not pressed.
- Launch: not achieved. System Python 3.14 has no app dependencies. Project venv cannot import scipy.
- Result: task was authorized, then suspended the same day. Application files were not modified.
- Next: none. See ADR-001.

## 2026-10-18 — ADR-001

- Asked by: PO
- Product goal: local web app. Live race view and automatic lap recording are equal v1 priorities.
- `legacy/` is a reference for the GT7 packet library, not the application to extend.
- First later task, still a draft: `LIVE-PEDALS-001`, one page with throttle and brake. No lap storage in that task.
- Code was not started. Developer handoff was not issued.

## 2026-10-18 — SCAFFOLD-001

- Asked by: PO, after approving the folder tree
- Result: `apps/server`, `apps/web`, `data/`, `.env.example` created. Modules are empty. No UDP, no WebSocket, no pedal indicators.
- Version stays `0.0.0`.

## 2026-10-18 — LIVE-PEDALS-001

- Asked by: PO. Create the developer task and run it, then review.
- Scope: one Live Telemetry page, throttle and brake, local FastAPI WebSocket.
- Out of scope: legacy/, laps, SQLite, extra gauges.
- Branch: task/LIVE-PEDALS-001-live-pedals
- Review: Approved. No Critical, Major, or Minor findings. README was corrected before the verdict.
- Tests: 7 passed.
- Live pedals: packets arrived, throttle and brake stayed 0. A real press was not seen.
- Closeout: fast-forward into main, branch deleted, version set to 0.1.0.
- 2026-10-18 follow-up: pedal DOM updates in place, version 0.1.1, commit on main. No React re-render per packet.

## 2026-10-18 — LIVE-PANEL-001

- Asked by: PO, after accepting the recommendation.
- Scope: speed, rpm, gear, lap number, last lap time on the same page.
- Out of scope: lap files, SQLite, track name, a live stopwatch that is not in the packet.
