AGENT: DEVELOP
TASK: LIVE-PEDAL-GRAPH-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-PEDAL-GRAPH-001.md
- apps/web/src/live/LiveTelemetry.tsx
- apps/web/src/index.css

TASK AND AUTHORIZATION
- Task id: LIVE-PEDAL-GRAPH-001
- Branch from current main: task/LIVE-PEDAL-GRAPH-001-pedal-graph
- Do not commit on main. Do not push. Do not change version 0.9.0.
- Do not read, copy, or edit legacy/.

YOU OWN
A small second canvas that graphs throttle and brake for the last 30 seconds.

YOU DO NOT OWN
Changes to path zoom, colors, lap storage, a chart library, version bumps, merge.

LOCKS
- The big pedal bars stay. The path canvas stays one and keeps zoom, colors, ribbon, and the arrow.
- No useState for samples. A fixed ring of 300 slots, overwritten in place. Do not grow an array with push and shift.
- No new dependency. The page must not scroll.
- Redraw only that small canvas when a live sample arrives. Do not allocate a copy of the ring for the draw.

GRAPH
Place it between the gauge row and the path, fixed height about 4.5rem. Background #1a1a1a. Vertical axis is 0 to 100. Throttle line #3dd68c. Brake line #ff5a5a. Newer samples on the right. When connected is false, do not append a point. Missing pedal values are not drawn as zero.

TESTS
npm run build in apps/web must pass.

DELIVERABLE
Commit on the feature branch. Return the SHA, build result, and the list of files.
