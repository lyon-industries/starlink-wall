import React, { useEffect, useMemo, useState } from "react"
import { Box, Text, useApp, useInput } from "ink"

import { measureInternetRtt } from "./network.js"
import { computeSnapshot, predictPasses, visibilitySeries } from "./orbits.js"
import type { DataSet, Observer, Pass, Snapshot } from "./types.js"
import { bar, compass, formatAge, skyPlot, sparkline } from "./visuals.js"

const colors = {
  space: "#05080B",
  abyss: "#0B2630",
  armour: "#2A302E",
  atmosphere: "#9FB9CC",
  propellant: "#EA5C22",
  contrail: "#EAEEF0",
  muted: "#59707E",
  good: "#70C1A5",
}

export function App({ data, observer }: { data: DataSet; observer: Observer }) {
  const { exit } = useApp()
  const { columns, rows } = useTerminalSize()
  const [now, setNow] = useState(new Date())
  const [snapshot, setSnapshot] = useState<Snapshot>(() =>
    computeSnapshot(data.satellites, observer),
  )
  const [passes, setPasses] = useState<Pass[]>([])
  const [series, setSeries] = useState<number[]>([])
  const [rtt, setRtt] = useState<number | null | undefined>(undefined)
  const compact = columns < 105 || rows < 29

  useInput((input, key) => {
    if (input === "q" || key.escape) exit()
  })

  useEffect(() => {
    const tick = setInterval(() => {
      const at = new Date()
      setNow(at)
      setSnapshot(computeSnapshot(data.satellites, observer, at))
    }, 5_000)
    return () => clearInterval(tick)
  }, [data.satellites, observer])

  useEffect(() => {
    const initial = setTimeout(() => {
      setPasses(predictPasses(data.satellites, observer).slice(0, 8))
      setSeries(visibilitySeries(data.satellites, observer))
      void measureInternetRtt().then(setRtt)
    }, 100)
    const refresh = setInterval(() => {
      setPasses(predictPasses(data.satellites, observer).slice(0, 8))
      setSeries(visibilitySeries(data.satellites, observer))
      void measureInternetRtt().then(setRtt)
    }, 5 * 60_000)
    return () => {
      clearTimeout(initial)
      clearInterval(refresh)
    }
  }, [data.satellites, observer])

  const plot = useMemo(
    () => skyPlot(snapshot.visible, compact ? 16 : 31, compact ? 6 : 14),
    [snapshot.visible, compact],
  )
  const top = snapshot.visible[0]
  const maxVisible = Math.max(snapshot.visible.length, ...series, 1)

  if (compact) {
    return (
      <Box flexDirection="column" width={columns} height={rows} paddingX={1}>
        <Box backgroundColor={colors.abyss} paddingX={1} justifyContent="space-between">
          <Text bold color={colors.contrail}>◢ LI / STARLINK WALL</Text>
          <Text color={colors.atmosphere}>{observer.label} · {formatClock(now)}</Text>
        </Box>
        <Box marginTop={1} gap={1}>
          <Panel title="LOCAL SKY" width="50%" accent={colors.atmosphere}>
            <Box justifyContent="center"><Text color={colors.muted}>N</Text></Box>
            <Box justifyContent="center">
              <Text color={colors.muted}>W </Text>
              <Text color={colors.atmosphere}>{plot.join("\n")}</Text>
              <Text color={colors.muted}> E</Text>
            </Box>
            <Box justifyContent="space-between">
              <Text color={colors.muted}>0° <Text bold color={colors.contrail}>{snapshot.visible.length}</Text></Text>
              <Text color={colors.muted}>25° <Text bold color={colors.propellant}>{snapshot.above25}</Text></Text>
              <Text color={colors.muted}>45° <Text bold color={colors.contrail}>{snapshot.above45}</Text></Text>
            </Box>
          </Panel>
          <Box flexDirection="column" flexGrow={1} gap={1}>
            <Panel title="GEOMETRY NOW" accent={colors.propellant}>
              {top ? <>
                <Box justifyContent="space-between"><Text bold color={colors.contrail}>{top.name}</Text><Text bold color={colors.propellant}>{top.elevation.toFixed(1)}°</Text></Box>
                <Text color={colors.atmosphere}>{top.azimuth.toFixed(0)}° {compass(top.azimuth)}  ·  {Math.round(top.rangeKm)} km range  ·  {Math.round(top.altitudeKm)} km orbit</Text>
              </> : <Text color={colors.muted}>No objects above horizon.</Text>}
            </Panel>
            <Panel title="NEXT 60 MIN / ABOVE 25°" accent={colors.good}>
              <Text color={colors.good}>{series.length ? sparkline(series).repeat(2) : "calculating…"}</Text>
              <Text color={colors.muted}>{series.length ? `${Math.min(...series)}–${Math.max(...series)} objects` : ""}</Text>
            </Panel>
          </Box>
        </Box>
        <Box borderStyle="single" borderColor={colors.propellant} paddingX={1} flexDirection="column">
          <Text bold color={colors.propellant}>NEXT HIGH PASSES / ≥25°</Text>
          {passes.length === 0 ? <Text color={colors.muted}>Calculating the next two hours…</Text> : passes.slice(0, 3).map((pass) => (
            <Box key={`${pass.catalogId}-${pass.peakAt.toISOString()}`} justifyContent="space-between">
              <Text color={colors.contrail}>{pass.name}</Text>
              <Text color={colors.muted}>{formatTime(pass.rise)}–{formatTime(pass.set)}</Text>
              <Text color={colors.atmosphere}>{compass(pass.peakAzimuth)} · {Math.round(pass.minRangeKm)} km</Text>
              <Text bold color={colors.propellant}>{pass.peakElevation.toFixed(0)}°</Text>
            </Box>
          ))}
        </Box>
        <Box borderStyle="single" borderColor={colors.muted} paddingX={1} justifyContent="space-between">
          <Text color={colors.muted}>{data.satellites.length} catalog · elements {formatAge(data.sourceEpoch, now)} · {data.cacheStatus}</Text>
          <Text color={colors.muted}>internet {rtt === undefined ? "…" : rtt === null ? "offline" : `${rtt} ms`}</Text>
        </Box>
        <Box justifyContent="space-between" paddingX={1}>
          <Text color={colors.muted}>ORBITAL GEOMETRY ≠ SERVICE QUALITY</Text>
          <Text color={colors.muted}>q quit</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width={columns} height={rows} paddingX={1}>
      <Box backgroundColor={colors.abyss} paddingX={1} justifyContent="space-between">
        <Text bold color={colors.contrail}>◢ LYON INDUSTRIES  /  STARLINK WALL</Text>
        <Text color={colors.atmosphere}>{observer.label}  ·  {formatCoordinates(observer)}  ·  {formatClock(now)}</Text>
      </Box>

      <Box marginTop={1} gap={1}>
        <Panel title="LOCAL SKY / LIVE" width={compact ? "45%" : "38%"} accent={colors.atmosphere}>
          <Box justifyContent="center"><Text color={colors.muted}>N</Text></Box>
          <Box>
            <Text color={colors.muted}>W </Text>
            <Text color={colors.atmosphere}>{plot.join("\n")}</Text>
            <Text color={colors.muted}> E</Text>
          </Box>
          <Box justifyContent="center"><Text color={colors.muted}>S  ·  elevation rings 45° / 0°</Text></Box>
          <Box marginTop={1} justifyContent="space-between">
            <Metric label="ABOVE HORIZON" value={String(snapshot.visible.length)} />
            <Metric label="ABOVE 25°" value={String(snapshot.above25)} hot />
            <Metric label="ABOVE 45°" value={String(snapshot.above45)} />
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text color={colors.muted}>HIGHEST OBJECTS</Text>
            {snapshot.visible.slice(0, 4).map((item) => (
              <Box key={item.catalogId} justifyContent="space-between">
                <Text color={colors.atmosphere}>{item.name.slice(0, 22)}</Text>
                <Text color={colors.muted}>{compass(item.azimuth)} · {Math.round(item.rangeKm)} km</Text>
                <Text bold color={colors.contrail}>{item.elevation.toFixed(0)}°</Text>
              </Box>
            ))}
          </Box>
        </Panel>

        <Box flexDirection="column" flexGrow={1} gap={1}>
          <Panel title="GEOMETRY NOW" accent={colors.propellant}>
            {top ? (
              <>
                <Box justifyContent="space-between">
                  <Box flexDirection="column">
                    <Text color={colors.muted}>HIGHEST CATALOG OBJECT</Text>
                    <Text bold color={colors.contrail}>{top.name}</Text>
                  </Box>
                  <Text bold color={colors.propellant}>{top.elevation.toFixed(1)}°</Text>
                </Box>
                <Box marginTop={1} justifyContent="space-between">
                  <Datum label="BEARING" value={`${top.azimuth.toFixed(0)}° ${compass(top.azimuth)}`} />
                  <Datum label="SLANT RANGE" value={`${Math.round(top.rangeKm)} km`} />
                  <Datum label="ORBIT ALT" value={`${Math.round(top.altitudeKm)} km`} />
                </Box>
              </>
            ) : <Text color={colors.muted}>No catalog objects above the local horizon.</Text>}
          </Panel>

          <Panel title="VISIBILITY / NEXT 60 MIN" accent={colors.good}>
            <Text color={colors.good}>{series.length ? sparkline(series).repeat(compact ? 2 : 3) : "calculating…"}</Text>
            <Box justifyContent="space-between">
              <Text color={colors.muted}>objects above 25°</Text>
              <Text color={colors.contrail}>{series.length ? `${Math.min(...series)}–${Math.max(...series)}` : "—"}</Text>
            </Box>
            <Text color={colors.atmosphere}>{bar(snapshot.above25, maxVisible, compact ? 28 : 42)}</Text>
          </Panel>

          {!compact && <StatusPanel data={data} snapshot={snapshot} rtt={rtt} now={now} />}
        </Box>

        <Panel title="NEXT HIGH PASSES / ≥25°" width={compact ? "36%" : "34%"} accent={colors.propellant}>
          {passes.length === 0 ? (
            <Text color={colors.muted}>Calculating the next two hours…</Text>
          ) : passes.slice(0, compact ? 5 : 8).map((pass, index) => (
            <Box key={`${pass.catalogId}-${pass.peakAt.toISOString()}`} flexDirection="column" marginBottom={index === passes.length - 1 ? 0 : 1}>
              <Box justifyContent="space-between">
                <Text color={index === 0 ? colors.contrail : colors.atmosphere}>{pass.name}</Text>
                <Text bold color={index === 0 ? colors.propellant : colors.contrail}>{pass.peakElevation.toFixed(0)}°</Text>
              </Box>
              <Box justifyContent="space-between">
                <Text color={colors.muted}>{formatTime(pass.rise)} → {formatTime(pass.set)}</Text>
                <Text color={colors.muted}>{compass(pass.peakAzimuth)} · {Math.round(pass.minRangeKm)} km</Text>
              </Box>
            </Box>
          ))}
        </Panel>
      </Box>

      <Box justifyContent="space-between" paddingX={1}>
        <Text color={colors.muted}>ORBITAL GEOMETRY ≠ SERVICE QUALITY  ·  CelesTrak OMM / SGP4</Text>
        <Text color={colors.muted}>q quit  ·  starlink-wall setup reconfigure</Text>
      </Box>
    </Box>
  )
}

function Panel({ title, accent, width, children }: React.PropsWithChildren<{ title: string; accent: string; width?: number | `${number}%` }>) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={accent} paddingX={1} width={width}>
      <Text bold color={accent}>{title}</Text>
      {children}
    </Box>
  )
}

function Metric({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return <Box flexDirection="column"><Text color={colors.muted}>{label}</Text><Text bold color={hot ? colors.propellant : colors.contrail}>{value}</Text></Box>
}

function Datum({ label, value }: { label: string; value: string }) {
  return <Box flexDirection="column"><Text color={colors.muted}>{label}</Text><Text color={colors.contrail}>{value}</Text></Box>
}

function StatusPanel({ data, snapshot, rtt, now, compact = false }: { data: DataSet; snapshot: Snapshot; rtt: number | null | undefined; now: Date; compact?: boolean }) {
  return (
    <Box borderStyle={compact ? "single" : "round"} borderColor={colors.muted} paddingX={1} flexDirection="column">
      <Text color={colors.muted}>CAT <Text color={colors.contrail}>{data.satellites.length}</Text>  ·  PROP <Text color={colors.contrail}>{snapshot.propagated}/{data.satellites.length}</Text></Text>
      <Text color={colors.muted}>ELEMENT <Text color={colors.contrail}>{formatAge(data.sourceEpoch, now)}</Text>  ·  DATA <Text color={colors.contrail}>{data.cacheStatus.toUpperCase()}</Text>  ·  RTT <Text color={colors.contrail}>{rtt === undefined ? "…" : rtt === null ? "offline" : `${rtt} ms`}</Text></Text>
    </Box>
  )
}

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
const formatClock = (date: Date) => `${formatTime(date)}:${String(date.getSeconds()).padStart(2, "0")}`
const formatCoordinates = (observer: Observer) => `${Math.abs(observer.latitude).toFixed(3)}°${observer.latitude >= 0 ? "N" : "S"}  ${Math.abs(observer.longitude).toFixed(3)}°${observer.longitude >= 0 ? "E" : "W"}`

function useTerminalSize(): { columns: number; rows: number } {
  const [size, setSize] = useState(() => ({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  }))

  useEffect(() => {
    const update = () => setSize({
      columns: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
    })
    process.stdout.on("resize", update)
    return () => {
      process.stdout.off("resize", update)
    }
  }, [])

  return size
}
