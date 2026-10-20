AGENT: DEVELOP
TASK: LAP-VIEW-3D-002

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-VIEW-3D-002.md
- .ai/architect/tasks/LAP-VIEW-3D-002.md
- apps/web/src/laps/lapView3d.ts
- apps/web/src/laps/LapView.tsx

TASK AND AUTHORIZATION
- Task id: LAP-VIEW-3D-002
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-VIEW-3D-002-track-light
- Base: main
- Do not commit on main. Do not push. Do not change version 0.20.0.
- Do not read, copy, or edit legacy/.
- Do not edit race LiveTelemetry or TrackEditor.
- You may not expand this task.

YOU OWN
Fix the glitchy 3D track ribbon mesh and add lighting so the 3D car pyramid shows form (not a flat solid color).

YOU DO NOT OWN
New modes, server changes, version bumps, merge, starting the app.

LOCKS
- Stay on three@0.186.1 (already installed). No new chart libs.
- Keep on-demand render (no idle animation loop). Lights do not require a continuous loop.
- Keep gray ribbon intent, pedal path colors, Stats, 2D/3D toggle, focus/zoom behavior.
- Prefer changes in lapView3d.ts; touch LapView.tsx only if wiring is required.
- The page must not scroll. HTTP stays on 127.0.0.1:8787.

TRACK MESH
- Rebuild ribbon triangulation so it does not twist/glitch when inner and outer edge lengths or sampling differ.
- Resample both edges by arc-length (or equivalent) to a shared count; if outer runs opposite to inner, reverse it before stitching.
- Close the loop when first/last points are near (common for circuit edges).
- Recompute normals. Keep gray translucent ribbon + gray edge lines. Avoid obvious z-fighting with the path if cheap (slight Y offset or similar is ok).

LIGHTING AND CAR
- Add scene lights (e.g. HemisphereLight + DirectionalLight, or Ambient + Directional) so meshes shade.
- Car pyramid: MeshLambertMaterial or MeshStandardMaterial with color #ffb020 (and reasonable roughness if Standard). Not MeshBasicMaterial.
- Ribbon may stay Basic or use a lit material that still reads gray; car shading is the hard requirement.
- computeVertexNormals on the car mesh (already present — keep it).

TESTS
apps/web: npm run build must pass. Server unchanged.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return SHA, build result, file list, English Reviewer prompt. Do not merge.
