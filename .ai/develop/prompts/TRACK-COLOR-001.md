AGENT: DEVELOP
TASK: TRACK-COLOR-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/TRACK-COLOR-001.md
- .ai/architect/tasks/TRACK-COLOR-001.md
- apps/web/src/live/LiveTelemetry.tsx
- apps/web/src/tracks/TrackEditor.tsx

TASK AND AUTHORIZATION
- Task id: TRACK-COLOR-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/TRACK-COLOR-001-track-blue
- Base: main
- Do not commit on main. Do not push. Do not change version 0.13.0.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Paint the saved track ribbon and its two edge lines blue on the race canvas and on the track-editor canvas.

YOU DO NOT OWN
Path colors, the pedal graph, pedal bars, the car arrow, match rules, recording, version bumps, merge.

LOCKS
- No new dependency. No useState.
- Edge lines: #7eb6ff. Ribbon fill: rgba(90, 150, 230, 0.35).
- Do not change #3dd68c, #ff5a5a, or #8a8a8a. The arrow stays #3dd68c.
- The page must not scroll.

TESTS
In apps/web, npm run build must pass. The server is unchanged, so pytest is not required.

DELIVERABLE
Commit on the feature branch, including this prompt. Working tree clean. Return the SHA, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
