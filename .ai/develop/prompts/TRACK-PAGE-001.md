AGENT: DEVELOP
TASK: TRACK-PAGE-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/TRACK-PAGE-001.md
- .ai/architect/tasks/TRACK-PAGE-001.md
- apps/web/src/App.tsx
- apps/web/src/live/LiveTelemetry.tsx
- apps/web/src/index.css
- apps/server/src/gt_telemetry/api/app.py

TASK AND AUTHORIZATION
- Task id: TRACK-PAGE-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/TRACK-PAGE-001-track-page
- Base: main
- Do not commit on main. Do not push. Do not change version 0.11.0.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Split the interface into a race page and a track-editor page. Move edge recording onto the editor.

YOU DO NOT OWN
Lap Start/Stop, a track id from the packet, Three.js, server match-rule changes, version bumps, merge.

LOCKS
- No new dependency. No react-router. No chart library.
- No useState for telemetry, the path, the track list, or the recording points. The visible page may be React state, because it changes only when the owner picks a page.
- TRACK on the race page still updates through textContent.
- Do not fetch GET /api/tracks on every WebSocket message.
- Keep the 10 Hz socket. HTTP stays on 127.0.0.1:8787.
- The page itself must not scroll. A long track list may scroll inside its own box.
- Do not clear the race driving path when the matched track changes.
- Leaving the editor mid-recording does not save that partial edge.

PAGES
Hash `#/tracks` shows the editor. An empty hash, `#/`, and `#/race` show the race page. Both pages have links «Гонка» and «Трассы». The open page is visually marked.

RACE
Remove the track-name input, both edge buttons, the edge status line, and the recording logic from the race page. Keep gauges, pedal graph, colored path, arrow, zoom, pan, and the existing match: one containing track draws its ribbon and name; zero or several draw no ribbon and «неизвестно». Loading the track list on mount stays.

EDITOR
New file apps/web/src/tracks/TrackEditor.tsx. On mount, GET /api/tracks. Show each name with the inner point count and the outer point count. Empty list text: «Трасс пока нет».

One text input for the track name only. There are no side-name fields. Clicking a row puts that name in the input and draws that track. If the typed name equals a saved name, draw that saved track.

Canvas shows that track's edges and the ribbon when both edges have at least 2 points, the live car arrow, and the stroke of the side currently being recorded. Do not draw the colored race path here. Wheel zooms toward the cursor by about 1.1, scale 1 to 40 relative to the fitted view, drag pans, double-click fits again. Until the first interaction, auto-fit stays. View variables live in the effect. preventDefault on wheel. Remove listeners on cleanup.

Buttons «Запись внутренней стороны» and «Запись внешней стороны». The active button reads «Стоп». An empty name sets status «Укажите имя» and does not record. While recording, append a connected sample's X, Y, Z at the socket rate, skip a point closer than 0.5 m in XZ to the previous one, and cap at 20000 points. Stopping posts the existing /api/track body {name, edge, points}. That replaces only that edge. Then reload the list and keep the name. The other edge stays.

TESTS
apps/web: npm run build. If you do not change the server, say that pytest was not required. If you change it, run pytest and keep it green.

DELIVERABLE
Commit on the feature branch, including this prompt. Working tree clean. Return the SHA, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
