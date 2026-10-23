# OPS-MINT-HOST-001 — SysAdmin run report

Date: 2026-10-23  
Host: mint (192.168.0.10), Linux Mint 22.2 (Zara)  
Repo on host: `/home/maks/Projects/GT_Telemetry` @ `main` `e54a7f3` (`v0.20.4-1-ge54a7f3`)

## Отчёт

- Роль: SysAdmin
- Задача: OPS-MINT-HOST-001
- Статус: SYSADMIN_DONE
- Что сделано:
  - Цель прогона: нативная установка GT_Telemetry на `mint` и автозапуск API + web через systemd при загрузке.
  - Среда (хост / путь, без секретов):
    - SSH: `ssh mint` → `maks@192.168.0.10`
    - Путь: `/home/maks/Projects/GT_Telemetry`
    - Env API: `EnvironmentFile=/home/maks/.config/gt-telemetry/env` (права `600`, владелец `maks`, не в git)
    - Юниты: `/etc/systemd/system/gt-telemetry-api.service`, `/etc/systemd/system/gt-telemetry-web.service`
  - Команды и результат (кратко):
    - Установлены пакеты distro: `python3-venv`, `python3-pip`, `nodejs`, `npm` (Node v18.19.1, npm 9.2.0, Python 3.12.3).
    - Клон `git@github.com:Maks1202/GT_Telemetry.git` → `~/Projects/GT_Telemetry`, ветка `main`.
    - Server: `python3 -m venv .venv` + `pip install -e ".[dev]"` в `apps/server`.
    - Web: `npm ci` + `npm run build` в `apps/web`.
    - Создан host-local env с `GT7_PLAYSTATION_IP` (значение не публикуется в отчёте).
    - `systemctl daemon-reload`, `enable` + `restart` обоих юнитов.
  - Проверка, что цель достигнута:
    - `curl http://127.0.0.1:8787/health` → HTTP 200, `{"ok":true}`
    - `curl http://127.0.0.1:5173/` → HTTP 200 (HTML Live Telemetry)
    - `ss`: слушатели `127.0.0.1:8787` (python) и `127.0.0.1:5173` (node)
    - `systemctl is-enabled`: оба `enabled`; `WantedBy=multi-user.target`
    - Оба сервиса `active (running)` после старта
    - Перезагрузка хоста не выполнялась; boot-autostart подтверждён через `enabled` + `WantedBy=multi-user.target`
- Вне scope: код приложения, Docker/K8s, nginx/LAN bind, хардкод IP в исходники, bump версии, merge
- Блокеры: нет
- Репозиторий: main CLEAN на момент авторизации; ops-запись только в `.ai/sysadmin/runs/` (и prompt уже был); не мержил; версию не менял
- Следующий шаг: Architect closeout этого ops-задания

## Что это значит простыми словами

На компьютере Mint приложение поставлено и само поднимается после включения системы: API на порту 8787 и страница на 5173, оба только на localhost этого хоста. Адрес PlayStation задан в локальном env-файле на Mint, не в git. Откройте браузер на самом Mint (или SSH-туннель с другого ПК), чтобы смотреть телеметрию. Перезагрузку Mint для проверки автозапуска можно сделать отдельно, если владелец разрешит; сейчас включение в boot проверено через systemd enabled.
