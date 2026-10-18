AGENT: DEVELOP
TASK: LIVE-PEDAL-GRAPH-002

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-PEDAL-GRAPH-002.md
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-PEDAL-GRAPH-002
- Branch from current main: task/LIVE-PEDAL-GRAPH-002-smooth-graph
- Do not commit on main. Do not push. Do not change version 0.10.0.
- Do not read, copy, or edit legacy/.

YOU OWN
Make the existing pedal graph scroll smoothly instead of jumping once per socket message.

YOU DO NOT OWN
New samples between packets, a chart library, path or zoom changes, version bumps, merge.

LOCKS
- One pedal canvas, same place, same colors, same 300-slot ring. No useState. No push or shift.
- Do not change the 10 Hz WebSocket interval.
- Cancel the animation frame in the effect cleanup.
- The page must not scroll.

DRAW
Each slot already holds throttle and brake. Also store the time the sample was written, overwritten in place. performance.now() is enough.

Draw from one requestAnimationFrame loop, not only inside onmessage. The right edge is now. A sample's x is cssWidth * (1 - age / 30000). Drop samples older than 30 seconds from the stroke, but leave them in the ring until overwritten. Between packets the existing line moves left by the elapsed time. Do not invent pedal values.

Set canvas.width and canvas.height only when the CSS size or devicePixelRatio changed. Otherwise clear with fillRect.

TESTS
npm run build in apps/web must pass.

DELIVERABLE
Commit on the feature branch. Return the SHA, build result, and the list of files.
