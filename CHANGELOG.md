# Changelog

## 0.2.0 — 2026-07-11

- Put actual internet-path health ahead of orbital geometry.
- Add a rolling 10-minute latency history with current, median, p95, jitter and loss.
- Add `STARTING`, `LEARNING`, `ONLINE`, `WATCH`, `DEGRADED` and `OFFLINE` states.
- Add current outage duration and local dish reachability detection.
- Add an unrecorded warm-up request and sample-size gates to prevent false alarms.
- Add pause, immediate probe, help and safe escape controls.
- Redesign standard and wide layouts around stable, glanceable panels.
- Add network health tests and explicit metric-boundary copy.

## 0.1.0 — 2026-07-11

- Initial location-aware terminal wall.
- Add live Starlink sky geometry, pass predictions and CelesTrak caching.
