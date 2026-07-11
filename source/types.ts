import type { SatRec } from "satellite.js"

export type Observer = {
  latitude: number
  longitude: number
  altitudeKm: number
  label: string
}

export type OmmRecord = {
  OBJECT_NAME: string
  OBJECT_ID: string
  EPOCH: string
  NORAD_CAT_ID: number
  [key: string]: string | number
}

export type TrackedSatellite = {
  name: string
  catalogId: number
  epoch: Date
  satrec: SatRec
}

export type VisibleSatellite = {
  name: string
  catalogId: number
  elevation: number
  azimuth: number
  rangeKm: number
  altitudeKm: number
}

export type Snapshot = {
  at: Date
  visible: VisibleSatellite[]
  above25: number
  above45: number
  propagated: number
}

export type Pass = {
  name: string
  catalogId: number
  rise: Date
  peakAt: Date
  set: Date
  peakElevation: number
  peakAzimuth: number
  minRangeKm: number
}

export type DataSet = {
  satellites: TrackedSatellite[]
  fetchedAt: Date
  sourceEpoch: Date
  cacheStatus: "live" | "cache" | "stale-cache" | "bundled"
}
