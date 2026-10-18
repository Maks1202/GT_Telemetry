AGENT: DEVELOP
TASK: LAP-ARM-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-ARM-001.md
- .ai/architect/tasks/LAP-ARM-001.md
- apps/server/src/gt_telemetry/laps/record.py
- apps/server/src/gt_telemetry/main.py
- apps/server/src/gt_telemetry/api/app.py
- apps/server/src/gt_telemetry/ingest/receiver.py
- apps/server/tests/test_laps.py
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LAP-ARM-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-ARM-001-lap-arm
- Base: main
- Do not commit on main. Do not push. Do not change version 0.12.0.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Gate lap recording with Start and Stop on the race page.

YOU DO NOT OWN
Track matching, the track editor, the pedal graph, a packet track id, version bumps, merge.

LOCKS
- The live WebSocket keeps pushing when recording is off. Gauges, path, arrow, and the matched track stay.
- No useState for telemetry or the armed flag. Set the button label with textContent.
- Do not change the 10 Hz interval. Samples still come from accepted UDP packets, not from the WebSocket.
- The recorder starts disarmed. Update the existing lap tests so they arm before they expect a saved lap.
- HTTP stays on 127.0.0.1:8787. No new dependency.
- The page must not scroll. The button is on the race page only.

RECORDING
LapRecorder.start arms it. LapRecorder.stop disarms it and deletes the open lap file without inserting a row. record does nothing while disarmed: no file and no row. While armed, the current finish rule stays: a row is inserted only when the lap number increases and last_lap_ms is greater than 0. start and stop take the same lock as record.

main passes one LapRecorder into both UdpIngest and create_app.

POST /api/recording/start returns {"armed": true}. POST /api/recording/stop returns {"armed": false}. GET /api/recording returns {"armed": true or false}.

The race page loads that GET on mount. The button reads «Старт» when disarmed and «Стоп» when armed. A click posts the other action and sets the label from the response. A failed request leaves the label as it was.

TESTS
In apps/server, PYTHONPATH=src .venv/bin/python -m pytest.
Cover: disarmed record writes nothing; an armed lap still finishes into one row; stop during a lap leaves no new row and no open file; a row that was already saved is still there after stop.
In apps/web, npm run build must pass.

DELIVERABLE
Commit on the feature branch, including this prompt. Working tree clean. Return the SHA, pytest result, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
