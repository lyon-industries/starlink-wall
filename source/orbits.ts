import {
  degreesLat,
  degreesLong,
  degreesToRadians,
  ecfToLookAngles,
  eciToEcf,
  eciToGeodetic,
  gstime,
  propagate,
} from "satellite.js"

import type {
  Observer,
  Pass,
  Snapshot,
  TrackedSatellite,
  VisibleSatellite,
} from "./types.js"

const toDegrees = (radians: number) => (radians * 180) / Math.PI

export function computeSnapshot(
  satellites: TrackedSatellite[],
  observer: Observer,
  at = new Date(),
): Snapshot {
  const visible: VisibleSatellite[] = []
  let propagated = 0

  for (const satellite of satellites) {
    const look = lookAt(satellite, observer, at)
    if (!look) continue
    propagated += 1
    if (look.elevation > 0) visible.push(look)
  }

  visible.sort((a, b) => b.elevation - a.elevation)
  return {
    at,
    visible,
    above25: visible.filter((item) => item.elevation >= 25).length,
    above45: visible.filter((item) => item.elevation >= 45).length,
    propagated,
  }
}

export function lookAt(
  satellite: TrackedSatellite,
  observer: Observer,
  at: Date,
): VisibleSatellite | null {
  const state = propagate(satellite.satrec, at)
  if (!state || typeof state.position === "boolean") return null
  const gmst = gstime(at)
  const positionEcf = eciToEcf(state.position, gmst)
  const observerGd = {
    latitude: degreesToRadians(observer.latitude),
    longitude: degreesToRadians(observer.longitude),
    height: observer.altitudeKm,
  }
  const angles = ecfToLookAngles(observerGd, positionEcf)
  const geodetic = eciToGeodetic(state.position, gmst)

  return {
    name: satellite.name,
    catalogId: satellite.catalogId,
    elevation: toDegrees(angles.elevation),
    azimuth: (toDegrees(angles.azimuth) + 360) % 360,
    rangeKm: angles.rangeSat,
    altitudeKm: geodetic.height,
  }
}

export function predictPasses(
  satellites: TrackedSatellite[],
  observer: Observer,
  start = new Date(),
  options: { horizonMinutes?: number; stepSeconds?: number; minimumPeak?: number } = {},
): Pass[] {
  const horizonMinutes = options.horizonMinutes ?? 120
  const stepSeconds = options.stepSeconds ?? 60
  const minimumPeak = options.minimumPeak ?? 25
  const active = new Map<number, Pass>()
  const completed: Pass[] = []
  const endMs = start.getTime() + horizonMinutes * 60_000

  for (let timeMs = start.getTime(); timeMs <= endMs; timeMs += stepSeconds * 1000) {
    const at = new Date(timeMs)
    for (const satellite of satellites) {
      const look = lookAt(satellite, observer, at)
      const current = active.get(satellite.catalogId)

      if (look && look.elevation > 0) {
        if (!current) {
          active.set(satellite.catalogId, {
            name: satellite.name,
            catalogId: satellite.catalogId,
            rise: at,
            peakAt: at,
            set: at,
            peakElevation: look.elevation,
            peakAzimuth: look.azimuth,
            minRangeKm: look.rangeKm,
          })
        } else {
          current.set = at
          if (look.elevation > current.peakElevation) {
            current.peakElevation = look.elevation
            current.peakAt = at
            current.peakAzimuth = look.azimuth
          }
          current.minRangeKm = Math.min(current.minRangeKm, look.rangeKm)
        }
      } else if (current) {
        active.delete(satellite.catalogId)
        if (current.peakElevation >= minimumPeak) completed.push(current)
      }
    }
  }

  for (const pass of active.values()) {
    if (pass.peakElevation >= minimumPeak) completed.push(pass)
  }

  return completed.sort((a, b) => a.peakAt.getTime() - b.peakAt.getTime())
}

export function visibilitySeries(
  satellites: TrackedSatellite[],
  observer: Observer,
  start = new Date(),
): number[] {
  const series: number[] = []
  for (let minute = 0; minute <= 60; minute += 5) {
    series.push(
      computeSnapshot(satellites, observer, new Date(start.getTime() + minute * 60_000)).above25,
    )
  }
  return series
}

export function subpoint(
  satellite: TrackedSatellite,
  at = new Date(),
): { latitude: number; longitude: number } | null {
  const state = propagate(satellite.satrec, at)
  if (!state || typeof state.position === "boolean") return null
  const point = eciToGeodetic(state.position, gstime(at))
  return { latitude: degreesLat(point.latitude), longitude: degreesLong(point.longitude) }
}
