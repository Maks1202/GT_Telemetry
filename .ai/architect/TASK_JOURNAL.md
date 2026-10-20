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
| TRACK-COLOR-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Draw the saved track in blue |
| LIVE-LAP-TRACE-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Amber arrow and clear the path on a finished lap |
| LAP-LIST-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Paginated lap list with track names |
| LAP-VIEW-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Open one lap with scrubbing |
| LAP-MARKER-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Make the pedal-graph scrub marker readable |
| LAP-GRAPH-ZOOM-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Sync the pedal graph with the path zoom |
| LIVE-TRACK-PIN-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Pin the matched track for the race session |
| LIVE-LAP-TRACE-002 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Clear race path on lap bump while armed |
| LIVE-LAP-TRACE-003 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Clear race path on lap bump always |
| LAP-PIN-TRACK-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Store pinned track name on finished laps |
| LIVE-BRAKE-COLOR-001 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Invert brake path color scale (PATCH; PO later asked to restore) |
| LIVE-BRAKE-COLOR-002 | develop | CLOSED | deleted after ff-merge | Approved | ff-merge to main | Restore prior brake path color scale |

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

## 2026-10-20 — LIVE-LAP-TRACE-002

- Asked by: PO. During armed recording the next lap path draws on top of the previous one.
- Scope: clear live path points when lap number increases while armed; do not require lastLapMs on the same packet. Keep track ribbon, pin, and car arrow.
- Out of scope: server finish rules, lap list/view.
- Review: Approved. No Critical, Major, or Minor findings. npm run build passed.
- Closeout: fast-forward into main at c9c1f8b, branch deleted, version set to 0.18.1 (PATCH — fix, not a new feature).

## 2026-10-20 — LIVE-LAP-TRACE-003

- Asked by: PO. Same path clear when recording is not armed.
- Scope: clear live path on lap number increase always; keep track ribbon, pin, car arrow.
- Out of scope: server finish rules, lap list/view.
- Review: Approved. No Critical, Major, or Minor findings. npm run build passed.
- Closeout: fast-forward into main at 38afc36, branch deleted, version set to 0.18.2 (PATCH).

## 2026-10-20 — LAP-PIN-TRACK-001

- Asked by: PO. Pinned track must be stored on finished laps so lap view shows the ribbon.
- Scope: session track override on the recorder; race page syncs pin/unpin; finish uses override else match_track.
- Out of scope: pin UI redesign.
- Review: Approved with comments (Minor: auto-unpin without server clear), then Approved after e6cad6e. pytest 22 passed.
- Closeout: fast-forward into main at e6cad6e, branch deleted, version set to 0.19.0 (MINOR).

## 2026-10-20 — LIVE-BRAKE-COLOR-001

- Asked by: PO. Brake path should be dark at 100% and light when released.
- Scope: invert brake mixHex in LiveTelemetry and LapView; keep hex constants.
- Out of scope: throttle/coast/pedal graph colors.
- Review: Approved. No findings. npm run build passed.
- Closeout: fast-forward into main at a28046b, branch deleted, version set to 0.19.1 (PATCH).

## 2026-10-20 — LIVE-BRAKE-COLOR-002

- Asked by: PO. Revert the brake path color scale; 0.19.1 looked worse. Treat as a fix, not a feature.
- Scope: restore mixHex(LOW, HIGH, b/100) in LiveTelemetry and LapView.
- Out of scope: throttle/coast.
- Review: Approved. No findings. npm run build passed.
- Closeout: fast-forward into main at 42e9f54, branch deleted, version set to 0.19.2 (PATCH).
