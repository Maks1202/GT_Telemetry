AGENT: DEVELOP
TASK: LAP-VIEW-3D-005

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-VIEW-3D-005.md
- .ai/architect/tasks/LAP-VIEW-3D-005.md
- apps/web/src/laps/lapView3d.ts
- apps/web/src/laps/LapView.tsx

TASK AND AUTHORIZATION
- Task id: LAP-VIEW-3D-005
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-VIEW-3D-005-fat-path-graph
- Base: main
- Do not commit on main. Do not push. Do not change version 0.20.3.
- Do not read, copy, or edit legacy/.
- Do not edit race LiveTelemetry or TrackEditor.
- You may not expand this task.

YOU OWN
1) Make the 3D lap trajectory ~4× thicker with real on-screen width.
2) In 3D mode, sync the pedal graph window to the zoomed/near-car view (section of the lap, not always full).

YOU DO NOT OWN
Version bumps, merge, app restart, track ribbon rebuild, 2D path stroke changes unless needed for shared constants only.

LOCKS
- Stay on three@0.186.1. Prefer three/addons lines (Line2, LineGeometry, LineMaterial) for fat path strokes. Edge lines may stay thin.
- Path colors stay pedal mix / coast. Car, ribbon, Stats, orbit clamp unchanged.
- On-demand 3D render stays (no idle loop). Graph updates on controls change are allowed.
- Page must not scroll. HTTP 127.0.0.1:8787.

FAT PATH
- Replace thin THREE.Line path runs with fat lines whose pixel width is about 4× the previous perceived hairline (e.g. LineMaterial linewidth around 4 if baseline was ~1, or document the chosen baseline).
- Dispose fat-line geometries/materials correctly on setData/dispose.
- Resolution / renderer size must be set on LineMaterial when the canvas resizes.

3D GRAPH WINDOW
- While pathMode is 3D, update LapView graphWindowLo/Hi from the 3D camera (similar spirit to 2D updateGraphWindow):
  - Prefer: project lap samples with the PerspectiveCamera; samples whose NDC/screen position falls inside the canvas (with a small margin) define lo..hi; always include selectedIndex when set.
  - When nearly all samples are “visible” or camera is far, use full 0..n-1.
  - When zoomed near the car, only a local index range remains → graph shows that section.
- Wire OrbitControls `change` (and setSelectedIndex / setData as needed) to refresh the graph window and call paintGraph (expose a callback from createLapView3dScene, e.g. onViewChange).
- 2D mode keeps existing updateGraphWindow behavior.

TESTS
apps/web: npm run build must pass.

DELIVERABLE
Commit on the feature branch. Return SHA, build, brief notes, Reviewer prompt. Do not merge.
