# Task Journal

| ID | Type | Status | Branch | Review | Merge | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| BOOTSTRAP-MULTI-AGENT-PROCESS-001 | process docs | CLOSED | `main` (direct) | n/a — PO ordered Architect to commit docs on `main` | on `main` | Not a product Develop lifecycle |
| LIVE-THROTTLE-BRAKE-001 | develop | SUSPENDED | not created | n/a | not merged | Bokeh patch cancelled. legacy/ is a reference only |
| ADR-001 | architecture | DRAFT | n/a | n/a | docs only | Stack and v1 plan. Awaiting PO approval. No code |
| LIVE-PEDALS-001 | develop | DRAFT | not created | n/a | not merged | One live throttle/brake page. Not authorized |

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
