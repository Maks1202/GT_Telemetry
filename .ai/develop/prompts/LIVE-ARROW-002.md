AGENT: DEVELOP
TASK: LIVE-ARROW-002

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-ARROW-002.md
- .ai/architect/tasks/LIVE-ARROW-002.md
- apps/server/src/gt_telemetry/protocol/pedals.py
- apps/web/src/live/LiveTelemetry.tsx
- apps/server/tests/test_pedals.py

TASK AND AUTHORIZATION
- Task id: LIVE-ARROW-002
- Branch from current main: task/LIVE-ARROW-002-flip-arrow
- Do not commit on main. Do not push. Do not change version 0.4.0.
- Do not read, copy, or edit legacy/.

YOU OWN
Turn the existing car arrow 180 degrees so the tip points forward along travel.

YOU DO NOT OWN
A new canvas, path changes, wheel fields, version bumps, merge.

LOCKS
- One canvas. The path, pedals, and gauges stay. No useState. No heading history.
- Do not change the 10 Hz interval or the PlayStation address.
- The page must not scroll.
- One product version string is untouched.

FIX
The live check showed the tip points opposite the car's travel. The nose is local -Z, not local +Z. Negate both components returned by body_forward_xz in Python and in the matching function in LiveTelemetry.tsx.

- forward_x = -2 * (x * z + w * y)
- forward_z = -(1 - 2 * (x * x + y * y))

Keep the finite check and the normalize step. Do not take direction from speed or from the previous path point.

TESTS
Update the heading cases. (0, 0, 0, 1) returns (0, -1). (0, 1, 0, 0) returns (0, 1). The non-finite and short-quaternion cases still return None. pytest from apps/server with PYTHONPATH=src. npm run build in apps/web.

DELIVERABLE
Commit on the feature branch. Return the SHA, pytest result, build result, and the list of files.
