AGENT: DEVELOP
TASK: LIVE-BRAKE-COLOR-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-BRAKE-COLOR-001.md
- .ai/architect/tasks/LIVE-BRAKE-COLOR-001.md
- apps/web/src/live/LiveTelemetry.tsx
- apps/web/src/laps/LapView.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-BRAKE-COLOR-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LIVE-BRAKE-COLOR-001-brake-scale
- Base: main
- Do not commit on main. Do not push. Do not change version 0.19.0.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Invert the brake path color scale so hard braking is dark red and released brake is light red, on the race page and on lap view.

YOU DO NOT OWN
Throttle colors, coast color, pedal graph line colors, version bumps, merge.

LOCKS
- No new dependency. No useState for telemetry or the path.
- Keep hex constants #3a1515 and #ff5a5a; only reverse how brake percent mixes them (or swap the mixHex from/to for brake).
- Apply the same brake mix in LiveTelemetry.tsx and LapView.tsx so live and saved laps match.
- Do not change throttle mix (#143528 → #3dd68c), coast #8a8a8a, track blue, arrow amber.
- The page must not scroll. HTTP stays on 127.0.0.1:8787.

TARGET
- brake 100% → #3a1515 (dark)
- brake near 0% (but still in brake-dominant stroke) → toward #ff5a5a (light)
- Today it is the opposite: mixHex(LOW, HIGH, b/100) with LOW dark and HIGH light.

TESTS
In apps/web, npm run build must pass. Server unchanged; pytest not required.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, build result, and the file list. Russian report, plain-language section, and one English Reviewer prompt, then stop. Do not merge.
