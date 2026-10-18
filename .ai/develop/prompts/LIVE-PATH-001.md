AGENT: DEVELOP
TASK: LIVE-PATH-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-PATH-001.md
- .ai/architect/tasks/LIVE-PATH-001.md
- .ai/shared/VERSIONING.md
- apps/server/src/gt_telemetry/protocol/pedals.py
- apps/server/src/gt_telemetry/state/snapshot.py
- apps/web/src/live/LiveTelemetry.tsx
- apps/web/src/index.css

TASK AND AUTHORIZATION
- Task id: LIVE-PATH-001
- Branch from current main: task/LIVE-PATH-001-drive-path
- Do not commit on main. Do not push. Do not change version 0.2.0.
- Do not read, copy, or edit legacy/.

YOU OWN
Draw the car's driven path on one canvas on the existing Live Telemetry page.

YOU DO NOT OWN
Lap files, SQLite, track name, a track image, sectors, maps from the internet, chart libraries, a second page, version bumps, merge.

LOCKS
- Pedals and the five gauges stay. They still update in place: textContent and pedal bar width. No useState for telemetry or for the path.
- Do not add a CSS transition. Do not change the 10 Hz WebSocket interval.
- HTTP stays on 127.0.0.1:8787. Do not hardcode a PlayStation IP.
- The page must not scroll. overflow: hidden stays.
- One product version string is untouched.

PACKET FIELDS
After the existing decrypt and magic check, read three little-endian float32 values:

- position X at 0x04, meters
- position Y at 0x08, meters. This is height. Send it, do not plot it.
- position Z at 0x0C, meters

If a float is not finite, send null for that axis. Do not emit NaN or Infinity in JSON.

WEBSOCKET
Keep the current fields. Add positionX, positionY, positionZ. When connected is false, those three are null along with the other numbers.

CANVAS
One canvas, mounted once, in the space between the gauge row and the pedals. The canvas grows to fill that space. Pedal bars stay 5.5rem tall; the pedal block must not keep flex: 1, or the canvas will have no room.

Store points in a plain array closed over by the socket effect, not in React state. On each live message, if positionX and positionZ are finite, append {x, z}. If the new point is more than 40 meters from the previous point, mark a stroke break so the line does not jump across the map. Cap the array at 30000 points and drop the oldest.

Redraw the whole path on the existing canvas with the 2D context. No React re-render for a new point. Fit the points into the canvas with a small padding. If every point is the same, use a 1 meter span so the scale is not zero. Stroke color #e8e8e8 on canvas background #1a1a1a. Line about 2 CSS pixels. Honor devicePixelRatio.

While disconnected, keep the path already drawn. Do not clear it. Do not draw a sample oval or any invented track.

A static label PATH above the canvas is fine. It does not change per packet.

TESTS
Extend the plaintext decode test so X, Y, and Z come back from those offsets, including a non-finite value becoming null on the live view. Keep the existing tests passing. pytest from apps/server with PYTHONPATH=src. From apps/web, npm run build. Do not require a PS5.

DELIVERABLE
Commit on the feature branch. Return the SHA, pytest result, build result, and the list of files.
