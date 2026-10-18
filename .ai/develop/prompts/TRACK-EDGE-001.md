AGENT: DEVELOP
TASK: TRACK-EDGE-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Button labels that the owner reads are Russian, as written below.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/TRACK-EDGE-001.md
- .ai/architect/tasks/TRACK-EDGE-001.md
- apps/server/src/gt_telemetry/api/app.py
- apps/server/src/gt_telemetry/main.py
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: TRACK-EDGE-001
- Branch from current main: task/TRACK-EDGE-001-edges
- Do not commit on main. Do not push. Do not change version 0.5.0.
- Do not read, copy, or edit legacy/.

YOU OWN
Record the inner and outer track edges with height, save them locally, show the saved track name, and draw the saved edges on the existing canvas.

YOU DO NOT OWN
Lap files, Three.js, a chart library, zoom, coloring the driving line by pedal, version bumps, merge.

LOCKS
- One path canvas. The live path and the arrow stay. Pedals and gauges stay. No useState for telemetry or for the recorded points.
- Do not change the 10 Hz WebSocket interval. HTTP stays on 127.0.0.1:8787.
- The page must not scroll. No new dependency.
- Do not invent the missing edge. Do not send a heartbeat to 255.255.255.255.

STORAGE
SQLite file at the repository data/telemetry.sqlite. From a module under apps/server/src/gt_telemetry, that directory is parents[4] / "data". Create the file and parent directory when needed. Do not commit the database.

Tables:
- tracks(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, saved_at TEXT NOT NULL)
- track_points(track_id INTEGER NOT NULL, edge TEXT NOT NULL, seq INTEGER NOT NULL, x REAL NOT NULL, y REAL NOT NULL, z REAL NOT NULL, PRIMARY KEY(track_id, edge, seq))
edge is only "inner" or "outer".

API, same FastAPI app, localhost only:
- POST /api/track with JSON {name, edge, points:[{x,y,z}]}. Name must be non-empty after trim, at most 80 characters. Edge is inner or outer. Every coordinate must be finite. At most 20000 points. Replace that edge on the track with this name. Create the track row if the name is new. Return the saved name and the point count.
- GET /api/track/latest returns the most recently saved track: {name, inner:[{x,y,z}], outer:[...]}. 404 when no track exists.

UI
Under the header, a text input and two buttons labeled exactly:
- Запись внутренней стороны
- Запись внешней стороны

A click starts recording that edge into a plain array. Another click on the same button stops and POSTs the points. Only one edge records at a time. Starting the other button while one is recording stops and saves the first, then starts the second. While recording, the button text is "Стоп". Sample positionX, positionY, and positionZ from live messages, at most once per message, and only when all three are finite. Skip a point closer than 0.5 m in XZ to the previous one. Cap the array at 20000. If the name is empty, do not start, and set a status line to "Укажите имя". After a successful save, the TRACK label shows that name. On load, GET the latest track and show its name. If the request 404s, TRACK stays неизвестно.

CANVAS
Draw saved edges on the same canvas as the live path, before the arrow. Inner and outer are polylines. When both have at least two points, also fill a ribbon: stride both lists down to at most 1500 points, then pair by index using the shorter length, and fill triangles between pairs. Fill rgba(90, 140, 120, 0.35). Edge lines #8fd0b0. The live path and the arrow are drawn after the ribbon. Include the edge points in the fit bounds so the ribbon stays on screen. A single saved edge is only a line.

TESTS
SQLite tests may use a temporary file. Cover: reject an empty name, replace an edge, and round-trip x, y, and z. pytest from apps/server with PYTHONPATH=src. npm run build in apps/web.

DELIVERABLE
Commit on the feature branch. Return the SHA, pytest result, build result, and the list of files.
