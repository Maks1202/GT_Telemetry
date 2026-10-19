AGENT: DEVELOP
TASK: LIVE-LAP-TRACE-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-LAP-TRACE-001.md
- .ai/architect/tasks/LIVE-LAP-TRACE-001.md
- apps/web/src/live/LiveTelemetry.tsx
- apps/web/src/tracks/TrackEditor.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-LAP-TRACE-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LIVE-LAP-TRACE-001-lap-trace
- Base: main
- Do not commit on main. Do not push. Do not change version 0.13.1.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Make the race-page car arrow amber, and clear the live driving path when a finished lap is recorded.

YOU DO NOT OWN
The laps list page, lap detail, track-name on saved laps, pagination, version bumps, merge.

LOCKS
- No new dependency. No useState for telemetry or the path.
- Arrow fill on the race page and on the track editor: #ffb020. Do not change path colors #3dd68c, #ff5a5a, #8a8a8a or track colors #7eb6ff / rgba(90, 150, 230, 0.35).
- Clear only the live path point array. Do not clear the matched track ribbon, edges, or orientation.
- Clear when a connected live message has a lap number strictly greater than the lap of the previous connected message AND lastLapMs is a number greater than 0. That is the same finish rule the recorder uses. Do not clear when recording is disarmed, when the message is disconnected, or when lastLapMs is missing, zero, or negative.
- Keep the first connected lap of a session without clearing before the first point is drawn.
- The page must not scroll.

TESTS
In apps/web, npm run build must pass. The server is unchanged, so pytest is not required.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
