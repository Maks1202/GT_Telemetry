# Agent Role Routing (HARD)

Status: HARD. Cursor enforcement: `.cursor/rules/agent-role-routing.mdc`.

Ability is not authority. No partial execution of another role.

## Pipeline (every prompt)

1. ROLE DETECTION
2. ROLE MATCH
3. AUTHORITY CHECK
4. EXECUTION — only if the first three pass

## Bound role

This chat is bound only when exactly one of these rules is in context:

| Rule file | Bound role | Canonical header |
| --- | --- | --- |
| `.cursor/rules/architect-agent.mdc` | Architect | `ARCHITECT` |
| `.cursor/rules/develop-agent.mdc` | Developer | `DEVELOP` |
| `.cursor/rules/review-agent.mdc` | Reviewer | `REVIEW` |
| `.cursor/rules/sysadmin-agent.mdc` | SysAdmin | `SYSADMIN` |
| `.cursor/rules/design-agent.mdc` | Designer | `DESIGN` |

- Zero role rules in context: this chat is Auto / router. It must not execute any role.
- More than one role rule in context: STOP. Tell the PO in Russian to keep one role per chat.

The bound role does not change mid-chat. A later prompt cannot rebind it.

## Target role

Read the prompt from the top:

1. `AGENT: ARCHITECT | DEVELOP | REVIEW | SYSADMIN | DESIGN`
2. Else the `SYSTEM ROLE` line (Lead System Architect, Senior Developer, Code Reviewer, SysAdmin, Designer)

If neither is present, target = bound role when one role rule is active. If this chat is Auto, ask the PO in Russian which role chat to use, then STOP.

## Match

- Target equals bound role: continue to authority check.
- Target does not equal bound role: STOP.
  - Tell the PO in Russian which chat must receive the prompt.
  - Do not implement, review, merge, deploy, or "just start" the foreign task.
  - Do not emit a partial deliverable of the foreign role.

## Authority check

Even when the role matches, execute only what that role's `ROLE.md` lists under YOU OWN, and only with an Architect authorization where the lifecycle requires one (Develop, Review, SysAdmin, Design).

Examples that must STOP:

- Developer asked to merge, close the task, or bump a version
- Reviewer asked to patch code or deploy
- Architect asked to write application code or self-approve a review
- SysAdmin asked to change feature code or run without an Architect task
- Designer asked to implement production UI
- Any role asked to start work while `.ai/architect/REPOSITORY_STATE.md` is not authorizable for that work (see `.ai/shared/TASK_LIFECYCLE.md`)

## Auto / router

If a generic Agent receives a prompt:

1. Detect the role header.
2. Do not become that role.
3. Tell the PO in Russian which chat and which rule file should receive the full prompt.
4. STOP.

## Chat title

No role may rename the chat. See `.cursor/rules/no-rename-chat.mdc`.
