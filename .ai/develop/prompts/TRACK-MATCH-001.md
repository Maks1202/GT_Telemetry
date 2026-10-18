AGENT: DEVELOP
TASK: TRACK-MATCH-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/TRACK-MATCH-001.md
- .ai/architect/tasks/TRACK-MATCH-001.md
- .ai/architect/REPOSITORY_STATE.md
- apps/server/src/gt_telemetry/tracks.py
- apps/server/src/gt_telemetry/api/app.py
- apps/server/tests/test_tracks.py
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: TRACK-MATCH-001
- Authorized by: Architect
- Authorization commit on main: see task file, committed before this branch
- Branch from current main: task/TRACK-MATCH-001-match-track
- Base: main
- Do not commit on main. Do not push. Do not change version 0.10.1.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Choose the saved track whose two boundaries contain the live car, and draw that track on the existing race canvas.

YOU DO NOT OWN
A second page, moving the edge buttons, Start/Stop lap recording, Three.js, a track id from the packet, version bumps, merge.

LOCKS
- One active task. Native stack only. No new dependency. No chart library.
- Do not choose the product version.
- No useState for telemetry, the path, or the track list. Update the TRACK label with textContent.
- Do not call the match on a timer faster than the existing 10 Hz message, and do not HTTP-fetch the track list on every message.
- Y is height. The test uses X and Z only.
- Keep GET /api/track/latest. The race ribbon must not use it.
- The page must not scroll. Do not clear the live driving path when the track match changes.
- HTTP stays on 127.0.0.1:8787.

MATCH
Add TrackStore.list_tracks() and TrackStore.match_track(x, z).

GET /api/tracks returns {"tracks": [...]} ordered by name. Each item is {"name", "inner", "outer"} with the same point objects as latest. Include a track that has only one edge. An empty database returns {"tracks": []}.

match_track returns that same track object, or None.

Skip a track unless both edges have at least 2 points. Build the ring as outer points in saved order, then inner points reversed. Each ring vertex is (x, z).

A point is inside when it lies on any ring edge, or when the even-odd count is odd. Walk each edge from vertex i to vertex i+1, wrapping to the first. On an edge: the absolute cross product of (point - start) and (end - start) is at most 1e-6, the dot product of those same vectors is >= 0, and that dot product is <= the squared length of (end - start). For the ray: if the two endpoints are on opposite sides of the point's Z using strict greater-than, compute the intersection X and count it when the point's X is <= that intersection. Non-finite x or z returns None. If two or more tracks contain the point, return None.

The page loads GET /api/tracks once when the live view starts, and again after a successful edge save. Keep the list in a plain variable. On each connected live message with finite positionX and positionZ, run the same test in the browser. Exactly one hit: draw that track's existing ribbon and set TRACK to its name. Zero or several hits: draw no saved ribbon and set TRACK to «неизвестно». A disconnected message does not clear the ribbon already drawn. The in-progress edge recording stroke stays.

TESTS
In apps/server, PYTHONPATH=src .venv/bin/python -m pytest.
Cover: a point in the middle of one closed pair matches; a far point matches nothing; a track with one edge does not match; two overlapping tracks return no match; GET /api/tracks lists saved names.
In apps/web, npm run build must pass.

DELIVERABLE
Commit on the feature branch, including this prompt. Working tree clean. Return the SHA, pytest result, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
