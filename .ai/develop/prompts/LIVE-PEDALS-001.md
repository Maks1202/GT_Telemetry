AGENT: DEVELOP
TASK: LIVE-PEDALS-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Talk to the Product Owner in Russian. Code, commits, and this prompt are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop. Ability is not authority.

READ AND FOLLOW
- .ai/develop/ROLE.md
- .ai/shared/GITHUB_FLOW_STRICT.md
- .ai/shared/VERSIONING.md
- .ai/architect/tasks/LIVE-PEDALS-001.md
- apps/server and apps/web as they exist on main

TASK AND AUTHORIZATION
- Task id: LIVE-PEDALS-001
- Authorized by: Architect, after the PO approved the folder tree and ordered this task started
- Branch from current main: task/LIVE-PEDALS-001-live-pedals
- Do not commit on main
- Do not push
- Do not change the version 0.0.0

YOU OWN
A local page that shows live throttle and brake from GT7 packets.

YOU DO NOT OWN
Lap storage, SQLite, maps, history, speed, rpm, gear, settings, legacy/, version bumps, merge, chat rename.

LOCKS
- Do not read, copy, import, or edit anything under legacy/. Treat that tree as absent.
- Do not hardcode an IP address. Read GT7_PLAYSTATION_IP from the environment. If it is empty, start anyway and report disconnected. Do not send to 255.255.255.255.
- Bind the HTTP API to 127.0.0.1 only.
- The UDP receiver runs on its own thread. The WebSocket handler must not recv UDP and must not grow an unbounded queue. Send the latest snapshot only.
- One product. No Docker.

OBJECTIVE
Browser page titled Live Telemetry. Large THROTTLE and BRAKE indicators, 0 to 100 percent, a number beside each bar, distinct colors, dark background, no page scroll on a normal monitor. Connection status is visible. If no packet arrived within 1.0 second, show disconnected and do not present the last percents as live.

PROTOCOL
Implement this from the spec below. Do not open legacy sources.

- Heartbeat payload is the single ASCII byte A, UDP, to GT7_PLAYSTATION_IP port 33739, about once a second and again after a receive timeout.
- Bind UDP 0.0.0.0:33740.
- Decrypt the datagram with Salsa20. Key is the ASCII string "Simulator Interface Packet GT7 ver 0.0", first 32 bytes. IV seed is the 4 bytes at offset 0x40 of the received datagram, little-endian integer, xor 0xDEADBEAF. 8-byte IV is that xor result as 4 little-endian bytes followed by the original seed as 4 little-endian bytes.
- After decrypt, magic is the first 4 bytes as a little-endian int and must equal 0x47375330. Otherwise drop the datagram.
- Ignore a packet whose little-endian int32 at offset 0x70 is not greater than the previous accepted id. Reset that id when the socket times out.
- Throttle is the byte at 0x91 divided by 2.55. Brake is the byte at 0x92 divided by 2.55.
- Remember the receive time. Connected means a packet was accepted less than or equal to 1.0 second ago.

API
- FastAPI on 127.0.0.1:8787
- WebSocket at /ws pushes one JSON object about 10 times a second: connected (bool), throttle (number or null), brake (number or null). When connected is false, both numbers are null.
- GET /health returns 200. No other routes.

WEB
- Keep the existing Vite React TypeScript app.
- LiveTelemetry is the only screen.
- Connect to ws://127.0.0.1:8787/ws
- Throttle and brake use different colors. Bars and numbers update from the socket.
- Disconnected or missing socket: status says there is no link, bars are empty, numbers are an em dash.
- No chart library. No new UI kit.

TESTS
- pytest for pure functions: decode of a plaintext buffer, reject bad magic, stale snapshot after 1 second, fresh snapshot returns percents.
- Crypto roundtrip only if you can build a datagram whose bytes 0x40:0x44 are the IV seed the decryptor reads. If you cannot do that honestly, test decrypt with a function-level fixture you generate in the test and document the limit. Do not skip the plaintext decode tests.
- Do not require a PS5 for pytest.
- Add pytest as an optional dev dependency, not as a runtime dependency. Add pycryptodome to runtime dependencies. Keep fastapi and uvicorn.

VALIDATION
- From apps/server, with PYTHONPATH=src: python -m pytest
- Do not claim a PS5 pedal test passed unless you actually saw throttle or brake change on a live socket while this server was running. If the console is quiet, say the live pedal check is open.
- Working tree clean. All task files committed on the feature branch. Branch is not main.

DELIVERABLE
Implement, commit, stop. Return the branch name, commit SHAs, test command result, and whether a live PS5 pedal change was observed.
