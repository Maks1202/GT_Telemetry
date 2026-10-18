AGENT: DEVELOP
TASK: LIVE-ARROW-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-ARROW-001.md
- .ai/architect/tasks/LIVE-ARROW-001.md
- .ai/shared/VERSIONING.md
- apps/server/src/gt_telemetry/protocol/pedals.py
- apps/server/src/gt_telemetry/state/snapshot.py
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-ARROW-001
- Branch from current main: task/LIVE-ARROW-001-car-arrow
- Do not commit on main. Do not push. Do not change version 0.3.0.
- Do not read, copy, or edit legacy/.

YOU OWN
Draw one car arrow on the existing path canvas. The tip points along the car nose.

YOU DO NOT OWN
A second canvas, wheel-position fields, lap files, SQLite, a track image, version bumps, merge.

LOCKS
- One canvas element. The path stays. Pedals and gauges stay, still updated in place. No useState for telemetry, the path, or the arrow.
- Do not store a heading history. Keep only the latest orientation, overwritten in place. The point cap stays 30000. Do not push extra objects per packet.
- Do not add a CSS transition. Do not change the 10 Hz interval.
- HTTP stays on 127.0.0.1:8787. Do not hardcode a PlayStation IP.
- The page must not scroll.
- One product version string is untouched.

PACKET FIELDS
The packet has no world coordinates for the front or rear wheels. The body orientation is a quaternion, four little-endian float32 values:

- x at 0x1C
- y at 0x20
- z at 0x24
- w at 0x28

World Y is up. The map is X and Z. The car nose is local +Z.

HEADING
Add a pure function body_forward_xz(x, y, z, w) that returns (forward_x, forward_z) or None.

- If any component is not finite, return None.
- Let n2 be the sum of squares. If n2 is under 0.25, return None.
- Normalize the quaternion.
- forward_x = 2 * (x * z + w * y)
- forward_z = 1 - 2 * (x * x + y * y)

Checked cases: (0, 0, 0, 1) returns (0, 1). (0, 1, 0, 0) returns (0, -1).

WEBSOCKET
Keep the current fields. Add rotationX, rotationY, rotationZ, rotationW. A non-finite component is null. When connected is false, those four are null.

CANVAS
On the same canvas, after the path stroke, draw one arrow at the latest car position. Map the forward vector with the same X and Z scale as the path: screen right follows world +X, screen down follows world +Z. Normalize that screen vector and draw a triangle about 18 CSS pixels long, centered on the car, tip along the nose. Color #3dd68c. If the heading is None, or the screen vector is too small to normalize, draw the path and skip the arrow. Do not invent a direction from speed or from the previous point.

Disconnect still does not clear the canvas.

TESTS
Pytest the two heading cases and that the four floats are read from those offsets. Keep existing tests passing. npm run build in apps/web. No PS5.

DELIVERABLE
Commit on the feature branch. Return the SHA, pytest result, build result, and the list of files.
