import { describe, expect, it } from "vitest"

import { compass, formatAge, skyPlot, sparkline } from "../source/visuals.js"

describe("terminal visuals", () => {
  it("maps bearings to compass points", () => {
    expect(compass(0)).toBe("N")
    expect(compass(91)).toBe("E")
    expect(compass(225)).toBe("SW")
    expect(compass(359)).toBe("N")
  })

  it("renders a bounded braille sky plot", () => {
    const plot = skyPlot([
      { name: "STARLINK-TEST", catalogId: 1, elevation: 45, azimuth: 90, rangeKm: 800, altitudeKm: 550 },
    ], 20, 8)
    expect(plot).toHaveLength(8)
    expect(plot.every((line) => [...line].length === 20)).toBe(true)
    expect(plot.join("")).not.toMatch(/^⠀+$/u)
  })

  it("creates stable sparklines and ages", () => {
    expect(sparkline([2, 4, 6])).toBe("▁▄█")
    expect(formatAge(new Date("2026-07-11T10:00:00Z"), new Date("2026-07-11T12:30:00Z"))).toBe("2h 30m")
  })
})
