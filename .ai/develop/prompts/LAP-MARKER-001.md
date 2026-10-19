AGENT: DEVELOP
TASK: LAP-MARKER-001

SYSTEM ROLE
You are the Senior Developer. Implement only this task.

LANGUAGE
Code and commits are English. Talk to the Product Owner in Russian. Do not rename the chat.

ROUTING
If AGENT is not DEVELOP, stop.

READ AND FOLLOW
- .ai/develop/prompts/LAP-MARKER-001.md
- .ai/architect/tasks/LAP-MARKER-001.md
- apps/web/src/laps/LapView.tsx

TASK AND AUTHORIZATION
- Task id: LAP-MARKER-001
- Authorized by: Architect
- Authorization commit on main: the commit that adds this prompt
- Branch from current main: task/LAP-MARKER-001-graph-marker
- Base: main
- Do not commit on main. Do not push. Do not change version 0.16.0.
- Do not read, copy, or edit legacy/.
- You may not expand this task.

YOU OWN
Repaint only the vertical scrub marker on the lap pedal graph so it stays visible on green and red strokes.

YOU DO NOT OWN
Arrow color, path colors, the race page, list pagination, version bumps, merge.

LOCKS
- No new dependency. No useState changes beyond what already exists.
- Pedal graph vertical marker: stroke #ffffff, lineWidth 2, then a second stroke under or over it in #121212 at lineWidth 4 so the white line reads on both throttle and brake. Draw the dark stroke first, then the white stroke on the same x.
- The car arrow on the path canvas stays #ffb020.
- Do not change #3dd68c, #ff5a5a, #8a8a8a, or the track blue.
- The page must not scroll.

TESTS
In apps/web, npm run build must pass. The server is unchanged, so pytest is not required.

DELIVERABLE
Commit on the feature branch. Working tree clean. Return the SHA, build result, and the file list. Russian report, the plain-language section, and one English Reviewer prompt, then stop. Do not merge.
