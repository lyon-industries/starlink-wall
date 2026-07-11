import React, { useEffect, useMemo, useState } from "react"
import { Box, Text, useApp, useInput } from "ink"

import {
  measureNetworkSample,
  summarizeNetwork,
  type NetworkSample,
  type NetworkStatus,
} from "./network.js"
import { computeSnapshot, predictPasses, visibilitySeries } from "./orbits.js"
import type { DataSet, Observer, Pass, Snapshot } from "./types.js"
import { compass, formatAge, nullableSparkline, skyPlot, sparkline } from "./visuals.js"

const colors = {
  space: "#05080B",
  abyss: "#0B2630",
  atmosphere: "#9FB9CC",
  propellant: "#EA5C22",
  contrail: "#EAEEF0",
  muted: "#59707E",
  good: "#70C1A5",
  warning: "#E6B85C",
  danger: "#E36A6A",
}

const sampleIntervalMs = 5_000
const historyLimit = 120

export function App({ data, observer }: { data: DataSet; observer: Observer }) {
  const { exit } = useApp()
  const { columns, rows } = useTerminalSize()
  const [now, setNow] = useState(new Date())
  const [snapshot, setSnapshot] = useState<Snapshot>(() => computeSnapshot(data.satellites, observer))
  const [passes, setPasses] = useState<Pass[]>([])
  const [visibility, setVisibility] = useState<number[]>([])
  const [network, setNetwork] = useState<NetworkSample[]>([])
  const [dishReachable, setDishReachable] = useState<boolean | null>(null)
  const [paused, setPaused] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [pollGeneration, setPollGeneration] = useState(0)
  const compact = columns < 105 || rows < 29

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      if (showHelp) setShowHelp(false)
      else exit()
    } else if (input === "?" || input === "h") setShowHelp((value) => !value)
    else if (input === " ") setPaused((value) => !value)
    else if (input === "r") setPollGeneration((value) => value + 1)
  })

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(clock)
  }, [])

  useEffect(() => {
    if (paused) return
    const tick = setInterval(() => setSnapshot(computeSnapshot(data.satellites, observer)), 5_000)
    return () => clearInterval(tick)
  }, [data.satellites, observer, paused])

  useEffect(() => {
    if (paused) return
    const initial = setTimeout(() => {
      setPasses(predictPasses(data.satellites, observer).slice(0, 8))
      setVisibility(visibilitySeries(data.satellites, observer))
    }, 100)
    const refresh = setInterval(() => {
      setPasses(predictPasses(data.satellites, observer).slice(0, 8))
      setVisibility(visibilitySeries(data.satellites, observer))
    }, 5 * 60_000)
    return () => {
      clearTimeout(initial)
      clearInterval(refresh)
    }
  }, [data.satellites, observer, paused])

  useEffect(() => {
    if (paused) return
    let cancelled = false
    let timer: NodeJS.Timeout | undefined
    let count = 0
    const poll = async () => {
      if (count === 0) {
        const warmup = await measureNetworkSample(true)
        if (cancelled) return
        if (warmup.dishReachable !== null) setDishReachable(warmup.dishReachable)
      }
      const sample = await measureNetworkSample(count !== 0 && count % 6 === 0)
      count += 1
      if (cancelled) return
      setNetwork((items) => [...items, sample].slice(-historyLimit))
      if (sample.dishReachable !== null) setDishReachable(sample.dishReachable)
      timer = setTimeout(poll, sampleIntervalMs)
    }
    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [paused, pollGeneration])

  const networkSummary = useMemo(() => summarizeNetwork(network), [network])
  const plot = useMemo(
    () => skyPlot(snapshot.visible, compact ? 16 : 27, compact ? 5 : 12),
    [snapshot.visible, compact],
  )
  const statusColor = colorForStatus(networkSummary.status)

  if (showHelp) {
    return <HelpScreen columns={columns} rows={rows} />
  }

  return compact ? (
    <CompactWall
      columns={columns}
      rows={rows}
      now={now}
      observer={observer}
      snapshot={snapshot}
      plot={plot}
      passes={passes}
      visibility={visibility}
      network={network}
      status={networkSummary}
      statusColor={statusColor}
      dishReachable={dishReachable}
      data={data}
      paused={paused}
    />
  ) : (
    <WideWall
      columns={columns}
      rows={rows}
      now={now}
      observer={observer}
      snapshot={snapshot}
      plot={plot}
      passes={passes}
      visibility={visibility}
      network={network}
      status={networkSummary}
      statusColor={statusColor}
      dishReachable={dishReachable}
      data={data}
      paused={paused}
    />
  )
}

type WallProps = {
  columns: number
  rows: number
  now: Date
  observer: Observer
  snapshot: Snapshot
  plot: string[]
  passes: Pass[]
  visibility: number[]
  network: NetworkSample[]
  status: ReturnType<typeof summarizeNetwork>
  statusColor: string
  dishReachable: boolean | null
  data: DataSet
  paused: boolean
}

function CompactWall(props: WallProps) {
  const top = props.snapshot.visible[0]
  return (
    <Box flexDirection="column" width={props.columns} height={props.rows} paddingX={1}>
      <Header {...props} short />
      <Box borderStyle="single" borderColor={props.statusColor} paddingX={1} flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold color={props.statusColor}>● {props.status.status}</Text>
          <Text color={colors.contrail}>NOW {metric(props.status.currentMs)}  MED {metric(props.status.medianMs)}  P95 {metric(props.status.p95Ms)}</Text>
          <Text color={props.status.lossPercent ? colors.danger : colors.muted}>LOSS {props.status.lossPercent}%</Text>
        </Box>
        <Text color={props.statusColor}>{networkLine(props.network, 54)}</Text>
      </Box>
      <Box gap={1}>
        <Panel title="LOCAL SKY" width="50%" accent={colors.atmosphere}>
          <Box justifyContent="center"><Text color={colors.muted}>N</Text></Box>
          <Box justifyContent="center"><Text color={colors.muted}>W </Text><Text color={colors.atmosphere}>{props.plot.join("\n")}</Text><Text color={colors.muted}> E</Text></Box>
          <Box justifyContent="space-between">
            <Text color={colors.muted}>0° <Text bold color={colors.contrail}>{props.snapshot.visible.length}</Text></Text>
            <Text color={colors.muted}>25° <Text bold color={colors.propellant}>{props.snapshot.above25}</Text></Text>
            <Text color={colors.muted}>45° <Text bold color={colors.contrail}>{props.snapshot.above45}</Text></Text>
          </Box>
        </Panel>
        <Box flexDirection="column" flexGrow={1} gap={1}>
          <Panel title="GEOMETRY NOW" accent={colors.propellant}>
            {top ? <>
              <Box justifyContent="space-between"><Text bold color={colors.contrail}>{top.name}</Text><Text bold color={colors.propellant}>{top.elevation.toFixed(1)}°</Text></Box>
              <Text color={colors.atmosphere}>{top.azimuth.toFixed(0)}° {compass(top.azimuth)} · {Math.round(top.rangeKm)} km · {Math.round(top.altitudeKm)} km orbit</Text>
            </> : <Text color={colors.muted}>No objects above horizon.</Text>}
          </Panel>
          <Panel title="NEXT 60 MIN / ≥25°" accent={colors.good}>
            <Text color={colors.good}>{props.visibility.length ? sparkline(props.visibility).repeat(2) : "calculating…"}</Text>
            <Text color={colors.muted}>{props.visibility.length ? `${Math.min(...props.visibility)}–${Math.max(...props.visibility)} objects` : ""}</Text>
          </Panel>
        </Box>
      </Box>
      <PassStrip passes={props.passes} limit={2} />
      <Box justifyContent="space-between" paddingX={1}>
        <Text color={colors.muted}>DISH {dishLabel(props.dishReachable)} · OMM {formatAge(props.data.sourceEpoch, props.now)} · {props.data.cacheStatus}</Text>
        <Text color={colors.muted}>? help · space pause · r probe · q quit</Text>
      </Box>
    </Box>
  )
}

function WideWall(props: WallProps) {
  const top = props.snapshot.visible[0]
  return (
    <Box flexDirection="column" width={props.columns} height={props.rows} paddingX={1}>
      <Header {...props} />
      <Box marginTop={1} gap={1}>
        <Panel title="NETWORK PATH / 10 MIN" width="31%" accent={props.statusColor}>
          <Box justifyContent="space-between">
            <Text bold color={props.statusColor}>● {props.status.status}</Text>
            <Text color={colors.muted}>{props.status.samples}/{historyLimit} samples</Text>
          </Box>
          <Text color={props.statusColor}>{networkLine(props.network, 36)}</Text>
          <Box marginTop={1} justifyContent="space-between">
            <Datum label="NOW" value={metric(props.status.currentMs)} />
            <Datum label="MEDIAN" value={metric(props.status.medianMs)} />
            <Datum label="P95" value={metric(props.status.p95Ms)} />
            <Datum label="JITTER" value={metric(props.status.jitterMs)} />
          </Box>
          <Box marginTop={1} justifyContent="space-between">
            <Text color={colors.muted}>LOSS <Text bold color={props.status.lossPercent ? colors.danger : colors.contrail}>{props.status.lossPercent}%</Text></Text>
            <Text color={colors.muted}>DISH LAN <Text bold color={props.dishReachable ? colors.good : colors.muted}>{dishLabel(props.dishReachable)}</Text></Text>
          </Box>
          <Text color={colors.muted}>HTTPS path probe every 5s · dish check every 30s</Text>
          {props.status.outageSeconds > 0 && <Text bold color={colors.danger}>CURRENT OUTAGE {props.status.outageSeconds}s</Text>}
        </Panel>

        <Panel title="LOCAL ORBITAL GEOMETRY" width="36%" accent={colors.atmosphere}>
          <Box justifyContent="center"><Text color={colors.muted}>N</Text></Box>
          <Box justifyContent="center"><Text color={colors.muted}>W </Text><Text color={colors.atmosphere}>{props.plot.join("\n")}</Text><Text color={colors.muted}> E</Text></Box>
          <Box justifyContent="space-between">
            <Metric label="HORIZON" value={String(props.snapshot.visible.length)} />
            <Metric label="≥25°" value={String(props.snapshot.above25)} hot />
            <Metric label="≥45°" value={String(props.snapshot.above45)} />
          </Box>
          {top && <Box marginTop={1} justifyContent="space-between"><Text color={colors.muted}>HIGHEST <Text color={colors.contrail}>{top.name}</Text></Text><Text color={colors.atmosphere}>{top.elevation.toFixed(1)}° · {compass(top.azimuth)} · {Math.round(top.rangeKm)} km</Text></Box>}
        </Panel>

        <Panel title="NEXT HIGH PASSES / ≥25°" width="33%" accent={colors.propellant}>
          {props.passes.length === 0 ? <Text color={colors.muted}>Calculating the next two hours…</Text> : props.passes.slice(0, 7).map((pass, index) => (
            <Box key={`${pass.catalogId}-${pass.peakAt.toISOString()}`} flexDirection="column" marginBottom={index === 6 ? 0 : 1}>
              <Box justifyContent="space-between"><Text color={index === 0 ? colors.contrail : colors.atmosphere}>{pass.name}</Text><Text bold color={index === 0 ? colors.propellant : colors.contrail}>{pass.peakElevation.toFixed(0)}°</Text></Box>
              <Box justifyContent="space-between"><Text color={colors.muted}>{formatTime(pass.rise)} → {formatTime(pass.set)}</Text><Text color={colors.muted}>{compass(pass.peakAzimuth)} · {Math.round(pass.minRangeKm)} km</Text></Box>
            </Box>
          ))}
        </Panel>
      </Box>
      <Box borderStyle="single" borderColor={colors.muted} paddingX={1} justifyContent="space-between">
        <Text color={colors.muted}>CAT <Text color={colors.contrail}>{props.data.satellites.length}</Text> · PROP <Text color={colors.contrail}>{props.snapshot.propagated}/{props.data.satellites.length}</Text> · ELEMENT <Text color={colors.contrail}>{formatAge(props.data.sourceEpoch, props.now)}</Text> · DATA <Text color={colors.contrail}>{props.data.cacheStatus.toUpperCase()}</Text></Text>
        <Text color={colors.muted}>ORBITAL GEOMETRY ≠ SERVICE QUALITY</Text>
      </Box>
      <Box justifyContent="space-between" paddingX={1}>
        <Text color={colors.muted}>HTTPS loss includes DNS, routing and endpoint failure; it is not dish packet loss.</Text>
        <Text color={colors.muted}>? help · space pause · r probe · q quit</Text>
      </Box>
    </Box>
  )
}

function Header(props: WallProps & { short?: boolean }) {
  return (
    <Box backgroundColor={colors.abyss} paddingX={1} justifyContent="space-between">
      <Text bold color={colors.contrail}>◢ {props.short ? "LI" : "LYON INDUSTRIES"} / STARLINK WALL <Text color={props.statusColor}>● {props.status.status}</Text>{props.paused ? <Text color={colors.warning}> Ⅱ PAUSED</Text> : ""}</Text>
      <Text color={colors.atmosphere}>{props.observer.label}{props.short ? "" : ` · ${formatCoordinates(props.observer)}`} · {formatClock(props.now)}</Text>
    </Box>
  )
}

function PassStrip({ passes, limit }: { passes: Pass[]; limit: number }) {
  return (
    <Box borderStyle="single" borderColor={colors.propellant} paddingX={1} flexDirection="column">
      <Text bold color={colors.propellant}>NEXT HIGH PASSES / ≥25°</Text>
      {passes.length === 0 ? <Text color={colors.muted}>Calculating the next two hours…</Text> : passes.slice(0, limit).map((pass) => (
        <Box key={`${pass.catalogId}-${pass.peakAt.toISOString()}`} justifyContent="space-between">
          <Text color={colors.contrail}>{pass.name}</Text><Text color={colors.muted}>{formatTime(pass.rise)}–{formatTime(pass.set)}</Text><Text color={colors.atmosphere}>{compass(pass.peakAzimuth)} · {Math.round(pass.minRangeKm)} km</Text><Text bold color={colors.propellant}>{pass.peakElevation.toFixed(0)}°</Text>
        </Box>
      ))}
    </Box>
  )
}

function HelpScreen({ columns, rows }: { columns: number; rows: number }) {
  return (
    <Box width={columns} height={rows} padding={1} flexDirection="column">
      <Panel title="STARLINK WALL / HELP" accent={colors.atmosphere}>
        <Text bold color={colors.contrail}>KEYS</Text>
        <Text color={colors.atmosphere}>? / h    toggle this help</Text>
        <Text color={colors.atmosphere}>space    pause or resume sampling and orbital updates</Text>
        <Text color={colors.atmosphere}>r        restart the network probe immediately</Text>
        <Text color={colors.atmosphere}>q / esc  close help, then quit</Text>
        <Text> </Text>
        <Text bold color={colors.contrail}>STATUS</Text>
        <Text color={colors.good}>ONLINE     stable HTTPS path in the current sample window</Text>
        <Text color={colors.warning}>WATCH      measurable latency, jitter or isolated loss</Text>
        <Text color={colors.danger}>DEGRADED   current failure, ≥10% loss, p95 ≥250ms or jitter ≥80ms</Text>
        <Text color={colors.danger}>OFFLINE    three consecutive probe failures</Text>
        <Text> </Text>
        <Text color={colors.muted}>Network probes measure the computer's actual internet path. They are Starlink measurements only when that path uses Starlink. Dish LAN detection checks 192.168.100.1 but does not read private dish telemetry.</Text>
      </Panel>
    </Box>
  )
}

function Panel({ title, accent, width, children }: React.PropsWithChildren<{ title: string; accent: string; width?: number | `${number}%` }>) {
  return <Box flexDirection="column" borderStyle="round" borderColor={accent} paddingX={1} width={width}><Text bold color={accent}>{title}</Text>{children}</Box>
}

function Metric({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return <Box flexDirection="column"><Text color={colors.muted}>{label}</Text><Text bold color={hot ? colors.propellant : colors.contrail}>{value}</Text></Box>
}

function Datum({ label, value }: { label: string; value: string }) {
  return <Box flexDirection="column"><Text color={colors.muted}>{label}</Text><Text color={colors.contrail}>{value}</Text></Box>
}

function networkLine(samples: NetworkSample[], width: number): string {
  const values = samples.slice(-width).map((sample) => sample.rttMs)
  return values.length ? nullableSparkline(values).padStart(width, "·") : "·".repeat(width)
}

function metric(value: number | null): string {
  return value === null ? "—" : `${value}ms`
}

function dishLabel(reachable: boolean | null): string {
  return reachable === null ? "CHECKING" : reachable ? "REACHABLE" : "NOT SEEN"
}

function colorForStatus(status: NetworkStatus): string {
  if (status === "ONLINE") return colors.good
  if (status === "LEARNING" || status === "WATCH") return colors.warning
  if (status === "DEGRADED" || status === "OFFLINE") return colors.danger
  return colors.atmosphere
}

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
const formatClock = (date: Date) => `${formatTime(date)}:${String(date.getSeconds()).padStart(2, "0")}`
const formatCoordinates = (observer: Observer) => `${Math.abs(observer.latitude).toFixed(3)}°${observer.latitude >= 0 ? "N" : "S"} ${Math.abs(observer.longitude).toFixed(3)}°${observer.longitude >= 0 ? "E" : "W"}`

function useTerminalSize(): { columns: number; rows: number } {
  const [size, setSize] = useState(() => ({ columns: process.stdout.columns || 80, rows: process.stdout.rows || 24 }))
  useEffect(() => {
    const update = () => setSize({ columns: process.stdout.columns || 80, rows: process.stdout.rows || 24 })
    process.stdout.on("resize", update)
    return () => { process.stdout.off("resize", update) }
  }, [])
  return size
}
