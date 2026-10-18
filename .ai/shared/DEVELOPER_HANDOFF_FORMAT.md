# Developer Handoff Format

A Develop handoff is a full English prompt, not a chat checklist.

## Who writes it

Architect only, after:

- repository state is authorizable (`.ai/shared/TASK_LIFECYCLE.md`)
- acceptance criteria exist in `.ai/architect/tasks/<TASK-ID>.md`
- `REPOSITORY_STATE.md` and `TASK_JOURNAL.md` name this task as the single active Develop task
- the authorization docs commit is on `main` (docs only)

## Where it lives

| Copy | Location |
| --- | --- |
| Contract inside the Architect task | `.ai/architect/tasks/<TASK-ID>.md` |
| Chat handoff | last block of the Architect reply, one `text` fence |
| Branch record | `.ai/develop/prompts/<TASK-ID>.md` committed by Developer, unchanged |

Developer does not rewrite the authorization. Scope changes require a new Architect prompt.

## Required shape

Follow `.ai/shared/DEVELOPER_PROMPT_CANON.md` in order:

1. SYSTEM ROLE
2. LANGUAGE
3. ROUTING
4. READ AND FOLLOW
5. TASK AND AUTHORIZATION
6. YOU OWN / DO NOT OWN
7. LOCKS
8. OBJECTIVE
9. IN SCOPE / OUT OF SCOPE
10. VALIDATION
11. DELIVERABLE

## Quality bar

The Developer must be able to start from the fence alone, without this chat:

- task id, branch name, base branch
- what "done for review" means
- in scope and out of scope
- locks (version, native stack, files not to touch)
- validation to run
- instruction to stop after the Reviewer prompt

## Forbidden handoffs

- bullet fragments ("do the API, then tests")
- Russian inside the fence
- more than one `text` fence
- a prompt that tells Developer to merge, deploy, or pick a version
- a second Develop task while one lifecycle is open
