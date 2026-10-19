AGENT: DEVELOP
TASK: LIVE-TRACK-PIN-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-TRACK-PIN-001.md
- .ai/architect/tasks/LIVE-TRACK-PIN-001.md
- apps/web/src/live/LiveTelemetry.tsx
- apps/web/src/index.css

TASK AND AUTHORIZATION
- Task id: LIVE-TRACK-PIN-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LIVE-TRACK-PIN-001-pin-track
- Base: main
- Do not commit on main. Do not push. Do not change version 0.17.0.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Add a session pin for the matched track on the race page so going off the ribbon does not clear the track until the owner unpins.

YOU DO NOT OWN
Server match rules, lap recording track names, the track editor, version bumps, merge.

LOCKS
- No new dependency. No useState for telemetry or the path. A plain boolean (or name string) in the effect is enough for the pin; button label via textContent. Page choice stays as it is.
- Do not change the 10 Hz socket. Do not change match_track math.
- The page must not scroll.
- HTTP stays on 127.0.0.1:8787.

PIN
On the race page, near the TRACK label, add a button.
- Label when unpinned: «Закрепить трассу».
- Label when pinned: «Открепить трассу».
- While unpinned and TRACK is «неизвестно», the button is disabled (or does nothing on click). While unpinned and a track is matched, a click pins that track's name and both edge arrays already drawn.
- While pinned: do not call showMatchedTrack clearing. Keep the pinned name and the pinned inner/outer edges even when the car is outside. Do not switch to another matched track while pinned.
- Unpin clears the pin. The next connected message with a position runs the normal match again.
- Refreshing the page clears the pin (session only; no localStorage).
- Reloading GET /api/tracks while pinned keeps the pin if that name is still in the list with both edges; if the pinned track disappeared from the list, unpin and fall back to normal match.

TESTS
In apps/web, npm run build must pass. The server is unchanged, so pytest is not required.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
