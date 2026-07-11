import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { measureNetworkSample, summarizeNetwork, } from "./network.js";
import { computeSnapshot, predictPasses, visibilitySeries } from "./orbits.js";
import { compass, formatAge, nullableSparkline, skyPlot, sparkline } from "./visuals.js";
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
};
const sampleIntervalMs = 5_000;
const historyLimit = 120;
export function App({ data, observer }) {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const [now, setNow] = useState(new Date());
    const [snapshot, setSnapshot] = useState(() => computeSnapshot(data.satellites, observer));
    const [passes, setPasses] = useState([]);
    const [visibility, setVisibility] = useState([]);
    const [network, setNetwork] = useState([]);
    const [dishReachable, setDishReachable] = useState(null);
    const [paused, setPaused] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [pollGeneration, setPollGeneration] = useState(0);
    const compact = columns < 105 || rows < 29;
    useInput((input, key) => {
        if (input === "q" || key.escape) {
            if (showHelp)
                setShowHelp(false);
            else
                exit();
        }
        else if (input === "?" || input === "h")
            setShowHelp((value) => !value);
        else if (input === " ")
            setPaused((value) => !value);
        else if (input === "r")
            setPollGeneration((value) => value + 1);
    });
    useEffect(() => {
        const clock = setInterval(() => setNow(new Date()), 1_000);
        return () => clearInterval(clock);
    }, []);
    useEffect(() => {
        if (paused)
            return;
        const tick = setInterval(() => setSnapshot(computeSnapshot(data.satellites, observer)), 5_000);
        return () => clearInterval(tick);
    }, [data.satellites, observer, paused]);
    useEffect(() => {
        if (paused)
            return;
        const initial = setTimeout(() => {
            setPasses(predictPasses(data.satellites, observer).slice(0, 8));
            setVisibility(visibilitySeries(data.satellites, observer));
        }, 100);
        const refresh = setInterval(() => {
            setPasses(predictPasses(data.satellites, observer).slice(0, 8));
            setVisibility(visibilitySeries(data.satellites, observer));
        }, 5 * 60_000);
        return () => {
            clearTimeout(initial);
            clearInterval(refresh);
        };
    }, [data.satellites, observer, paused]);
    useEffect(() => {
        if (paused)
            return;
        let cancelled = false;
        let timer;
        let count = 0;
        const poll = async () => {
            if (count === 0) {
                const warmup = await measureNetworkSample(true);
                if (cancelled)
                    return;
                if (warmup.dishReachable !== null)
                    setDishReachable(warmup.dishReachable);
            }
            const sample = await measureNetworkSample(count !== 0 && count % 6 === 0);
            count += 1;
            if (cancelled)
                return;
            setNetwork((items) => [...items, sample].slice(-historyLimit));
            if (sample.dishReachable !== null)
                setDishReachable(sample.dishReachable);
            timer = setTimeout(poll, sampleIntervalMs);
        };
        void poll();
        return () => {
            cancelled = true;
            if (timer)
                clearTimeout(timer);
        };
    }, [paused, pollGeneration]);
    const networkSummary = useMemo(() => summarizeNetwork(network), [network]);
    const plot = useMemo(() => skyPlot(snapshot.visible, compact ? 16 : 27, compact ? 5 : 12), [snapshot.visible, compact]);
    const statusColor = colorForStatus(networkSummary.status);
    if (showHelp) {
        return _jsx(HelpScreen, { columns: columns, rows: rows });
    }
    return compact ? (_jsx(CompactWall, { columns: columns, rows: rows, now: now, observer: observer, snapshot: snapshot, plot: plot, passes: passes, visibility: visibility, network: network, status: networkSummary, statusColor: statusColor, dishReachable: dishReachable, data: data, paused: paused })) : (_jsx(WideWall, { columns: columns, rows: rows, now: now, observer: observer, snapshot: snapshot, plot: plot, passes: passes, visibility: visibility, network: network, status: networkSummary, statusColor: statusColor, dishReachable: dishReachable, data: data, paused: paused }));
}
function CompactWall(props) {
    const top = props.snapshot.visible[0];
    return (_jsxs(Box, { flexDirection: "column", width: props.columns, height: props.rows, paddingX: 1, children: [_jsx(Header, { ...props, short: true }), _jsxs(Box, { borderStyle: "single", borderColor: props.statusColor, paddingX: 1, flexDirection: "column", children: [_jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Text, { bold: true, color: props.statusColor, children: ["\u25CF ", props.status.status] }), _jsxs(Text, { color: colors.contrail, children: ["NOW ", metric(props.status.currentMs), "  MED ", metric(props.status.medianMs), "  P95 ", metric(props.status.p95Ms)] }), _jsxs(Text, { color: props.status.lossPercent ? colors.danger : colors.muted, children: ["LOSS ", props.status.lossPercent, "%"] })] }), _jsx(Text, { color: props.statusColor, children: networkLine(props.network, 54) })] }), _jsxs(Box, { gap: 1, children: [_jsxs(Panel, { title: "LOCAL SKY", width: "50%", accent: colors.atmosphere, children: [_jsx(Box, { justifyContent: "center", children: _jsx(Text, { color: colors.muted, children: "N" }) }), _jsxs(Box, { justifyContent: "center", children: [_jsx(Text, { color: colors.muted, children: "W " }), _jsx(Text, { color: colors.atmosphere, children: props.plot.join("\n") }), _jsx(Text, { color: colors.muted, children: " E" })] }), _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Text, { color: colors.muted, children: ["0\u00B0 ", _jsx(Text, { bold: true, color: colors.contrail, children: props.snapshot.visible.length })] }), _jsxs(Text, { color: colors.muted, children: ["25\u00B0 ", _jsx(Text, { bold: true, color: colors.propellant, children: props.snapshot.above25 })] }), _jsxs(Text, { color: colors.muted, children: ["45\u00B0 ", _jsx(Text, { bold: true, color: colors.contrail, children: props.snapshot.above45 })] })] })] }), _jsxs(Box, { flexDirection: "column", flexGrow: 1, gap: 1, children: [_jsx(Panel, { title: "GEOMETRY NOW", accent: colors.propellant, children: top ? _jsxs(_Fragment, { children: [_jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { bold: true, color: colors.contrail, children: top.name }), _jsxs(Text, { bold: true, color: colors.propellant, children: [top.elevation.toFixed(1), "\u00B0"] })] }), _jsxs(Text, { color: colors.atmosphere, children: [top.azimuth.toFixed(0), "\u00B0 ", compass(top.azimuth), " \u00B7 ", Math.round(top.rangeKm), " km \u00B7 ", Math.round(top.altitudeKm), " km orbit"] })] }) : _jsx(Text, { color: colors.muted, children: "No objects above horizon." }) }), _jsxs(Panel, { title: "NEXT 60 MIN / \u226525\u00B0", accent: colors.good, children: [_jsx(Text, { color: colors.good, children: props.visibility.length ? sparkline(props.visibility).repeat(2) : "calculating…" }), _jsx(Text, { color: colors.muted, children: props.visibility.length ? `${Math.min(...props.visibility)}–${Math.max(...props.visibility)} objects` : "" })] })] })] }), _jsx(PassStrip, { passes: props.passes, limit: 2 }), _jsxs(Box, { justifyContent: "space-between", paddingX: 1, children: [_jsxs(Text, { color: colors.muted, children: ["DISH ", dishLabel(props.dishReachable), " \u00B7 OMM ", formatAge(props.data.sourceEpoch, props.now), " \u00B7 ", props.data.cacheStatus] }), _jsx(Text, { color: colors.muted, children: "? help \u00B7 space pause \u00B7 r probe \u00B7 q quit" })] })] }));
}
function WideWall(props) {
    const top = props.snapshot.visible[0];
    return (_jsxs(Box, { flexDirection: "column", width: props.columns, height: props.rows, paddingX: 1, children: [_jsx(Header, { ...props }), _jsxs(Box, { marginTop: 1, gap: 1, children: [_jsxs(Panel, { title: "NETWORK PATH / 10 MIN", width: "31%", accent: props.statusColor, children: [_jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Text, { bold: true, color: props.statusColor, children: ["\u25CF ", props.status.status] }), _jsxs(Text, { color: colors.muted, children: [props.status.samples, "/", historyLimit, " samples"] })] }), _jsx(Text, { color: props.statusColor, children: networkLine(props.network, 36) }), _jsxs(Box, { marginTop: 1, justifyContent: "space-between", children: [_jsx(Datum, { label: "NOW", value: metric(props.status.currentMs) }), _jsx(Datum, { label: "MEDIAN", value: metric(props.status.medianMs) }), _jsx(Datum, { label: "P95", value: metric(props.status.p95Ms) }), _jsx(Datum, { label: "JITTER", value: metric(props.status.jitterMs) })] }), _jsxs(Box, { marginTop: 1, justifyContent: "space-between", children: [_jsxs(Text, { color: colors.muted, children: ["LOSS ", _jsxs(Text, { bold: true, color: props.status.lossPercent ? colors.danger : colors.contrail, children: [props.status.lossPercent, "%"] })] }), _jsxs(Text, { color: colors.muted, children: ["DISH LAN ", _jsx(Text, { bold: true, color: props.dishReachable ? colors.good : colors.muted, children: dishLabel(props.dishReachable) })] })] }), _jsx(Text, { color: colors.muted, children: "HTTPS path probe every 5s \u00B7 dish check every 30s" }), props.status.outageSeconds > 0 && _jsxs(Text, { bold: true, color: colors.danger, children: ["CURRENT OUTAGE ", props.status.outageSeconds, "s"] })] }), _jsxs(Panel, { title: "LOCAL ORBITAL GEOMETRY", width: "36%", accent: colors.atmosphere, children: [_jsx(Box, { justifyContent: "center", children: _jsx(Text, { color: colors.muted, children: "N" }) }), _jsxs(Box, { justifyContent: "center", children: [_jsx(Text, { color: colors.muted, children: "W " }), _jsx(Text, { color: colors.atmosphere, children: props.plot.join("\n") }), _jsx(Text, { color: colors.muted, children: " E" })] }), _jsxs(Box, { justifyContent: "space-between", children: [_jsx(Metric, { label: "HORIZON", value: String(props.snapshot.visible.length) }), _jsx(Metric, { label: "\u226525\u00B0", value: String(props.snapshot.above25), hot: true }), _jsx(Metric, { label: "\u226545\u00B0", value: String(props.snapshot.above45) })] }), top && _jsxs(Box, { marginTop: 1, justifyContent: "space-between", children: [_jsxs(Text, { color: colors.muted, children: ["HIGHEST ", _jsx(Text, { color: colors.contrail, children: top.name })] }), _jsxs(Text, { color: colors.atmosphere, children: [top.elevation.toFixed(1), "\u00B0 \u00B7 ", compass(top.azimuth), " \u00B7 ", Math.round(top.rangeKm), " km"] })] })] }), _jsx(Panel, { title: "NEXT HIGH PASSES / \u226525\u00B0", width: "33%", accent: colors.propellant, children: props.passes.length === 0 ? _jsx(Text, { color: colors.muted, children: "Calculating the next two hours\u2026" }) : props.passes.slice(0, 7).map((pass, index) => (_jsxs(Box, { flexDirection: "column", marginBottom: index === 6 ? 0 : 1, children: [_jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { color: index === 0 ? colors.contrail : colors.atmosphere, children: pass.name }), _jsxs(Text, { bold: true, color: index === 0 ? colors.propellant : colors.contrail, children: [pass.peakElevation.toFixed(0), "\u00B0"] })] }), _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Text, { color: colors.muted, children: [formatTime(pass.rise), " \u2192 ", formatTime(pass.set)] }), _jsxs(Text, { color: colors.muted, children: [compass(pass.peakAzimuth), " \u00B7 ", Math.round(pass.minRangeKm), " km"] })] })] }, `${pass.catalogId}-${pass.peakAt.toISOString()}`))) })] }), _jsxs(Box, { borderStyle: "single", borderColor: colors.muted, paddingX: 1, justifyContent: "space-between", children: [_jsxs(Text, { color: colors.muted, children: ["CAT ", _jsx(Text, { color: colors.contrail, children: props.data.satellites.length }), " \u00B7 PROP ", _jsxs(Text, { color: colors.contrail, children: [props.snapshot.propagated, "/", props.data.satellites.length] }), " \u00B7 ELEMENT ", _jsx(Text, { color: colors.contrail, children: formatAge(props.data.sourceEpoch, props.now) }), " \u00B7 DATA ", _jsx(Text, { color: colors.contrail, children: props.data.cacheStatus.toUpperCase() })] }), _jsx(Text, { color: colors.muted, children: "ORBITAL GEOMETRY \u2260 SERVICE QUALITY" })] }), _jsxs(Box, { justifyContent: "space-between", paddingX: 1, children: [_jsx(Text, { color: colors.muted, children: "HTTPS loss includes DNS, routing and endpoint failure; it is not dish packet loss." }), _jsx(Text, { color: colors.muted, children: "? help \u00B7 space pause \u00B7 r probe \u00B7 q quit" })] })] }));
}
function Header(props) {
    return (_jsxs(Box, { backgroundColor: colors.abyss, paddingX: 1, justifyContent: "space-between", children: [_jsxs(Text, { bold: true, color: colors.contrail, children: ["\u25E2 ", props.short ? "LI" : "LYON INDUSTRIES", " / STARLINK WALL ", _jsxs(Text, { color: props.statusColor, children: ["\u25CF ", props.status.status] }), props.paused ? _jsx(Text, { color: colors.warning, children: " \u2161 PAUSED" }) : ""] }), _jsxs(Text, { color: colors.atmosphere, children: [props.observer.label, props.short ? "" : ` · ${formatCoordinates(props.observer)}`, " \u00B7 ", formatClock(props.now)] })] }));
}
function PassStrip({ passes, limit }) {
    return (_jsxs(Box, { borderStyle: "single", borderColor: colors.propellant, paddingX: 1, flexDirection: "column", children: [_jsx(Text, { bold: true, color: colors.propellant, children: "NEXT HIGH PASSES / \u226525\u00B0" }), passes.length === 0 ? _jsx(Text, { color: colors.muted, children: "Calculating the next two hours\u2026" }) : passes.slice(0, limit).map((pass) => (_jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { color: colors.contrail, children: pass.name }), _jsxs(Text, { color: colors.muted, children: [formatTime(pass.rise), "\u2013", formatTime(pass.set)] }), _jsxs(Text, { color: colors.atmosphere, children: [compass(pass.peakAzimuth), " \u00B7 ", Math.round(pass.minRangeKm), " km"] }), _jsxs(Text, { bold: true, color: colors.propellant, children: [pass.peakElevation.toFixed(0), "\u00B0"] })] }, `${pass.catalogId}-${pass.peakAt.toISOString()}`)))] }));
}
function HelpScreen({ columns, rows }) {
    return (_jsx(Box, { width: columns, height: rows, padding: 1, flexDirection: "column", children: _jsxs(Panel, { title: "STARLINK WALL / HELP", accent: colors.atmosphere, children: [_jsx(Text, { bold: true, color: colors.contrail, children: "KEYS" }), _jsx(Text, { color: colors.atmosphere, children: "? / h    toggle this help" }), _jsx(Text, { color: colors.atmosphere, children: "space    pause or resume sampling and orbital updates" }), _jsx(Text, { color: colors.atmosphere, children: "r        restart the network probe immediately" }), _jsx(Text, { color: colors.atmosphere, children: "q / esc  close help, then quit" }), _jsx(Text, { children: " " }), _jsx(Text, { bold: true, color: colors.contrail, children: "STATUS" }), _jsx(Text, { color: colors.good, children: "ONLINE     stable HTTPS path in the current sample window" }), _jsx(Text, { color: colors.warning, children: "WATCH      measurable latency, jitter or isolated loss" }), _jsx(Text, { color: colors.danger, children: "DEGRADED   current failure, \u226510% loss, p95 \u2265250ms or jitter \u226580ms" }), _jsx(Text, { color: colors.danger, children: "OFFLINE    three consecutive probe failures" }), _jsx(Text, { children: " " }), _jsx(Text, { color: colors.muted, children: "Network probes measure the computer's actual internet path. They are Starlink measurements only when that path uses Starlink. Dish LAN detection checks 192.168.100.1 but does not read private dish telemetry." })] }) }));
}
function Panel({ title, accent, width, children }) {
    return _jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: accent, paddingX: 1, width: width, children: [_jsx(Text, { bold: true, color: accent, children: title }), children] });
}
function Metric({ label, value, hot }) {
    return _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: colors.muted, children: label }), _jsx(Text, { bold: true, color: hot ? colors.propellant : colors.contrail, children: value })] });
}
function Datum({ label, value }) {
    return _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: colors.muted, children: label }), _jsx(Text, { color: colors.contrail, children: value })] });
}
function networkLine(samples, width) {
    const values = samples.slice(-width).map((sample) => sample.rttMs);
    return values.length ? nullableSparkline(values).padStart(width, "·") : "·".repeat(width);
}
function metric(value) {
    return value === null ? "—" : `${value}ms`;
}
function dishLabel(reachable) {
    return reachable === null ? "CHECKING" : reachable ? "REACHABLE" : "NOT SEEN";
}
function colorForStatus(status) {
    if (status === "ONLINE")
        return colors.good;
    if (status === "LEARNING" || status === "WATCH")
        return colors.warning;
    if (status === "DEGRADED" || status === "OFFLINE")
        return colors.danger;
    return colors.atmosphere;
}
const formatTime = (date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const formatClock = (date) => `${formatTime(date)}:${String(date.getSeconds()).padStart(2, "0")}`;
const formatCoordinates = (observer) => `${Math.abs(observer.latitude).toFixed(3)}°${observer.latitude >= 0 ? "N" : "S"} ${Math.abs(observer.longitude).toFixed(3)}°${observer.longitude >= 0 ? "E" : "W"}`;
function useTerminalSize() {
    const [size, setSize] = useState(() => ({ columns: process.stdout.columns || 80, rows: process.stdout.rows || 24 }));
    useEffect(() => {
        const update = () => setSize({ columns: process.stdout.columns || 80, rows: process.stdout.rows || 24 });
        process.stdout.on("resize", update);
        return () => { process.stdout.off("resize", update); };
    }, []);
    return size;
}
//# sourceMappingURL=app.js.map