AGENT: DEVELOP
TASK: LIVE-PANEL-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-PANEL-001.md
- .ai/architect/tasks/LIVE-PANEL-001.md
- .ai/shared/VERSIONING.md
- apps/server/src/gt_telemetry/protocol/pedals.py
- apps/server/src/gt_telemetry/state/snapshot.py
- apps/server/src/gt_telemetry/ingest/receiver.py
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-PANEL-001
- Branch from current main: task/LIVE-PANEL-001-live-gauges
- Do not commit on main. Do not push. Do not change version 0.1.1.
- Do not read, copy, or edit legacy/.

YOU OWN
Show speed, rpm, gear, current lap number, and last lap time on the existing Live Telemetry page.

YOU DO NOT OWN
Lap files, SQLite, track name, sectors, car name, maps, charts, a second page, a running lap stopwatch that is not a packet field, version bumps, merge.

LOCKS
- Pedals stay. Each socket message still updates text and bar width in place. Do not bring back useState for telemetry values.
- Do not add a CSS transition. Do not change the 10 Hz WebSocket interval.
- HTTP stays on 127.0.0.1:8787. Do not hardcode a PlayStation IP.
- One product version string is untouched.

PACKET FIELDS
After the existing decrypt and magic check, read these little-endian fields from the plaintext. All of them sit before the brake byte, so the current minimum packet length still covers them.

- Speed: float32 at 0x4C, meters per second. Display km/h as that value times 3.6.
- RPM: float32 at 0x3C.
- Gear: the low 4 bits of the byte at 0x90. Show that integer. Do not invent names for reverse or neutral.
- Current lap: signed int16 at 0x74.
- Last lap time: signed int32 at 0x7C, milliseconds. This is the previous lap, not a live stopwatch. Display it as m:ss.mmm. If the value is 0 or negative, show an em dash, not a fake clock.

WEBSOCKET
Extend the JSON object. Keep connected, throttle, brake. Add speedKmh, rpm, gear, lap, lastLapMs. When connected is false, every numeric field is null, including the pedals.

UI
Same page. Pedal bars stay large. Put the five new readings in one compact row that does not force page scroll. Labels: SPEED, RPM, GEAR, LAP, LAST LAP. Update them with textContent only. Disconnected: em dash on each.

TESTS
Extend the plaintext decode test for the new fields. Keep the existing pedal tests passing. pytest from apps/server with PYTHONPATH=src. Do not require a PS5.

DELIVERABLE
Commit on the feature branch. Return the SHA, pytest result, and the list of files.
