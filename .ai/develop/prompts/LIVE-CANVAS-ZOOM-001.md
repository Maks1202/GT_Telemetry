AGENT: DEVELOP
TASK: LIVE-CANVAS-ZOOM-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LIVE-CANVAS-ZOOM-001.md
- apps/web/src/live/LiveTelemetry.tsx

TASK AND AUTHORIZATION
- Task id: LIVE-CANVAS-ZOOM-001
- Branch from current main: task/LIVE-CANVAS-ZOOM-001-zoom
- Do not commit on main. Do not push. Do not change version 0.8.0.
- Do not read, copy, or edit legacy/.

YOU OWN
Let the owner zoom and pan the existing path canvas without copying points or re-rendering React.

YOU DO NOT OWN
A pedal graph, server changes, a second path canvas, version bumps, merge.

LOCKS
- One path canvas. Colors, ribbon, and arrow stay. No useState. Point cap stays 30000.
- Remove the wheel, pointer, and double-click listeners in the effect cleanup.
- The page must not scroll. Call preventDefault on the wheel event.
- Do not add a library.

VIEW
Until the owner interacts, keep today's auto-fit. After a wheel or drag, stop auto-fitting. Store scale and pan in ordinary variables in the effect, not in React state.

- Wheel zooms toward the cursor, factor about 1.1 per tick, scale clamped from 1 to 40 relative to the fitted view.
- Drag pans.
- Double-click clears the user view and returns to auto-fit.
- Telemetry ticks redraw with the current view. Do not allocate a new point array for the redraw.

TESTS
npm run build in apps/web must pass.

DELIVERABLE
Commit on the feature branch. Return the SHA, build result, and the list of files.
