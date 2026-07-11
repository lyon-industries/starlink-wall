# Contributing

Issues and focused pull requests are welcome.

Before opening a change:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Keep the distinction between orbital geometry and service telemetry explicit. New metrics must state their source, units, refresh interval and what they cannot prove.

Changes to data fetching must respect upstream usage policies. Do not shorten the CelesTrak cache interval or add background polling that bypasses its update cadence.
