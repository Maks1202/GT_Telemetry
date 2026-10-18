AGENT: DEVELOP
TASK: LIVE-TRACE-COLOR-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-TRACE-COLOR-001.md
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-TRACE-COLOR-001
- Branch from current main: task/LIVE-TRACE-COLOR-001-pedal-color
- Do not commit on main. Do not push. Do not change version 0.7.0.
- Do not read, copy, or edit legacy/.

YOU OWN
Color the live driving line by throttle and brake.

YOU DO NOT OWN
Zoom, a pedal graph, server changes, version bumps, merge.

LOCKS
- One path canvas. Ribbon, arrow, pedals, and gauges stay. No useState. Point cap stays 30000.
- Do not add a library. The page must not scroll.
- Store throttle and brake on each path point. Do not store a second copy of the path.

COLOR
On each segment, let t and b be the later point's throttle and brake, clamped 0 to 100.
- If both are below 3, stroke #8a8a8a.
- If brake is greater than or equal to throttle, mix #3a1515 toward #ff5a5a by brake/100.
- Otherwise mix #143528 toward #3dd68c by throttle/100.

Draw runs that share the same 10-percent bucket as one subpath, so a full buffer is not 30000 separate style changes. A stroke break still starts a new run. The arrow stays on top.

TESTS
No new server test is required. npm run build in apps/web must pass.

DELIVERABLE
Commit on the feature branch. Return the SHA, build result, and the list of files.
