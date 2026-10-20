# LIVE-BRAKE-COLOR-002

Статус: разрешена. Ветка `task/LIVE-BRAKE-COLOR-002-restore-brake-scale`.

Откат LIVE-BRAKE-COLOR-001: вернуть прежнюю шкалу цвета тормоза на линии пути (гонка и просмотр круга). Снова `mixHex(BRAKE_STROKE_LOW, BRAKE_STROKE_HIGH, b/100)` — при сильном торможении светлее `#ff5a5a`, при слабом темнее `#3a1515`. Константы hex не менять. Газ и coast не трогать.
