AGENT: DEVELOP
TASK: LIVE-BRAKE-COLOR-002

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-BRAKE-COLOR-002.md
- .ai/architect/tasks/LIVE-BRAKE-COLOR-002.md
- apps/web/src/live/LiveTelemetry.tsx
- apps/web/src/laps/LapView.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-BRAKE-COLOR-002
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LIVE-BRAKE-COLOR-002-restore-brake-scale
- Base: main
- Do not commit on main. Do not push. Do not change version 0.19.1.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Restore the pre-0.19.1 brake path color mix in LiveTelemetry.tsx and LapView.tsx.

YOU DO NOT OWN
Throttle/coast colors, pedal graph, version bumps, merge.

LOCKS
- No new dependency. No useState for telemetry or the path.
- Brake mix must again be mixHex(BRAKE_STROKE_LOW, BRAKE_STROKE_HIGH, b/100) with LOW=#3a1515 and HIGH=#ff5a5a (undo the HIGH,LOW swap from LIVE-BRAKE-COLOR-001).
- Same change in both LiveTelemetry.tsx and LapView.tsx.
- Do not change throttle mix, coast, track blue, arrow.
- The page must not scroll. HTTP stays on 127.0.0.1:8787.

TESTS
In apps/web, npm run build must pass. Server unchanged; pytest not required.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, build result, and the file list. Russian report, plain-language section, and one English Reviewer prompt, then stop. Do not merge.
