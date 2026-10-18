# Development Process

How this repository runs agents. Product scope is not decided here.

## Roles

| Role | Rule | Contract | Starts work when |
| --- | --- | --- | --- |
| Architect | `.cursor/rules/architect-agent.mdc` | `.ai/architect/ROLE.md` | PO request in the Architect chat |
| Developer | `.cursor/rules/develop-agent.mdc` | `.ai/develop/ROLE.md` | Architect Develop prompt |
| Reviewer | `.cursor/rules/review-agent.mdc` | `.ai/review/ROLE.md` | Developer Reviewer prompt |
| SysAdmin | `.cursor/rules/sysadmin-agent.mdc` | `.ai/sysadmin/ROLE.md` | Architect SysAdmin prompt |
| Designer | `.cursor/rules/design-agent.mdc` | `.ai/design/ROLE.md` | Architect `DESIGN-*` prompt |
| Auto | no role rule | `.ai/shared/AGENT_ROLE_ROUTING.md` | never executes a role |

PO uses one chat per role. Each chat has exactly one role rule. Auto only tells the PO where to paste the prompt.

## Feature sequence

1. Architect writes the task, acceptance criteria, and docs authorization on clean `main`.
2. Architect hands Developer one English prompt (`.ai/shared/DEVELOPER_HANDOFF_FORMAT.md`).
3. Developer branches from `main`, implements, commits, stops with one Reviewer prompt.
4. Reviewer reviews the committed branch and issues a verdict. Reviewer does not edit code.
5. If changes are requested, Developer remediates on the same branch and requests review again.
6. If approved, Architect fast-forwards into `main`, deletes the feature branch, syncs state docs.
7. Optional: Architect authorizes SysAdmin only after `main` is `CLEAN`.
8. Optional: Designer runs only on an Architect `DESIGN-*` task, with no production code.

## Hard policies

- Language: `.ai/shared/AGENT_LANGUAGE_POLICY.md`
- Routing: `.ai/shared/AGENT_ROLE_ROUTING.md`
- Reporting: `.ai/shared/AGENT_REPORTING_POLICY.md`
- Git: `.ai/shared/GITHUB_FLOW_STRICT.md`
- Lifecycle: `.ai/shared/TASK_LIFECYCLE.md`

## Locks (default)

- Native stack only. Docker and Kubernetes are forbidden unless the PO explicitly lifts the lock in a later decision, recorded in `REPOSITORY_STATE.md`.
- Do not invent product domains, frameworks, databases, UI kits, or cloud vendors.
- Desktop installer builds: not reserved yet. If the PO later reserves them, record a PO lock and SysAdmin must not build them.
- No destructive wipe and no invented secrets unless the PO explicitly authorizes that action in the same request.
- Phase Lock starts `OFF`.

## Versioning (proposal only)

Not decided. Do not hard-code a scheme in packages.

Proposed rule, pending PO decision:

- One product version string, shared across packages if this later becomes a monorepo
- Architect bumps that version on code closeout only
- Docs-only closeout does not bump the version
- Developer must not choose or edit the version number

Until the PO chooses a scheme, there is no version file and no release number.

## State files

- `.ai/architect/REPOSITORY_STATE.md` — active work and locks
- `.ai/architect/TASK_JOURNAL.md` — what happened
- `.ai/architect/tasks/` — task specs
- `docs/architecture/roadmap.md` — product phases, currently empty
- `.ai/architect/CHANGELOG.md` — user-visible product changes, currently empty

## Definition of done

See "Completed" in `.ai/shared/GITHUB_FLOW_STRICT.md`. A green review is a gate, not the end.
