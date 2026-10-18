# LIVE-THROTTLE-BRAKE-001

Status: SUSPENDED. Do not implement. The PO replaced this Bokeh patch with ADR-001. `legacy/` is a protocol reference, not the product. No branch was created.  
Date: 2026-10-18  
Product: existing Gran Turismo 7 dashboard in `legacy/gt7dashboard` (upstream `https://github.com/snipem/gt7dashboard`, gitlink `2da3afd901d052a62c3e0f24e8a42599081687f3`).

## Objective

The running dashboard shows the current throttle percent and brake percent from live GT7 packets, including while a lap is still in progress.

## Confirmed data path

1. Heartbeat is the UTF-8 byte `A` to UDP `33739` (`GT7Communication._send_hb`).
2. The receiver binds UDP `0.0.0.0:33740`.
3. `salsa20_dec` uses key `Simulator Interface Packet GT7 ver 0.0`, IV from bytes `0x40:0x44` xor `0xDEADBEAF`, and accepts magic `0x47375330` (`G7S0`).
4. A newer `package_id` replaces `GT7Communication.last_data` with `GTData`.
5. `GTData.throttle` is byte `0x91 / 2.55`. `GTData.brake` is byte `0x92 / 2.55`.
6. Nothing in the Bokeh UI reads those two fields.

`update_lap_change` (1000 ms) redraws lap graphs only when the finished-lap list changes. Throttle and brake charts use `Lap.data_throttle` and `Lap.data_braking` after `finish_lap`. `update_fuel_map` (5000 ms) also uses the last finished lap. `get_last_data()` can spin for up to 5 seconds; a Bokeh callback must not call it.

`GTData(None)` returns before setting attributes, so `last_data.throttle` does not exist until the first accepted packet.

## Launch facts (2026-10-18, this Mac)

- Documented `run.command` calls system `python3` 3.14.5, which has no `bokeh` and no `Crypto`. Do not run it.
- `legacy/gt7dashboard/venv` is Python 3.11.15. `bokeh` 3.6.3 and `Crypto` import. Importing `gt7dashboard.gt7helper` fails: scipy `.so` `dlopen` error (`__DATA/__thread_bss` offset). `main.py` imports that module, so the server does not start.
- `GT7_PLAYSTATION_IP` was unset. Sending to `255.255.255.255:33739` fails with `OSError: [Errno 49] Can't assign requested address`. Do not hardcode an IP into source. Pass the env var.
- A direct probe to `192.168.0.136:33739` received 479 decrypted packets in 8 seconds. Every sample was throttle `0.0`, brake `0.0`, speed `0.0`. The path works. Pedal movement was not observed. Do not claim a pedal test passed on that evidence.
- Network settings were not changed. Docker is forbidden.

## Acceptance

- Existing Bokeh app shows throttle percent and brake percent.
- Values follow `last_data` while a lap is unfinished.
- Disconnected or missing attributes show an empty state, not a stale percent.
- The UDP thread remains the only receiver. Lap JSON, lap graphs, and `finish_lap` stay intact.
- Pytest that can run after the scipy import is fixed is green, plus a unit test for the formatter.
- Real pedal changes are reported only if they were seen. Zeros alone are not a pass.

## Out of scope

New dashboard, track map, extra sensors, analytics, license edits, upstream history rewrite, version bump, Docker, network reconfiguration.
