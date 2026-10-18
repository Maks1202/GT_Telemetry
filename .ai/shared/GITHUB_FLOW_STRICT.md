# Strict GitHub Flow (HARD)

Reviewer `Approved` is not `Completed`.

## Completed

A task is Completed only when all of these are true:

1. Developer finished and pushed nothing to `main` directly
2. Reviewer verdict is `Approved` or `Approved with comments`
3. Architect closeout status is `CLOSED`
4. The feature branch is merged into `main` fast-forward only
5. Local and remote feature branches for that task are deleted
6. Roadmap, `REPOSITORY_STATE.md`, and `TASK_JOURNAL.md` match `main`

Until then the task is open, even if the review verdict is already Approved.

## One at a time

Only one active task lifecycle. See `.ai/shared/TASK_LIFECYCLE.md`.

Do not authorize the next Develop task while any of these are true:

- previous task is unmerged
- working tree is dirty with task files
- a feature branch exists without a closed journal entry (zombie)
- merge queue is non-empty
- Repository State is `BLOCKED`

That condition is `BLOCKED`. Report it to the PO in Russian. Do not start a side task to "use the time".

## Branches

- Long-lived branch: `main` only. `main` is the source of truth.
- Feature branch, from current `main`: `task/<TASK-ID>-<short-slug>`
- Slug is English, lowercase, hyphenated
- No second long-lived branch, no direct product commits on `main`

## Commits

- Conventional Commits, English
- Developer commits on the feature branch only
- Before the Reviewer prompt: every task file is committed, working tree clean
- Architect commits on `main` only for docs authorization (when state is `CLEAN`) and for closeout doc sync after the fast-forward merge
- Architect does not commit application code, migrations, SQL, routes, or UI implementation

## Review gate

- Independent Reviewer only. Architect, Developer, SysAdmin, and Designer do not approve their own or each other's implementation as Reviewer
- No merge before that approval
- `Approved with comments` may merge only when the comments do not require code changes. If code changes are required, the verdict is `Changes requested`

## Closeout merge (Architect only)

After a qualifying Reviewer verdict:

```bash
git checkout main
git pull --ff-only
git merge --ff-only task/<TASK-ID>-<short-slug>
git branch -d task/<TASK-ID>-<short-slug>
```

When `origin` exists, closeout also updates the remote: push `main`, delete the remote feature branch. Do not force-push. Do not skip hooks.

If `--ff-only` fails: stop, leave the branch, set Repository State to `BLOCKED`, tell the PO in Russian. Do not rebase or merge creatively unless the PO explicitly authorizes that recovery.

Then sync docs on `main` (`REPOSITORY_STATE`, journal, roadmap, changelog if this closeout changed product code) and delete any leftover branch pointers.

## Dirty and zombie

| Condition | State | Allowed action |
| --- | --- | --- |
| Uncommitted task files | `BLOCKED` | Commit or discard only with PO consent; no new task |
| Feature branch not merged | `BLOCKED` | Finish review and closeout, or PO explicitly abandons |
| Branch with no open journal task | `BLOCKED` | Architect identifies it; no new Develop |
| `main` has unpushed closeout while a remote is the team's source of truth | not CLEAN yet | Finish the authorized push during closeout |

## Deploy

SysAdmin work is a separate authorized task. It stays blocked until `main` is `CLEAN` after the code closeout, unless the Architect task says otherwise in writing.
