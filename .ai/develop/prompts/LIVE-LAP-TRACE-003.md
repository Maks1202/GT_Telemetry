AGENT: DEVELOP
TASK: LIVE-LAP-TRACE-003

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-LAP-TRACE-003.md
- .ai/architect/tasks/LIVE-LAP-TRACE-003.md
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-LAP-TRACE-003
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LIVE-LAP-TRACE-003-clear-path-always
- Base: main
- Do not commit on main. Do not push. Do not change version 0.18.1.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
On the race page, clear the live driving path when a new lap starts whether recording is armed or not, so the next lap never draws on top of the previous path.

YOU DO NOT OWN
Server lap finish rules, lap list/view, track pin behavior beyond leaving it intact, version bumps, merge.

LOCKS
- No new dependency. No useState for telemetry or the path.
- Change only the race-page clear rule in LiveTelemetry.tsx.
- Clear only the live path point array. Do not clear matched or pinned track edges, track name, orientation, or the car arrow.
- On a connected message with a finite lap number strictly greater than previousConnectedLap, set pathPoints.length = 0 before appending the current position. Do this whether recordingArmed is true or false, and even when lastLapMs is missing, zero, or negative.
- Do not clear when the message is disconnected, or on the first connected lap of the session (previousConnectedLap is still null).
- Start/Stop (arm/disarm) must not clear the path by itself.
- Keep appendPathPoint after the clear check on the same message so the new lap starts with the current car position.
- The page must not scroll.
- HTTP stays on 127.0.0.1:8787.

TESTS
In apps/web, npm run build must pass. The server is unchanged, so pytest is not required.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
