# GT Telemetry — технический аудит `legacy/`

**Дата аудита:** 2026-10-15  
**Объект:** `/workspace/legacy/` в репозитории `Maks1202/GT_Telemetry`  
**Метод:** статический анализ исходников (без установки зависимостей, без запуска на PS5)  
**Версия исходников:** gitlink `legacy/gt7dashboard` → commit `2da3afd901d052a62c3e0f24e8a42599081687f3` (`snipem/gt7dashboard`, сообщение: `minor typo (#43)`)

Легенда статусов фактов:
- **[код]** — подтверждено исходниками в указанном коммите
- **[предположение]** — логичный вывод, не доказан запуском
- **[PS5]** — требует проверки на реальной консоли / GT7

---

## 1) Краткое резюме

В `legacy/` сейчас **одна** внешняя кодовая база: Python-приложение **gt7dashboard** (Bokeh UI + UDP ingest). Это не набор независимых прототипов, а один форк/субмодуль публичного проекта [snipem/gt7dashboard](https://github.com/snipem/gt7dashboard), выросший из Bornhall/gt7telemetry.

**Критично для репозитория:** субмодуль **не инициализирован** — каталог `legacy/gt7dashboard/` пуст, файла `.gitmodules` нет. Без `git submodule` / клонирования по известному SHA исходники недоступны в рабочей копии. Аудит выполнен по клону upstream на pinned commit (вне `legacy/`, без изменения содержимого `legacy/`).

Телеметрия GT7: **UDP**, heartbeat `"A"` на порт **33739**, приём на **33740**, пакеты зашифрованы **Salsa20**, magic `0x47375330` (`G7S0`). Частота записи круга в коде трактуется как **~60 Гц**. Детекция круга — по смене `current_lap` при `in_race` (или `always_record_data`). **Track ID / секторы в коде не парсятся.**

Для продукта v1 legacy даёт: рабочую схему протокола, карту полей пакета, модель круга с timeseries, алгоритмы сравнения кругов (time-diff по дистанции, median, speed variance). Нельзя слепо копировать: GPL-3 лицензия upstream, монолит `main.py`, баги (RR tire slip, незавершённая функция топлива), слабая устойчивость и нет track metadata.

---

## 2) Полная инвентаризация

### 2.1 Состояние дерева в `GT_Telemetry`

| Путь | Тип | Содержимое |
|------|-----|------------|
| `README.md` | файл | одна строка: `# GT_Telemetry` |
| `legacy/.DS_Store` | служебный | macOS metadata |
| `legacy/gt7dashboard` | **gitlink (mode `160000`)** | SHA `2da3afd…`, каталог на диске **пустой** |

**[код]** В репозитории нет `.gitmodules`. URL субмодуля в git-метаданных родителя не сохранён; SHA однозначно резолвится в `https://github.com/snipem/gt7dashboard` (API GitHub: commit существует).

### 2.2 Структура upstream (pinned commit)

```
gt7dashboard/                 # Python package
  gt7communication.py         # UDP + decrypt + GTData + Session + GT7Communication
  gt7lap.py                   # модель Lap
  gt7helper.py                # анализ, fuel map, persist JSON/pickle, cars.csv
  gt7diagrams.py              # Bokeh-диаграммы / таблица кругов
  gt7help.py                  # тексты help → README
  test/                       # unit + интеграционные (PS5-зависимые)
main.py                       # Bokeh app entry (serve .)
helper/download_cars_csv.py   # качает db/cars.csv с ddm999/gt7info
data/, db/, test_data/        # runtime data / cars / fixture JSON
Dockerfile, requirements.txt, run.sh|ps1|command, Makefile
LICENSE                       # GNU GPL v3
```

**Язык:** Python ≥3.9 (`pyproject.toml`), Docker-образ `python:3.12`.  
**LOC (ориентир):** ~3500 строк `.py` (без ассетов).

### 2.3 Технологии и зависимости

| Зависимость | Назначение |
|-------------|------------|
| `bokeh~=3.6.3` | realtime UI (server + WebSocket) |
| `pycryptodome~=3.21.0` | Salsa20 decrypt |
| `pandas~=2.2.3` | resample/interpolate time-diff, таблицы |
| `scipy~=1.15.1` | `find_peaks` для speed peaks/valleys |
| `tabulate~=0.8.10` | CLI-таблица кругов |

**[код]** Точка входа UI: `bokeh serve .` → загружает `main.py`.  
Альтернативы запуска: `run.sh` / `run.ps1` / `run.command` / Docker (`CMD bokeh serve .`, порты `5006/tcp`, `33740/udp`).

### 2.4 Классификация компонентов

| Компонент | Класс | Комментарий |
|-----------|-------|-------------|
| `GT7Communication` + `GTData` + `salsa20_dec` | **самостоятельная / зрелая основа ingest** | ядро протокола |
| `Lap` + persist JSON | **переиспользуемая модель сессии** | пригодно для v1 storage |
| `gt7helper` (time-diff, median, variance, fuel) | **аналитика / computed** | можно вынести в lib |
| `main.py` + `gt7diagrams` | **прототип UI продукта** | монолит Bokeh, не каркас v1 |
| `Makefile` targets `gt7telemetry.py` | **мертвый хвост форка** | файла `gt7telemetry.py` в дереве нет |
| Интеграционный тест PS5 | **неавтономный** | skip, если хост `ps5wifi` недоступен |

**Других реализаций в `legacy/` нет** — только этот субмодуль.

### 2.5 Конфиг и внешние сервисы

**Env vars [код]:**
- `GT7_PLAYSTATION_IP` — IP PS5; по умолчанию `255.255.255.255` (broadcast)
- `GT7_LOAD_LAPS_PATH` — pickle-файл кругов при старте
- `GT7_ADD_BRAKEPOINTS=true` — дорогие brake markers на карте
- `BOKEH_ALLOW_WS_ORIGIN` — Docker/UI

**Внешние URL [код]:**
- `https://raw.githubusercontent.com/ddm999/gt7info/web-new/_data/db/cars.csv` — имена машин (`helper/download_cars_csv.py`, `Dockerfile`)
- Docker image registry: `ghcr.io/snipem/gt7dashboard`

**Лицензия [код]:** GNU GPL v3 (`LICENSE`). Для коммерческого / закрытого продукта это **юридический риск**: прямое встраивание кода обязывает к GPL; безопаснее переиспользовать только знание протокола и переписать ingest, либо соблюдать GPL.

---

## 3) Фактическая схема получения телеметрии

```
┌─────────────┐  UDP "A" (heartbeat)   ┌──────────────────┐
│  GT7 / PS5  │ ◄──── port 33739 ───── │ GT7Communication │
│             │                        │  (daemon Thread) │
│             │ ──── UDP encrypted ──► │  bind 0.0.0.0:   │
│             │      port 33740        │      33740       │
└─────────────┘                        └────────┬─────────┘
                                                │ salsa20_dec
                                                │ GTData(ddata)
                                                ▼
                                       _log_data → current Lap
                                       смена current_lap → finish_lap()
                                                │
                                                ▼
                                       List[Lap] (newest first)
                                                │
                         Bokeh periodic_callback (1s / 5s) → UI
```

### 3.1 Обмен **[код]** (`gt7communication.py`)

1. Создаётся UDP-сокет; при IP `255.255.255.255` включается `SO_BROADCAST`.
2. `bind(('0.0.0.0', 33740))`.
3. Heartbeat: `s.sendto(b'A', (playstation_ip, 33739))` — при старте, каждые ~100 принятых пакетов, и при timeout/`OSError`.
4. `recvfrom(4096)` → `salsa20_dec` → если magic OK и `package_id` строго больше предыдущего — обрабатываем (отбрасываем старые/дубликаты по id).
5. Timeout сокета 10 с; при ошибке — повторный heartbeat; при фатальной ошибке сокета — sleep 5 с и пересоздание сокета.

Это **push/stream от консоли**, не опрос телеметрии приложением. Heartbeat — только keep-alive/«подписка».

### 3.2 Расшифровка **[код]**

```python
key = b'Simulator Interface Packet GT7 ver 0.0'  # первые 32 байта
# IV: dat[0x40:0x44] как iv1; iv2 = iv1 ^ 0xDEADBEAF  # намеренно BEAF, не BEEF
# magic после decrypt: little-endian 0x47375330 == 'G7S0'
```

Невалидный magic → пустой `bytearray`, пакет игнорируется.

### 3.3 Частота и синхронизация

| Утверждение | Статус | Доказательство |
|-------------|--------|----------------|
| Тик ~16.668 мс (~60 Гц) | **[код]** в комментарии/формуле; **[PS5]** фактическая частота | `gt7helper.get_x_axis_for_distance`: `tick_time = 16.668`; live time: `lap_ticks * 1/60` |
| Отбрасывание пакетов с `package_id <= last` | **[код]** | `gt7communication.py` цикл `run` |
| Коррекция live-time через `special_packet_time` | **[код]** | при смене круга: `+= lstlap - current_lap.lap_ticks * 1000/60` |
| Потери пакетов восстанавливаются | **нет в коде** | только skip по id; дыры во timeseries не интерполируются на ingest |

### 3.4 Discovery / соединение

- Явного discovery нет: либо broadcast, либо явный IP.
- «Connected» в UI: был успешный пакет ≤1 с назад (`is_connected()`).
- Docker без `GT7_PLAYSTATION_IP` обычно не работает (broadcast из контейнера ограничен) — **[код]** README + **[предположение]** сетевой стек Docker.

---

## 4) Каталог параметров и форматов

### 4.1 Raw-поля пакета (`GTData`) — **[код]**

Оффсеты относительно **расшифрованного** буфера. Единицы — как в коде (после преобразований).

| Поле | Offset | Тип | Преобразование / единица |
|------|--------|-----|---------------------------|
| magic | 0x00 | u32 | должен быть `0x47375330` |
| position_x/y/z | 0x04/08/0C | f32 | мировые координаты |
| velocity_x/y/z | 0x10/14/18 | f32 | |
| rotation_pitch/yaw/roll | 0x1C/20/24 | f32 | |
| angular_velocity_x/y/z | 0x2C/30/34 | f32 | |
| ride_height | 0x38 | f32 | ×1000 → мм |
| rpm | 0x3C | f32 | |
| current_fuel | 0x44 | f32 | |
| fuel_capacity | 0x48 | f32 | |
| car_speed | 0x4C | f32 | ×3.6 → км/ч (или mph? UI пишет «зависит от игры» — **[PS5]**) |
| boost | 0x50 | f32 | −1 |
| oil_pressure | 0x54 | f32 | |
| water_temp | 0x58 | f32 | тест ожидает 85 |
| oil_temp | 0x5C | f32 | |
| tyre_temp FL/FR/RL/RR | 0x60/64/68/6C | f32 | |
| package_id | 0x70 | i32 | монотонный id |
| current_lap | 0x74 | i16 | номер текущего круга |
| total_laps | 0x76 | i16 | |
| best_lap | 0x78 | i32 | мс |
| last_lap | 0x7C | i32 | мс времени предыдущего круга |
| time_on_track | 0x80 | i32 | /1000 → timedelta «время суток на трассе» |
| current_position / total_positions | 0x84/86 | i16 | |
| rpm_rev_warning / limiter | 0x88/8A | u16 | |
| estimated_top_speed | 0x8C | i16 | |
| flags @ 0x8E | byte | bit0=`in_race`, bit1=`is_paused` (через `bin()[-1]/[-2]`) |
| current_gear / suggested_gear | 0x90 | nibble lo/hi | |
| throttle / brake | 0x91/92 | u8 | /2.55 → ~0–100% |
| tyre angular speed FL…RR | 0xA4…B0 | f32 | × diameter ×3.6 → «скорость шины» |
| tyre diameter FL…RR | 0xB4…C0 | f32 | |
| suspension FL…RR | 0xC4…D0 | f32 | |
| clutch / engaged / rpm_after | 0xF4/F8/FC | f32 | |
| gear ratios 1–8 | 0x104…120 | f32 | |
| car_id | 0x124 | i32 | → имя через `db/cars.csv` |

Неизвестные / закомментированные оффсеты (0x28, 0x8F, 0x93–0xA0, 0xD4–0xF0, 0x100) — **не используются**. Комментарий ссылается на [PDTools SimulatorPacketG7S0](https://github.com/Nenkai/PDTools/blob/master/PDTools.SimulatorInterface/SimulatorPacketG7S0.cs).

**Минимальный размер буфера по используемым полям:** ≥ `0x128` (296) байт **[код]**.

### 4.2 Что пишется в круг (timeseries) — **[код]** `_log_data`

На каждый принятый тик при `(in_race ∨ always_record_data) ∧ ¬is_paused`:

- `data_throttle`, `data_braking`, `data_coasting` (0/1), `data_speed`
- `data_rpm`, `data_gear`, `data_boost`
- `data_tires` (сумма slip ratios FL+FR+RL+RR)
- `data_position_x/y/z`
- `data_rotation_yaw`, `data_absolute_yaw_rate_per_second` (Δ yaw за 60 тиков)
- `data_time` (live lap time, с)

Счётчики (aggregated): full throttle/brake, coast, throttle+brake, tires overheated (>100), tires spinning (slip >1.1), `lap_ticks`.

### 4.3 Computed (не из пакета напрямую)

| Метрика | Источник |
|---------|----------|
| Дистанция по оси X графиков | интеграл `speed/3.6/1000 * 16.668` |
| Time-diff vs reference | pandas resample 10ms + join по distance |
| Median lap | поэлементная median по списку кругов |
| Speed variance | std скорости лучших кругов (±5% от best, без replay) |
| Fuel map −5…+5 | эвристика % мощности/расхода из gtplanet (не из игры) |
| Peaks/valleys | `scipy.signal.find_peaks` |
| Coasting zones на карте | throttle==0 ∧ brake==0 |

### 4.4 Persist format — **[код]**

JSON: массив объектов `Lap.__dict__` (`save_laps_to_json` / `load_laps_from_json`).  
Fixture: `test_data/broad_bean_raceway_time_trial_4laps.json` (4 круга, ~1.3 MB, car_id `1549`, ~1963 тиков/круг ≈ 32.7 с при 60 Гц).

Pickle (`.laps`) — legacy path через `GT7_LOAD_LAPS_PATH`.

---

## 5) Что работает / не работает / не проверено

### Работает **[код]** (логика реализована и частично покрыта тестами)

- Расшифровка + разбор полей `GTData`
- Heartbeat / reconnect loop
- Накопление timeseries круга и `finish_lap` при смене `current_lap`
- Ручной `finish_lap(manual=True)` («Log Lap Now»)
- Сохранение/загрузка кругов JSON; сравнение last/reference/median
- Offline unit-тесты helper/diagrams на fixture JSON
- Docker-сборка с подтягиванием `cars.csv`

### Явные дефекты / WIP **[код]**

1. **Баг slip RR:** в `_log_data` для `delta_rr` используется `data.type_speed_FR`, а не `tyre_speed_RR` (`gt7communication.py`, расчёт `delta_*`).
2. **Незавершённая функция** `calculate_laps_left_on_fuel` в конце `gt7helper.py` (обращения к несуществующим атрибутам `current_lap.fuel`, `last_lap.laps_to_go`).
3. **Хрупкий разбор флагов** через `bin(byte)[-1]/[-2]` — для битов 0/1 случайно корректен, но не битовая маска.
4. **`fuel_at_start`:** выставляется только в `finish_lap` для *следующего* круга; у первого круга сессии по умолчанию `0` → искажение `fuel_consumed`.
5. **FIXME в UI:** «time table is not updating», race table не рендерится дважды, brake points «slow» (~3 с), fuel map без live mid-lap.
6. **Makefile** ссылается на отсутствующий `gt7telemetry.py`.
7. **Документация time-diff** противоречива: в features «under = better», в manual оба направления названы «slower».
8. **Интеграционный тест** завязан на hostname `ps5wifi` — в CI/облаке не бежит.
9. **Субмодуль в родительском репо** без `.gitmodules` — воспроизводимость checkout сломана.

### Не проверено **[PS5]**

- Реальная доставка пакетов с конкретной прошивки GT7 / региона
- Единицы скорости (км/ч vs mph) при разных настройках игры
- Поведение `in_race` / replay / pause / menu background cars
- Потери UDP в Wi‑Fi, jitter, необходимость статического IP
- Наличие track/course id в непокрытых оффсетах (в этом коде не читается)
- Секторы (в коде отсутствуют полностью)
- Совместимость ключа Salsa20 / magic с будущими патчами GT7

---

## 6) Повторно используемые компоненты

Рекомендуется **переиспользовать идеи и алгоритмы**, а не копировать GPL-код в закрытый продукт без юр. решения.

| Компонент | Ценность для v1 | Замечания |
|-----------|-----------------|-----------|
| Карта оффсетов + Salsa20 параметры | **высокая** | эталон протокола |
| Логика heartbeat / package_id filter / reconnect | **высокая** | переписать чисто |
| Модель timeseries круга (списки по тикам) | **высокая** | нормализовать в schema |
| Детекция круга по `current_lap` + `last_lap` ms | **высокая** | нужна валидация edge cases |
| `calculate_time_diff_by_distance` | **средняя** | сильная фича сравнения |
| Median / speed variance / peaks | **средняя** | post-processing |
| Relative fuel map | **низкая** | эвристика, не telemetry |
| Bokeh `main.py` UI | **низкая как каркас** | лучше новый UI-стек |
| `db/cars.csv` pipeline | **средняя** | справочник имён |

---

## 7) Проблемы и риски

| Риск | Уровень | Деталь |
|------|---------|--------|
| Пустой submodule / нет `.gitmodules` | **блокер checkout** | разработчик клонирует репо без кода |
| GPL-3 upstream | **юридический** | политика копирования кода |
| Нет track id / sectors | **продуктовый** | history/compare по трассам без ручной метки |
| Монолит UI + ingest в одном процессе | **архитектурный** | сложно масштабировать / тестировать |
| In-memory only + ручной Save | **надёжность** | краш = потеря сессии |
| UDP без recovery timeseries | **данные** | дыры на графиках |
| Баг RR slip + fuel_at_start | **качество метрик** | Tire Spin / Fuel Cons. |
| Зависимость от неофициального протокола | **внешний** | патч GT7 может сломать magic/ключ |
| Broadcast default | **ops** | firewall 33739/33740; Docker нужен IP |

---

## 8) Предлагаемая архитектура v1

Цель продукта: realtime телеметрия GT7, визуализация сессии, persist завершённых кругов для анализа.

### 8.1 Модули

```
[PS5 GT7]
    │ UDP 33739/33740
    ▼
┌─────────────────┐
│  ingest-service │  bind UDP, heartbeat, decrypt, validate magic/id
└────────┬────────┘
         │ raw frames (bytes + recv_ts)  или уже decoded dict
         ▼
┌─────────────────┐
│ decode/normalize│  schema TelemetrySample (типы, единицы SI)
└────────┬────────┘
         ├─► realtime bus (WebSocket / SSE) ──► UI (live gauges, map)
         ▼
┌─────────────────┐
│ session engine  │  state: Idle/InLap/Paused; lap boundary; seq#
└────────┬────────┘
         │ LapCompleted event
         ▼
┌─────────────────┐
│ persist         │  SQLite/Postgres + файлы timeseries (Parquet/JSONL)
└────────┬────────┘
         ▼
┌─────────────────┐
│ history/compare │  time-diff, reference lap, filters by car/(track*)
└─────────────────┘
```

\*track — пока только user-tag или эвристика по координатам, пока **[PS5]** не подтвердит id в пакете.

### 8.2 Выбор технологий (обоснование)

| Слой | Рекомендация | Почему |
|------|--------------|--------|
| Ingest/decode | **Python 3.12** (или Rust позже) | совпадает с экспертизой legacy; `pycryptodome` уже проверен сообществом |
| API / realtime | **FastAPI + WebSocket** | чёткое разделение API/UI vs Bokeh-монолит |
| UI v1 | **React / Vite** (или лёгкий dashboard) | независимый фронт, проще продуктный UX |
| Persist v1 | **SQLite** + JSONL/Parquet на круг | zero-ops старт; путь к Postgres |
| Тесты протокола | **golden fixtures** (записанные UDP decrypt) | CI без PS5 |
| Пакет | свой репозиторий / Apache-2.0 или MIT **после очистки от GPL-кода** | правовой контур |

**Не брать Bokeh как основу продукта:** хорош для исследовательского дашборда, плох как каркас приложения (общий `Application` state, смешение UI/comms, сложный testing).

### 8.3 Модульность / расширение

- `protocol/` — только decrypt + struct map (версия пакета)
- `domain/` — Sample, Lap, Session (чистые типы)
- `analysis/` — distance axis, time-diff, peaks (портировать алгоритмы)
- `adapters/ui`, `adapters/storage`
- Feature flags: `record_replays`, `brake_points`

---

## 9) План по этапам

### Этап 0 — Инфраструктура репозитория
- **Сделать:** добавить `.gitmodules` (или vendor snapshot), README с инструкцией checkout.
- **Критерий:** `git clone --recurse-submodules` даёт полный `legacy/gt7dashboard` на SHA `2da3afd…`.

### Этап 1 — Protocol library (без UI)
- **Сделать:** независимый модуль decrypt+decode+схема; unit-тесты на synthetic/fixture пакетах.
- **Критерий:** decode известных полей совпадает с `GTData`; magic/отбраковка покрыты тестами; **нет копипасты GPL без решения**.

### Этап 2 — Session / laps engine
- **Сделать:** детекция start/end круга, live time, persist completed lap; ручной finish.
- **Критерий:** прогон на `broad_bean_…json` эквивалентной логики; интеграционный тест **[PS5]** когда доступна консоль.

### Этап 3 — Realtime UI минимальный
- **Сделать:** статус связи, скорость/throttle/brake, номер круга, простая карта XZ.
- **Критерий:** latency UI ≤ ~100–200 мс при локальной сети **[PS5]**; reconnect отображается.

### Этап 4 — Persist + history
- **Сделать:** список сессий/кругов, load/compare 2 круга (time-diff).
- **Критерий:** после рестарта приложения круги на месте; compare воспроизводит смысл legacy-графика.

### Этап 5 — Качество метрик
- **Сделать:** починить slip RR-семантику, fuel_at_start, явные единицы; опционально track tagging.
- **Критерий:** метрики согласованы с ручными замерами на 1 трассе **[PS5]**.

Зависимости этапов: 0→1→2→3; 4 параллельно с 3 после стабильного LapCompleted; 5 после 2.

---

## 10) Вопросы без PS5 (нужна консоль / полевой прогон)

1. Стабилен ли ключ/magic на актуальной версии GT7 у владельца?
2. Нужен ли статический IP или broadcast достаточен в домашней сети?
3. Как ведут себя флаги `in_race`/`is_paused` в Time Trial, Race, Replay, меню?
4. Есть ли в пакете (или рядом) **course/track id** и **sector times**, которые legacy не читает?
5. `car_speed` — всегда м/с→×3.6, или зависит от единиц в настройках GT7?
6. Типичный packet loss на Wi‑Fi vs Ethernet/LAN?
7. Нужна ли запись mid-lap live telemetry в UI (сейчас UI обновляется раз в 1 с по завершённым кругам)?
8. Юридически: форк GPL-дашборда или clean-room protocol lib?

---

## 11) Рекомендуемая первая задача для агента-разработчика

**Задача:** «Починить воспроизводимость `legacy/` и зафиксировать protocol baseline».

Конкретный scope:
1. Добавить `.gitmodules` с `url = https://github.com/snipem/gt7dashboard.git`, path `legacy/gt7dashboard`, pin на `2da3afd901d052a62c3e0f24e8a42599081687f3` (или заменить gitlink vendor-копией **без** изменения смысла аудита — на усмотрение владельца).
2. В корневом `README.md` описать: clone `--recurse-submodules`, порты 33739/33740, `GT7_PLAYSTATION_IP`, GPL-предупреждение.
3. **Не** начинать продуктовый UI; максимум — скелет каталога `src/protocol/` с **собственными** типами и таблицей оффсетов, сверённой с аудитом (clean-room), плюс тест magic/IV.
4. Отдельным PR не трогать файлы внутри upstream, пока нет решения по лицензии.

**Критерий готовности первой задачи:** новый разработчик за один clone получает исходники legacy; в репо есть краткий protocol note + failing/passing decrypt unit-test на байтовом fixture (можно вырезать один пакет из записи позже **[PS5]**).

---

## Приложение A — Доказательные ссылки на код (pinned tree)

| Тема | Файл (в дереве субмодуля) |
|------|---------------------------|
| Порты, heartbeat, loop | `gt7dashboard/gt7communication.py` — `GT7Communication.run`, `_send_hb` |
| Decrypt | `salsa20_dec()` в том же файле |
| Поля пакета | класс `GTData.__init__` |
| Логирование тиков / finish | `_log_data`, `finish_lap` |
| Модель круга | `gt7dashboard/gt7lap.py` |
| Дистанция / time-diff | `gt7helper.get_x_axis_for_distance`, `calculate_time_diff_by_distance` |
| UI entry / env | `main.py` (создание `GT7Communication`, periodic callbacks) |
| Cars CSV | `helper/download_cars_csv.py`, `Dockerfile` |
| Fixture | `test_data/broad_bean_raceway_time_trial_4laps.json` |

## Приложение B — Задачи для спец. агентов (не выполнялись)

| Агент | Зачем |
|-------|--------|
| Legal/licensing | политика GPL-3 vs продукт |
| PS5 field tester | запись raw UDP + проверка флагов/track id |
| Frontend agent | только после этапа 1–2 |

---

*Конец отчёта. Исходники в `legacy/` при аудите не изменялись, не перемещались и не удалялись.*
