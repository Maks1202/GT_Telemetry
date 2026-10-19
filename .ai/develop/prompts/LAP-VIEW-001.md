AGENT: DEVELOP
TASK: LAP-VIEW-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-VIEW-001.md
- .ai/architect/tasks/LAP-VIEW-001.md
- apps/server/src/gt_telemetry/laps/record.py
- apps/server/src/gt_telemetry/api/app.py
- apps/server/src/gt_telemetry/tracks.py
- apps/web/src/App.tsx
- apps/web/src/laps/LapList.tsx
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LAP-VIEW-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-VIEW-001-lap-view
- Base: main
- Do not commit on main. Do not push. Do not change version 0.15.0.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Show one saved lap on a canvas with scrubbing, gauges for the selected point, and the full-lap pedal graph.

YOU DO NOT OWN
Changing the list pagination contract, live path clear, Start/Stop, version bumps, merge.

LOCKS
- No new dependency. No react-router. No chart library.
- Arrow fill #ffb020. Path colors stay #3dd68c / #ff5a5a / #8a8a8a. Track edges #7eb6ff, ribbon rgba(90, 150, 230, 0.35).
- No useState for the sample array. Route lapId may stay React state from App as today.
- Cap samples read from one lap file at 30000. If longer, keep every n-th point so the count is at most 30000, always including the first and last.
- The page itself must not scroll.
- HTTP stays on 127.0.0.1:8787.

DETAIL API
GET /api/laps/{id}
- 404 if missing.
- Body: {"id", "lapNumber", "lapTimeMs", "trackName", "finishedAt", "samples": [{"throttle", "brake", "speedMps", "rpm", "gear", "x", "y", "z"}, ...]} in file order.
- Skip a jsonl line that is not a valid object or lacks finite x and z. Do not invent fields.
- If trackName is неизвестно, still return samples. The client draws no ribbon when the name is неизвестно or the track cannot be loaded.

TRACK FOR THE LAP
If trackName is not неизвестно, GET /api/tracks and use the track whose name equals trackName for the ribbon. If that name is missing from the list, draw the path without a ribbon.

PAGE
Replace the #/laps/<id> stub with a real view (new file apps/web/src/laps/LapView.tsx is fine). Keep the list at #/laps. A link «К списку» returns to #/laps.

Header: lap number, formatted time, track name. Readings SPEED, RPM, GEAR for the selected sample (em dash until the owner picks a point).

Canvas: only this lap's path, colored by pedals like the race page. Blue ribbon and edges when a matching saved track exists. Amber arrow at the selected sample. Heading = direction from the previous sample to this one in XZ; for the first sample use the next sample; if only one sample, skip the arrow. Wheel zoom ~1.1 toward cursor, scale 1–40 relative to fit, drag pan, double-click fit. View variables in the effect. preventDefault on wheel. Remove listeners on cleanup.

Pedal graph: full lap width, throttle #3dd68c and brake #ff5a5a, background #1a1a1a. Height about 4.5rem. A vertical marker at the selected sample. No 30-second window.

SCRUB
Click on the path canvas or the pedal graph. Choose the nearest sample of this lap (canvas: nearest in screen space after projection; graph: nearest by x index). Move both markers to that sample and update SPEED / RPM / GEAR. Click away from the polyline still picks the nearest sample of this lap. Zoom and pan must not be confused with a scrub: pointerdown+drag pans; a click without meaningful move scrubs.

TESTS
In apps/server, PYTHONPATH=src .venv/bin/python -m pytest.
Cover: GET /api/laps/{id} returns samples for a finished lap; missing id is 404; a bad jsonl line is skipped.
In apps/web, npm run build must pass.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, pytest result, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
