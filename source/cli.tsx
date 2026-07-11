#!/usr/bin/env node
import React from "react"
import { render } from "ink"

import { App } from "./app.js"
import { promptForObserver, readObserver } from "./config.js"
import { loadData } from "./data.js"

const command = process.argv[2]

if (process.argv.includes("--version") || process.argv.includes("-v")) {
  process.stdout.write("starlink-wall 0.2.0\n")
  process.exit(0)
}

if (process.argv.includes("--help") || command === "help") {
  process.stdout.write(`starlink-wall — a location-aware constellation instrument\n\nUsage:\n  starlink-wall          open the live terminal wall\n  starlink-wall setup    set observer coordinates\n  starlink-wall refresh  bypass the local orbital cache once\n\nKeys:\n  q / esc                quit\n`)
  process.exit(0)
}

if (!process.stdout.isTTY || !process.stdin.isTTY) {
  process.stderr.write("starlink-wall requires an interactive terminal.\n")
  process.exit(1)
}

let observer = await readObserver()
if (command === "setup" || !observer) observer = await promptForObserver(observer)

process.stdout.write("\nAcquiring current Starlink orbital elements…\n")
const data = await loadData({ force: command === "refresh" })

process.stdout.write("\u001B[?1049h\u001B[?25l")
try {
  const instance = render(<App data={data} observer={observer} />, {
    exitOnCtrlC: true,
  })
  await instance.waitUntilExit()
} finally {
  process.stdout.write("\u001B[?25h\u001B[?1049l")
}
