# Task Journal

| ID | Type | Status | Branch | Review | Merge | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| BOOTSTRAP-MULTI-AGENT-PROCESS-001 | process docs | CLOSED | `main` (direct) | n/a — PO ordered Architect to commit docs on `main` | on `main` | Not a product Develop lifecycle |
| LIVE-THROTTLE-BRAKE-001 | develop | SUSPENDED | not created | n/a | not merged | Bokeh patch cancelled. legacy/ is a reference only |
| ADR-001 | architecture | ACCEPTED | n/a | n/a | docs only | Stack accepted. Folder tree created as scaffold |
| SCAFFOLD-001 | structure | DONE | `main` | n/a | on main by PO order | Empty apps/ tree. No reception |
| LIVE-PEDALS-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Live throttle and brake page. Pedal press not observed |
| LIVE-PANEL-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Speed, rpm, gear, lap, last lap time |
| RUN-LIVE-CHECK-001 | sysadmin | CLOSED | main | n/a | n/a | PO watched 0.2.0, then ordered stop |
| LIVE-PATH-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Canvas path from position X/Z |
| LIVE-ARROW-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Car arrow from body quaternion |
| LIVE-ARROW-002 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Flip the arrow 180 degrees |
| LIVE-CAR-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Car code on the live page |
| TRACK-EDGE-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Inner and outer edge XYZ |
| LAP-RECORD-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Save each lap and show the best |
| LIVE-TRACE-COLOR-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Color the path by pedal |
| LIVE-CANVAS-ZOOM-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Zoom and pan the path canvas |
| LIVE-PEDAL-GRAPH-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Throttle and brake graph |
| LIVE-PEDAL-GRAPH-002 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Smooth the pedal graph scroll |
| TRACK-MATCH-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Show the saved track that contains the car |
| TRACK-PAGE-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Separate race and track-editor pages |
| LAP-ARM-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Record laps only between Start and Stop |
| TRACK-COLOR-001 | develop | IN_DEVELOP | task/TRACK-COLOR-001-track-blue | waiting | not merged | Draw the saved track in blue |

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
- Review: Approved. No Critical, Major, or Minor findings. pytest 8 passed.
- Closeout: fast-forward into main at 40c0c65, branch deleted, version set to 0.2.0.

## 2026-10-18 — RUN-LIVE-CHECK-001

- Asked by: PO. Start the app so the live page can be checked.
- Scope: native server and Vite only. No code changes.
- Console address already on record: 192.168.0.136, passed only as GT7_PLAYSTATION_IP.
- Result: PO confirmed the page works, then ordered the app stopped. No SysAdmin report.

## 2026-10-18 — LIVE-PATH-001

- Asked by: PO, after the live page check.
- Scope: one canvas, driven path from packet position X and Z. Y is height and is not plotted.
- Out of scope: lap files, track name, a track image.
- Review: Approved. No Critical, Major, or Minor findings. pytest 8 passed.
- Closeout: fast-forward into main at 84a8895, branch deleted, version set to 0.3.0.

## 2026-10-18 — LIVE-ARROW-001

- Asked by: PO. An arrow on the path showing where the car nose points.
- Scope: one arrow on the existing canvas. Heading from the body quaternion, local +Z is the nose.
- Out of scope: wheel world coordinates, a second canvas, heading history.
- Review: Approved. No Critical, Major, or Minor findings. pytest 10 passed.
- Closeout: fast-forward into main at a3f6b81, branch deleted, version set to 0.4.0.

## 2026-10-18 — LIVE-ARROW-002

- Asked by: PO. On track the arrow points backward relative to travel.
- Scope: negate the nose vector. Local -Z is forward. Same canvas.
- Out of scope: path, pedals, a second canvas.
- Review: Approved. No findings. pytest 10 passed.
- Closeout: fast-forward into main at 420841a, branch deleted, version set to 0.4.1.

## 2026-10-18 — LIVE-CAR-001

- Asked by: PO, as the first of six approved steps.
- Scope: car code at 0x124, name only from a local table, track label неизвестно.
- Out of scope: edge recording, laps, zoom, pedal graph.
- Queue after this: TRACK-EDGE-001, LAP-RECORD-001, LIVE-TRACE-COLOR-001, LIVE-CANVAS-ZOOM-001, LIVE-PEDAL-GRAPH-001.
- Review: Approved. pytest 13 passed.
- Closeout: fast-forward into main at 90e90ed, branch deleted, version set to 0.5.0.
