AGENT: DEVELOP
TASK: LAP-VIEW-3D-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-VIEW-3D-001.md
- .ai/architect/tasks/LAP-VIEW-3D-001.md
- apps/web/src/laps/LapView.tsx
- apps/web/src/index.css
- apps/web/package.json

TASK AND AUTHORIZATION
- Task id: LAP-VIEW-3D-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-VIEW-3D-001-lap-3d
- Base: main
- Do not commit on main. Do not push. Do not change version 0.19.2.
- Do not read, copy, or edit legacy/.
- You may not expand this task to the race page or track editor.

YOU OWN
Lap view PATH block: 2D/3D modes, gray track ribbon, Three.js 3D scene with height, on-demand render, 3D car marker, focus/zoom behavior, Stats FPS, CSS for the mode toggle and stats placement.

YOU DO NOT OWN
Race LiveTelemetry, TrackEditor, server API, version bumps, merge.

LOCKS
- Add dependency: three@0.186.1 (pin exact; if registry requires a newer 0.186.x patch, document it). Prefer types from the three package. Optional: use three/addons Stats (stats.module.js) — no separate chart library.
- Prefer keeping LapView's existing effect/ref style (no useState for telemetry/path scrub) unless a tiny local mode flag via DOM/textContent is cleaner for 2D/3D; do not introduce a heavy React state rewrite.
- HTTP stays on 127.0.0.1:8787. The page must not scroll.
- Do not change pedal graph colors #3dd68c / #ff5a5a or scrub marker white/dark.
- Race page and track editor keep blue ribbon; only lap view ribbon becomes gray.

2D MODE
- Keep current canvas path drawing, zoom/pan, scrub click, graph sync.
- Change lap-view ribbon/edge colors from blue to gray (e.g. edge ~#8a8a8a, fill rgba gray with similar opacity to today's ribbon). Trajectory pedal colors and amber arrow stay.
- When mode is 2D, hide the WebGL canvas (or do not mount continuous work); 2D canvas visible.

3D MODE
- Show a WebGL canvas (second canvas or replace visibility) in the same PATH block.
- Build track surface from inner/outer edge XYZ (use sample/track Y for height). Gray ribbon/surface and gray edge lines.
- Draw the lap trajectory in 3D with the same pedal coloring rules as 2D (throttle/brake/coast).
- Car marker: 3D mesh — triangle base in the ground plane of the car heading, plus a vertex above the hypotenuse/base so it reads as a small pyramid (amber #ffb020 like the 2D arrow).
- Default camera: orbit target at track center (bounds of edges or path); zoom/orbit via OrbitControls (three/addons).
- Click car marker: set orbit target (focus) to the car; subsequent zoom is relative to that focus (OrbitControls target).
- Click empty path in 3D may still scrub nearest sample if practical; at minimum, scrub from the existing pedal graph must update the 3D car pose and path highlight and trigger a render.
- Render on demand ONLY: no idle requestAnimationFrame render loop. Call renderer.render when: OrbitControls change (use controls.addEventListener('change', ...)), resize, mode switch to 3D, lap data load, and whenever selectedIndex / car marker pose changes (path scrub or graph scrub).
- Stats: show FPS overlay inside the PATH / canvas block (three Stats or equivalent). Stats may tick only when a render happens, or use its usual panel but do not force a continuous scene render solely for Stats — acceptable to update Stats on each on-demand render. Place it so it does not block the 2D/3D toggle.

UI
- Corner of the PATH canvas block: two mode controls labeled clearly for 2D and 3D (buttons or segmented control). Active mode visible.
- Switching modes preserves the selected scrub index and gauge readings.

TESTS
- apps/web: npm run build must pass.
- Server unchanged; pytest not required.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return SHA, build result, file list, and one English Reviewer prompt, then stop. Do not merge. Do not start the app unless needed for build.
