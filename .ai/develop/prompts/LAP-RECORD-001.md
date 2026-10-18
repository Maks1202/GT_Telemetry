AGENT: DEVELOP
TASK: LAP-RECORD-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-RECORD-001.md
- .ai/architect/tasks/LAP-RECORD-001.md
- apps/server/src/gt_telemetry/ingest/receiver.py
- apps/server/src/gt_telemetry/tracks.py
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LAP-RECORD-001
- Branch from current main: task/LAP-RECORD-001-laps
- Do not commit on main. Do not push. Do not change version 0.6.0.
- Do not read, copy, or edit legacy/.

YOU OWN
Save each finished lap's telemetry and show the best saved lap time beside the last lap.

YOU DO NOT OWN
Edge recording changes, path colors, zoom, a pedal graph, Three.js, version bumps, merge.

LOCKS
- The live page keeps working if the database is empty. No useState for telemetry.
- Do not queue packets in memory. Append the current lap to a file.
- Do not change the 10 Hz push. Recording uses accepted UDP samples, not the WebSocket rate.
- HTTP stays on 127.0.0.1:8787. No new dependency.
- The page must not scroll.

RECORDING
Use the same SQLite file as tracks: repository data/telemetry.sqlite.

Table laps:
- id INTEGER PRIMARY KEY
- lap_number INTEGER NOT NULL
- lap_time_ms INTEGER NOT NULL
- jsonl_path TEXT NOT NULL
- finished_at TEXT NOT NULL

On each accepted sample, append one JSON line to the open lap file under data/laps/. Fields: packetId, throttle, brake, speedMps, rpm, gear, x, y, z. Create data/laps when needed.

A lap finishes when the packet lap number becomes strictly greater than the lap number being recorded and last_lap_ms is greater than 0. Then insert one laps row with that last_lap_ms and the file that was just closed, and open a new file for the new lap number. If last_lap_ms is not greater than 0, discard the open file and start the new lap without a database row. Do not load the file back into a list.

BEST
bestLapMs is the minimum lap_time_ms in the table, or null when the table is empty. Put bestLapMs on the live WebSocket view. It stays present when connected is false only as null, same as the other numbers. When connected is true, send the stored best even if it was recorded earlier.

UI
Add a BEST gauge in the existing gauge row. Format it like LAST LAP, including an em dash when null or not positive. Update with textContent only. The grid may become six columns. Do not remove LAST LAP.

TESTS
Use a temporary directory. Feed a lap-1 sample then a lap-2 sample whose last lap time is 90000. Assert one database row, bestLapMs 90000, and that the JSONL line contains the lap-1 throttle and the y coordinate. pytest from apps/server with PYTHONPATH=src. npm run build in apps/web.

DELIVERABLE
Commit on the feature branch. Return the SHA, pytest result, build result, and the list of files.
