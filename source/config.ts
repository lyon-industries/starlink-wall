import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"

import type { Observer } from "./types.js"

const configPath = join(homedir(), ".config", "starlink-wall", "config.json")

export async function readObserver(): Promise<Observer | null> {
  try {
    const parsed = JSON.parse(await readFile(configPath, "utf8")) as Observer
    if (!validLatitude(parsed.latitude) || !validLongitude(parsed.longitude)) return null
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      altitudeKm: Number.isFinite(parsed.altitudeKm) ? parsed.altitudeKm : 0,
      label: parsed.label || "OBSERVER",
    }
  } catch {
    return null
  }
}

export async function saveObserver(observer: Observer): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true })
  await writeFile(configPath, `${JSON.stringify(observer, null, 2)}\n`, "utf8")
}

export async function promptForObserver(existing?: Observer | null): Promise<Observer> {
  const rl = createInterface({ input: stdin, output: stdout })
  stdout.write("\nSTARLINK WALL / OBSERVER SETUP\n")
  stdout.write("Coordinates stay on this machine. Decimal degrees; west/south are negative.\n\n")

  try {
    const label =
      (await rl.question(`Location label [${existing?.label ?? "HOME"}]: `)).trim() ||
      existing?.label ||
      "HOME"
    const latitude = await askNumber(
      rl,
      `Latitude${existing ? ` [${existing.latitude}]` : ""}: `,
      existing?.latitude,
      validLatitude,
    )
    const longitude = await askNumber(
      rl,
      `Longitude${existing ? ` [${existing.longitude}]` : ""}: `,
      existing?.longitude,
      validLongitude,
    )
    const altitudeMeters = await askNumber(
      rl,
      `Altitude in metres [${Math.round((existing?.altitudeKm ?? 0) * 1000)}]: `,
      (existing?.altitudeKm ?? 0) * 1000,
      (value) => value >= -500 && value <= 9000,
    )

    const observer = { label: label.toUpperCase(), latitude, longitude, altitudeKm: altitudeMeters / 1000 }
    await saveObserver(observer)
    return observer
  } finally {
    rl.close()
  }
}

async function askNumber(
  rl: ReturnType<typeof createInterface>,
  prompt: string,
  fallback: number | undefined,
  validate: (value: number) => boolean,
): Promise<number> {
  for (;;) {
    const answer = (await rl.question(prompt)).trim()
    const value = answer === "" && fallback !== undefined ? fallback : Number(answer)
    if (Number.isFinite(value) && validate(value)) return value
    stdout.write("Enter a valid decimal value.\n")
  }
}

export const validLatitude = (value: number) => value >= -90 && value <= 90
export const validLongitude = (value: number) => value >= -180 && value <= 180
