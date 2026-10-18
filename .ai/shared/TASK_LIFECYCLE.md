# Task Lifecycle

One active lifecycle at a time. Source of truth for "what is active" is `.ai/architect/REPOSITORY_STATE.md` plus `main`.

## States

| State | Meaning | Who may set it |
| --- | --- | --- |
| `DRAFT` | Architect is writing the spec. Not active Develop. | Architect |
| `AUTHORIZED` | Docs authorization is on `main`. Develop has not started. | Architect |
| `IN_DEVELOP` | Feature branch work is in progress. | Developer, after authorization |
| `IN_REVIEW` | Branch committed, tree clean, Reviewer prompt issued. | Developer → Reviewer |
| `CHANGES_REQUESTED` | Reviewer requires code changes. | Reviewer |
| `APPROVED` | Review verdict only. Not Completed. | Reviewer |
| `MERGE_CLOSEOUT` | Architect is merging and cleaning branches. | Architect |
| `CLOSED` | Merged, branches deleted, docs synced. | Architect |
| `SYSADMIN_AUTHORIZED` | Deploy/ops task allowed. `main` must be `CLEAN`. | Architect |
| `IN_SYSADMIN` | SysAdmin is executing that task. | SysAdmin |
| `SYSADMIN_DONE` | Run report delivered. Awaiting Architect closeout. | SysAdmin |
| `DESIGN_AUTHORIZED` / `IN_DESIGN` / `DESIGN_DONE` | Design task only. | Architect / Designer |
| `BLOCKED` | Unmerged, dirty, or zombie. | Any role that detects it |

`APPROVED` ≠ `CLOSED` ≠ Completed. Completed means `CLOSED` plus merge and cleanup (`.ai/shared/GITHUB_FLOW_STRICT.md`).

## Active

Active means any state from `AUTHORIZED` through `MERGE_CLOSEOUT`, or an open SysAdmin/Design task, or `BLOCKED`.

`DRAFT` is not active Develop. Do not keep a draft open in a way that hides a dirty tree.

## Legal transitions

```text
DRAFT → AUTHORIZED → IN_DEVELOP → IN_REVIEW
IN_REVIEW → APPROVED → MERGE_CLOSEOUT → CLOSED
IN_REVIEW → CHANGES_REQUESTED → IN_DEVELOP
CLOSED → (optional) SYSADMIN_AUTHORIZED → IN_SYSADMIN → SYSADMIN_DONE → CLOSED
DRAFT → DESIGN_AUTHORIZED → IN_DESIGN → DESIGN_DONE → CLOSED
any → BLOCKED
```

- Developer does not move a task to `APPROVED`, `CLOSED`, or `MERGE_CLOSEOUT`
- Reviewer does not move a task to `CLOSED` and does not merge
- SysAdmin does not close the ops task; Architect does, after the run report
- Designer does not open Develop

## Authorization rules

Architect may move `DRAFT` → `AUTHORIZED` only when Repository State is `CLEAN`, Phase Lock is `OFF`, merge queue is empty, and no other lifecycle is active.

Architect may authorize SysAdmin only when the related code task is `CLOSED` and `main` is `CLEAN`, or when the PO explicitly authorizes ops that are not a code deploy.

Architect may authorize `DESIGN-*` only as its own lifecycle, while no Develop/SysAdmin lifecycle is active.

## Abandon

Only the PO may abandon an active task. Architect then records the decision, removes or freezes the branch as the PO directs, and returns state to `CLEAN` or leaves `BLOCKED` if git is still dirty.

## This bootstrap

`BOOTSTRAP-MULTI-AGENT-PROCESS-001` is a direct PO order to Architect to commit process docs on `main`. It is not a Develop/Review product lifecycle and does not authorize a product feature.
