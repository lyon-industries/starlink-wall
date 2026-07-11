# Starlink Wall

A location-aware constellation instrument for the terminal.

Install the current release package from GitHub, then leave it on a dedicated screen:

```bash
npm install --global https://github.com/lyon-industries/starlink-wall/releases/download/v0.1.0/starlink-wall-0.1.0.tgz
starlink-wall
```

Do not add the separate `starlink` npm package to that command; it is unrelated to this project.

The shorter `npx starlink-wall` command will become available with the first npm release.

The first run asks for observer coordinates and saves them locally. Later runs open directly into a full-screen terminal display with:

- a live polar plot of catalogued Starlink objects above the local horizon;
- counts above 0°, 25° and 45° elevation;
- the highest object, bearing, slant range and orbital altitude;
- upcoming high passes over the next two hours;
- a 60-minute local visibility trend;
- catalog size, propagation health, element age and internet round-trip time.

Press `q` or Escape to leave the wall.

## Commands

```bash
starlink-wall          # open the wall
starlink-wall setup    # change observer coordinates
starlink-wall refresh  # bypass the local orbital cache once
starlink-wall --help
```

## What the numbers mean

Starlink Wall propagates public Orbit Mean-Elements Message data with SGP4. It calculates orbital geometry relative to the configured observer.

It does **not** know which satellite a Starlink terminal is using, beam allocation, cell capacity, gateway routing, obstructions, packet loss or service availability. An object above the geometric horizon is not proof of a usable link. The interface labels this boundary deliberately.

The internet RTT measurement is an ordinary HTTPS round trip from the computer running the command. It is not dish latency unless that computer's traffic actually uses the Starlink connection.

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
