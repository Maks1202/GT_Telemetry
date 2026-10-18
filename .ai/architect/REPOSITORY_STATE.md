# Repository State

- Source of truth: `main`
- Active Develop: `LIVE-THROTTLE-BRAKE-001` (`AUTHORIZED`, branch not created yet)
- Active SysAdmin: none
- Active Design: none
- Merge queue: empty
- Phase Lock: OFF
- Repository State: ACTIVE
- Product: existing GT7 dashboard at `legacy/gt7dashboard` (Python, Bokeh, UDP). No new stack.
- Versioning: SemVer, current `1.0.0` (`.ai/shared/VERSIONING.md`). Not bumped: no product code has changed.

## Locks

- Native stack only. Docker/Kubernetes: forbidden until the PO records an explicit override here.
- Desktop installer builds: no PO lock recorded yet.
- Destructive wipe / new secrets: forbidden unless the PO authorizes that action in the same request.
- Do not hardcode the console IP. Use `GT7_PLAYSTATION_IP`.
- Do not push `legacy/gt7dashboard` to `https://github.com/snipem/gt7dashboard`.

## Notes

- Console observed at `192.168.0.136`: decrypted packets, throttle `0.0`, brake `0.0`, speed `0.0`. Pedal movement was not observed.
- Default heartbeat target `255.255.255.255` fails on this Mac with errno 49.
- Existing venv cannot import scipy, so `bokeh serve` does not start until that import is repaired.
- `legacy/` may change only inside this authorized task, and only as the task file describes.

Last updated: 2026-10-18  
Updated by: Architect (`LIVE-THROTTLE-BRAKE-001`)
