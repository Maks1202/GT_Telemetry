# Repository State

- Source of truth: `main`
- Active Develop: none
- Active SysAdmin: none
- Active Design: none
- Merge queue: empty
- Phase Lock: OFF
- Repository State: CLEAN
- Product stack / domains: not chosen yet
- Versioning scheme: UNDECIDED (proposal only in `.ai/shared/DEVELOPMENT_PROCESS.md`)

## Locks

- Native stack only. Docker/Kubernetes: forbidden until the PO records an explicit override here.
- Desktop installer builds: no PO lock recorded yet.
- Destructive wipe / new secrets: forbidden unless the PO authorizes that action in the same request.

## Notes

- Process bootstrap `BOOTSTRAP-MULTI-AGENT-PROCESS-001` is docs and Cursor rules only.
- Pre-existing path `legacy/` is not an active task. Do not modify it unless a future Architect task says so.
- Do not authorize Develop until the PO describes the product and asks for a real task.

Last updated: 2026-10-18  
Updated by: Architect (`BOOTSTRAP-MULTI-AGENT-PROCESS-001`)
