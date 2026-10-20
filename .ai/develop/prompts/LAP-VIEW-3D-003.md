AGENT: DEVELOP
TASK: LAP-VIEW-3D-003

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-VIEW-3D-003.md
- .ai/architect/tasks/LAP-VIEW-3D-003.md
- apps/web/src/laps/lapView3d.ts

TASK AND AUTHORIZATION
- Task id: LAP-VIEW-3D-003
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-VIEW-3D-003-station-ribbon
- Base: main
- Do not commit on main. Do not push. Do not change version 0.20.1.
- Do not read, copy, or edit legacy/.
- Do not edit race LiveTelemetry or TrackEditor.
- You may not expand this task.

YOU OWN
Replace the glitchy index-paired 3D track ribbon with a station + cross-section quad mesh between inner and outer edges.

YOU DO NOT OWN
Version bumps, merge, starting the app, race page, track editor, server.

LOCKS
- Stay on three@0.186.1. No new heavy deps unless a tiny well-known helper is truly needed (prefer pure TS geometry in lapView3d.ts).
- Keep on-demand render, Stats, 2D/3D toggle, gray ribbon intent, lit car, pedal path.
- Remove (do not keep as primary) the old inner[i]/outer[i] strip / arc-length index pairing as the surface builder.
- Cap station count reasonably (e.g. similar spirit to RIBBON_POINT_CAP) so build stays fast.
- Page must not scroll. HTTP 127.0.0.1:8787.

ALGORITHM (required)
1. Inputs: edges.inner and edges.outer (XYZ polylines). Handle closed loops when first≈last.
2. Build a centerline along the track between the two edges (e.g. resample both by arc-length to N, phase-align outer including reverse + circular shift to minimize pairing cost, then midpoint samples — OR walk one edge and project onto the other; pick a robust approach and document in a short code comment).
3. Place stations at roughly equal arc-length steps along that centerline (count capped).
4. At each station, form a cross-section: left/right points on inner and outer (intersection of the local perpendicular in XZ with each edge polyline, with a sensible fallback to nearest point on that edge if the ray misses).
5. Between station i and i+1 (and wrap if closed): emit one quad (4 corners) = two triangles. Use Y from the edge points. computeVertexNormals.
6. Draw gray edge lines from the (possibly lightly simplified) inner/outer polylines.
7. Ribbon material: gray, preferably lit (MeshStandard/Lambert) with transparent opacity similar to today; keep car lighting working.

Fallback: if fewer than 2 stations or edges too short, draw edge lines only (no broken mesh).

TESTS
apps/web: npm run build must pass.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return SHA, build result, brief note on the centerline/cross-section choice, English Reviewer prompt. Do not merge.
