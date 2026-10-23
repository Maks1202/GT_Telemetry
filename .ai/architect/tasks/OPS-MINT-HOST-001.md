# OPS-MINT-HOST-001

Status: AUTHORIZED (SysAdmin)

## Goal

Make Linux Mint host `mint` (`192.168.0.10`, SSH alias `mint`, user `maks`) the always-on machine for GT_Telemetry: clone the repo under `~/Projects`, install the native stack, and start the app automatically on system boot with proper systemd units (no crontab, rc.local, screen/tmux, or desktop autostart hacks).

## Scope

- SSH to `mint` using the existing local SSH config (`Host mint`).
- Ensure `~/Projects` exists; clone `git@github.com:Maks1202/GT_Telemetry.git` to `~/Projects/GT_Telemetry` if missing (or `git fetch` + checkout `main` if already present).
- Install runtime deps on the host only as needed for the native path in `README.md` (Python venv + `pip install -e ".[dev]"`, Node/npm for `apps/web`).
- Create a local untracked env file on the host for `GT7_PLAYSTATION_IP=192.168.0.136` (do not commit `.env`).
- Install and enable **systemd** units so both processes start at boot:
  - API: `apps/server` → `.venv/bin/python -m gt_telemetry.main`
  - Web: production-style path already in the repo — `npm run build` then `npm run preview` (not a long-lived `npm run dev` for boot).
- Verify listeners on `127.0.0.1:8787` and `127.0.0.1:5173` (or the port Vite preview prints), and that units are `enabled`.
- Write the SysAdmin run report under `.ai/sysadmin/runs/OPS-MINT-HOST-001.md` and store the prompt under `.ai/sysadmin/prompts/OPS-MINT-HOST-001.md`.

## Out of scope

- Application code changes (bind address, CORS, LAN exposure, new features).
- Docker / Kubernetes.
- Desktop installer.
- Changing SemVer / GitHub release.
- Opening the firewall for WAN; this stays a LAN/native localhost app per product locks.

## Acceptance

1. Repo present at `~/Projects/GT_Telemetry` on `mint`, tracking `main`.
2. Two systemd units (system or user+linger) start API + web after reboot without manual login tricks beyond linger if user units are used.
3. `curl`/`ss` shows the API healthy; web preview serves the UI.
4. Russian SysAdmin run report filed; next actor Architect closeout.

## Notes

- Product HTTP/WS are hardcoded to `127.0.0.1` in the web app; use the browser on `mint` (or an SSH tunnel). LAN bind is a future Develop task if the PO wants it.
- PS5 address stays in env only.
