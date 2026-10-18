# Changelog

Scheme: Semantic Versioning. Policy: `.ai/shared/VERSIONING.md`.

Current version: `0.13.0` in `apps/server` and `apps/web`.

## 0.13.0

- Lap samples are stored only between Start and Stop on the race page. The live view stays on.

## 0.12.0

- The race view and the track editor are separate pages. Edge recording lives on the track page.

## 0.11.0

- The race canvas draws a saved track only when the car is inside exactly one pair of edges.

## 0.10.1

- The pedal graph slides with the clock instead of jumping on each packet.

## 0.10.0

- A small canvas graphs the last 30 seconds of throttle and brake. The pedal bars stay.

## 0.9.0

- The path canvas zooms toward the cursor and pans. Double-click fits the whole view again.

## 0.8.0

- The driving line is green under throttle, red under brake, and gray when both pedals are released.

## 0.7.0

- Each finished lap is saved, and the page shows the best saved lap time.

## 0.6.0

- Inner and outer track edges can be recorded with X, Y, and Z and drawn on the live canvas.

## 0.5.0

- The live header shows the packet car code. A name is shown only from the local table. The track label is неизвестно.

## 0.4.1

- The car arrow tip points along travel. The previous tip pointed backward.

## 0.4.0

- The path canvas draws one arrow at the car. The tip points along the nose.

## 0.3.0

- The live page draws the driven path on a canvas from position X and Z. Height is not plotted.

## 0.2.0

- The live page also shows speed, rpm, gear, current lap, and last lap time. Readings update in place.

## 0.1.1

- Pedal numbers and bar widths update in place. The page is not redrawn on each packet.

## 0.1.0

- Local page shows live throttle and brake from GT7 packets.
- Missing link clears the numbers instead of keeping the last percents.
