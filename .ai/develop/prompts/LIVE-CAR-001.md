AGENT: DEVELOP
TASK: LIVE-CAR-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-CAR-001.md
- .ai/architect/tasks/LIVE-CAR-001.md
- apps/server/src/gt_telemetry/protocol/pedals.py
- apps/server/src/gt_telemetry/state/snapshot.py
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-CAR-001
- Branch from current main: task/LIVE-CAR-001-car-code
- Do not commit on main. Do not push. Do not change version 0.4.1.
- Do not read, copy, or edit legacy/.

YOU OWN
Show the car code on the live page, and a name only when a local table has that code. Show the track label as the Russian word неизвестно.

YOU DO NOT OWN
Track recording, lap files, canvas changes, a chart, version bumps, merge.

LOCKS
- Pedals, gauges, path, and the arrow stay. Updates stay in place. No useState for telemetry.
- Do not change the 10 Hz interval. HTTP stays on 127.0.0.1:8787.
- The page must not scroll.
- Do not invent car names. An empty name table is correct.

PACKET
Car code is a signed int32, little-endian, at 0x124. Read it only when the plaintext is at least 0x128 bytes. A shorter packet still decodes the existing fields, and the car code is absent.

WEBSOCKET
Add carCode. Null when absent or when connected is false. Do not add a car name field from a guess. The browser looks up the name.

UI
In the header, two static labels: CAR and TRACK. CAR text is the name from apps/server shipped JSON only if you also send the name from the server for codes present in that file. Prefer the server: add car_names.json next to the protocol package, map string keys of the decimal code to a name. Unknown or missing code: the CAR field shows the decimal code, or an em dash when null. TRACK text is the fixed Russian string неизвестно. Update both with textContent only.

If you have no verified name for any code, ship car_names.json as {}.

TESTS
A long enough plaintext returns the int32 at 0x124. A buffer that ends at the brake byte still returns pedals and a null car code. pytest from apps/server with PYTHONPATH=src. npm run build in apps/web.

DELIVERABLE
Commit on the feature branch. Return the SHA, pytest result, build result, and the list of files.
