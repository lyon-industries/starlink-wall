# Starlink Wall

A location-aware constellation instrument for the terminal.

Install the current release package from GitHub, then leave it on a dedicated screen:

```bash
npm install --global https://github.com/lyon-industries/starlink-wall/releases/download/v0.2.0/starlink-wall-0.2.0.tgz
starlink-wall
```

Do not add the separate `starlink` npm package to that command; it is unrelated to this project.

The shorter `npx starlink-wall` command will become available with the first npm release.

The first run asks for observer coordinates and saves them locally. Later runs open directly into a full-screen terminal display with:

- a live polar plot of catalogued Starlink objects above the local horizon;
- continuous internet-path status with a 10-minute latency graph;
- current, median and p95 latency, jitter, probe loss and outage duration;
- local Starlink dish reachability detection at `192.168.100.1`;
- counts above 0°, 25° and 45° elevation;
- the highest object, bearing, slant range and orbital altitude;
- upcoming high passes over the next two hours;
- a 60-minute local visibility trend;
- explicit `LEARNING`, `ONLINE`, `WATCH`, `DEGRADED` and `OFFLINE` states;
- catalog size, propagation health and orbital-element age.

Press `?` for the built-in explanation of every state and key.

## Commands

```bash
starlink-wall          # open the wall
starlink-wall setup    # change observer coordinates
starlink-wall refresh  # bypass the local orbital cache once
starlink-wall --help
```

Inside the wall:

```text
? / h    help
space    pause or resume all sampling
r        restart the network probe immediately
q / esc  close help, then quit
```

## What the numbers mean

Starlink Wall propagates public Orbit Mean-Elements Message data with SGP4. It calculates orbital geometry relative to the configured observer.

It does **not** know which satellite a Starlink terminal is using, beam allocation, cell capacity, gateway routing, obstructions, packet loss or service availability. An object above the geometric horizon is not proof of a usable link. The interface labels this boundary deliberately.

The network panel measures repeated HTTPS round trips from the computer running the command. It includes DNS, TLS, routing and endpoint behavior. It is not dish packet loss or dish latency unless the computer's actual path uses Starlink. The first connection is treated as an unrecorded warm-up, and health classification waits for a meaningful sample window.

Dish detection only checks whether the standard local address responds. It does not authenticate to the dish or read private telemetry. Direct gRPC telemetry remains a separate future integration.

## Interface principles

- Faults and uncertainty are written explicitly; colour is never the only signal.
- Live path health comes before orbital spectacle.
- Every metric has a visible time window and source boundary.
- Standard 80×24 terminals and wide wall displays receive separate compositions.
- Panels remain spatially stable while values update.
- Keyboard help is always one key away.

## Data source and caching

Orbital data comes from CelesTrak's supplemental Starlink GP endpoint in OMM JSON format. Starlink Wall caches the response for at least two hours and falls back to stale cache data when the source is unavailable. The npm package also carries a dated, compressed last-known catalog so a first run still works if CelesTrak rate-limits a shared IP. The wall always shows the element age and source state.

This respects CelesTrak's one-download-per-update policy for large constellation datasets. Do not automate `starlink-wall refresh`.

Observer coordinates are stored at `~/.config/starlink-wall/config.json`. Orbital data is cached at `~/.cache/starlink-wall/starlink-omm.json`. Coordinates are not sent to Lyon Industries or CelesTrak.

## Development

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

Node.js 20 or newer is required.

## Roadmap

- Optional direct dish telemetry, clearly separated from orbital estimates.
- Browser wall display reusing the orbital core.
- Configurable elevation masks and obstruction overlays.
- Exportable pass windows for field operations.

## Attribution and trademark

Starlink is a trademark of Space Exploration Technologies Corp. This independent project is not affiliated with, endorsed by or sponsored by SpaceX or Starlink.

Orbital elements are provided by [CelesTrak](https://celestrak.org/). Propagation uses [satellite.js](https://github.com/shashwatak/satellite-js).

## License

MIT © Lyon Industries
