AGENT: DEVELOP
TASK: LAP-GRAPH-ZOOM-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-GRAPH-ZOOM-001.md
- .ai/architect/tasks/LAP-GRAPH-ZOOM-001.md
- apps/web/src/laps/LapView.tsx

TASK AND AUTHORIZATION
- Task id: LAP-GRAPH-ZOOM-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-GRAPH-ZOOM-001-graph-zoom
- Base: main
- Do not commit on main. Do not push. Do not change version 0.16.1.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Keep the lap pedal graph in sync with the visible path camera window.

YOU DO NOT OWN
The race-page live pedal graph, list pagination, marker color redesign, version bumps, merge.

LOCKS
- No new dependency. No chart library. No useState for samples.
- Edit only apps/web/src/laps/LapView.tsx unless a tiny shared helper in that file is enough.
- Path zoom, pan, double-click fit, scrub, colors, and the white/dark scrub marker stay.
- The page must not scroll.

GRAPH WINDOW
On every path redraw, compute the inclusive sample index range that belongs to the current path view:
- Project each sample with the same project() as the path.
- A sample is visible when its canvas point lies inside the path canvas CSS rectangle expanded by 8 CSS pixels on each side.
- If at least two samples are visible, the graph window is from the smallest visible index to the largest visible index.
- If exactly one sample is visible, expand the window by up to 10 indices on each side, clamped to the lap.
- If none are visible, keep the previous window if it was set; on the first paint use the full lap 0 .. n-1.
- If the selected scrub index is outside that window, expand the window just enough to include it.
- While the path is still on auto-fit (user has not zoomed or panned), the window is always the full lap.

Draw the pedal graph only for samples in that window. Map index lo .. hi across the full graph width. Throttle and brake colors stay. The vertical scrub marker uses the same white/dark strokes and sits at the selected index inside that window. If nothing is selected, draw no marker.

Clicking the graph still scrubs: nearest index by x among the indices currently shown in the window. Clicking the path still picks the nearest sample in screen space among all lap samples, then the graph window expands if needed so the marker is visible.

Double-click fit clears the zoom interaction and restores the full-lap graph.

TESTS
In apps/web, npm run build must pass. The server is unchanged, so pytest is not required.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
