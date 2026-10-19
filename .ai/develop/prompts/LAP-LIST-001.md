AGENT: DEVELOP
TASK: LAP-LIST-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-LIST-001.md
- .ai/architect/tasks/LAP-LIST-001.md
- apps/server/src/gt_telemetry/laps/record.py
- apps/server/src/gt_telemetry/tracks.py
- apps/server/src/gt_telemetry/api/app.py
- apps/server/src/gt_telemetry/main.py
- apps/server/tests/test_laps.py
- apps/web/src/App.tsx
- apps/web/src/index.css

TASK AND AUTHORIZATION
- Task id: LAP-LIST-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-LIST-001-lap-list
- Base: main
- Do not commit on main. Do not push. Do not change version 0.14.0.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Save the track name with each finished lap, list laps with pagination, and show a Laps page.

YOU DO NOT OWN
Lap detail canvas, scrubbing a point, clearing the live path, the amber arrow, version bumps, merge.

LOCKS
- No new dependency. No react-router. Hash routing only, as today.
- HTTP stays on 127.0.0.1:8787. The page itself must not scroll; the list box may.
- Lap finish rule stays: lap number increases and last_lap_ms > 0 while armed.
- Track name uses the existing match_track(x, z). Do not invent a track id from the packet.
- The Russian word неизвестно is the missing-track label.
- Allowed page sizes: 20, 50, 100. Default 20. Reject other limits with 400.

DATABASE
Add column track_name TEXT NOT NULL DEFAULT 'неизвестно' to laps. On connect, CREATE TABLE IF NOT EXISTS as today, then ALTER TABLE ... ADD COLUMN if the column is missing so old databases keep working.

On each armed append, remember the sample's position_x and position_z. On finish, match that point with TrackStore.match_track. If a track is returned, store its name. Otherwise store неизвестно. LapRecorder may take the same database Path and construct or receive a TrackStore; do not open a second product database file.

LIST API
GET /api/laps?offset=0&limit=20
- offset integer >= 0, default 0. limit one of 20, 50, 100, default 20.
- Order by id DESC (newest first).
- Response: {"total": N, "offset": O, "limit": L, "laps": [{"id", "lapNumber", "lapTimeMs", "trackName", "finishedAt"}, ...]}.
- Empty database: total 0 and laps [].
- Rows finished before this task have the default неизвестно. When listing such a row, read one finite x/z from its jsonl (the last line is enough), run match_track, and if a track matches, UPDATE that row's track_name and return the new name. If there is no match or the file is missing, leave неизвестно. Do not re-match a row that already has a non-default track_name.

PAGE
Hash #/laps shows the laps page. Add the nav link «Круги» beside Гонка and Трассы on every page. New file apps/web/src/laps/LapList.tsx.
On mount and when offset or page size changes, GET /api/laps. Show each row: lap number, formatted time m:ss.mmm, track name. Empty text: «Кругов пока нет».
Controls: page size 20 / 50 / 100, «Назад» and «Вперёд» disabled at the ends. Show which page range is visible (for example 1–20 из 45).
A row may be a link to #/laps/<id>. The detail page is out of scope; that hash may show an empty or «скоро» stub, or the list may stay until the next task. Prefer a link to #/laps/<id> and a short stub so the next task can fill it.
Page choice stays React state driven by the hash. No useState for the lap rows themselves if you can avoid it; plain variables in an effect and textContent / list rebuild are fine. A small useState for offset and page size is allowed because the owner changes them.

TESTS
In apps/server, PYTHONPATH=src .venv/bin/python -m pytest.
Cover: finish stores a matched track name; finish with no containing track stores неизвестно; GET /api/laps paginates with total; bad limit returns 400; old schema without the column still lists after connect.
In apps/web, npm run build must pass.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, pytest result, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
