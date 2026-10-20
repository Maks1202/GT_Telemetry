AGENT: DEVELOP
TASK: LAP-VIEW-3D-004

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-VIEW-3D-004.md
- .ai/architect/tasks/LAP-VIEW-3D-004.md
- apps/web/src/laps/lapView3d.ts

TASK AND AUTHORIZATION
- Task id: LAP-VIEW-3D-004
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-VIEW-3D-004-orbit-horizon
- Base: main
- Do not commit on main. Do not push. Do not change version 0.20.2.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Clamp OrbitControls vertical angle so the view can reach the horizon and 2 degrees below it, not further under the track.

YOU DO NOT OWN
Version bumps, merge, app restart, ribbon geometry changes.

LOCKS
- Change only apps/web/src/laps/lapView3d.ts OrbitControls setup.
- Three.js Y-up: set controls.maxPolarAngle = Math.PI / 2 + THREE.MathUtils.degToRad(2) (or equivalent).
- Keep controls.minPolarAngle = 0 (top view allowed).
- Keep on-demand render and all other 3D behavior.
- npm run build must pass.

DELIVERABLE
Commit on the feature branch. Return SHA, build, Reviewer prompt. Do not merge.
