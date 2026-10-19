AGENT: DEVELOP
TASK: LAP-PIN-TRACK-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-PIN-TRACK-001.md
- .ai/architect/tasks/LAP-PIN-TRACK-001.md
- apps/server/src/gt_telemetry/laps/record.py
- apps/server/src/gt_telemetry/api/app.py
- apps/web/src/live/LiveTelemetry.tsx
- apps/server/tests/test_laps.py

TASK AND AUTHORIZATION
- Task id: LAP-PIN-TRACK-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-PIN-TRACK-001-pinned-lap-track
- Base: main
- Do not commit on main. Do not push. Do not change version 0.18.2.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
When the race page has a pinned track, finished laps store that track name so lap view can show the blue ribbon. Keep automatic match when nothing is pinned.

YOU DO NOT OWN
Pin UI redesign, track editor, lap list pagination, version bumps, merge.

LOCKS
- No new dependency. No useState for telemetry or the path on the race page.
- Native stack only. HTTP stays on 127.0.0.1:8787.
- The page must not scroll.
- Do not change match_track geometry.
- Pin remains session-only in the browser (no localStorage).

SERVER
- LapRecorder keeps an optional session track name (pinned override), independent of armed.
- Add a small API the race page can call to set or clear that name (e.g. POST /api/recording/track with JSON trackName string or null). Reject unknown non-null names that are not in the track store (400). Clearing with null is always ok.
- On lap finish (_finish): if session track name is set, store it as track_name; else keep today's match_track(last x/z) behavior (неизвестно when no match).
- start()/stop() must not clear the session track name by themselves.
- Cover with pytest: pinned name stored when car is outside; unpinned still matches; clear override; reject unknown name.

CLIENT (LiveTelemetry.tsx)
- When the owner pins a track, POST the pinned name to the new API.
- When the owner unpins, POST null / clear.
- When Start succeeds, also send the current pinned name (or clear) so a pin made before Start is not lost if a request failed earlier.
- Do not block the pin button on network failure beyond best-effort fetch (same style as recording start).
- Keep pin visual behavior unchanged.

TESTS
- apps/server: pytest for the new finish/override behavior.
- apps/web: npm run build must pass.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, test/build results, and the file list. Russian report, plain-language section, and one English Reviewer prompt, then stop. Do not merge.
