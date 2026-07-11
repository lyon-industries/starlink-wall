import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { measureInternetRtt } from "./network.js";
import { computeSnapshot, predictPasses, visibilitySeries } from "./orbits.js";
import { bar, compass, formatAge, skyPlot, sparkline } from "./visuals.js";
const colors = {
    space: "#05080B",
    abyss: "#0B2630",
    armour: "#2A302E",
    atmosphere: "#9FB9CC",
    propellant: "#EA5C22",
    contrail: "#EAEEF0",
    muted: "#59707E",
    good: "#70C1A5",
};
export function App({ data, observer }) {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    const [now, setNow] = useState(new Date());
    const [snapshot, setSnapshot] = useState(() => computeSnapshot(data.satellites, observer));
    const [passes, setPasses] = useState([]);
    const [series, setSeries] = useState([]);
    const [rtt, setRtt] = useState(undefined);
    const compact = columns < 105 || rows < 29;
    useInput((input, key) => {
        if (input === "q" || key.escape)
            exit();
    });
    useEffect(() => {
        const tick = setInterval(() => {
            const at = new Date();
            setNow(at);
            setSnapshot(computeSnapshot(data.satellites, observer, at));
        }, 5_000);
        return () => clearInterval(tick);
    }, [data.satellites, observer]);
    useEffect(() => {
        const initial = setTimeout(() => {
            setPasses(predictPasses(data.satellites, observer).slice(0, 8));
            setSeries(visibilitySeries(data.satellites, observer));
            void measureInternetRtt().then(setRtt);
        }, 100);
        const refresh = setInterval(() => {
            setPasses(predictPasses(data.satellites, observer).slice(0, 8));
            setSeries(visibilitySeries(data.satellites, observer));
            void measureInternetRtt().then(setRtt);
        }, 5 * 60_000);
        return () => {
            clearTimeout(initial);
            clearInterval(refresh);
        };
    }, [data.satellites, observer]);
    const plot = useMemo(() => skyPlot(snapshot.visible, compact ? 16 : 31, compact ? 6 : 14), [snapshot.visible, compact]);
    const top = snapshot.visible[0];
    const maxVisible = Math.max(snapshot.visible.length, ...series, 1);
    if (compact) {
        return (_jsxs(Box, { flexDirection: "column", width: columns, height: rows, paddingX: 1, children: [_jsxs(Box, { backgroundColor: colors.abyss, paddingX: 1, justifyContent: "space-between", children: [_jsx(Text, { bold: true, color: colors.contrail, children: "\u25E2 LI / STARLINK WALL" }), _jsxs(Text, { color: colors.atmosphere, children: [observer.label, " \u00B7 ", formatClock(now)] })] }), _jsxs(Box, { marginTop: 1, gap: 1, children: [_jsxs(Panel, { title: "LOCAL SKY", width: "50%", accent: colors.atmosphere, children: [_jsx(Box, { justifyContent: "center", children: _jsx(Text, { color: colors.muted, children: "N" }) }), _jsxs(Box, { justifyContent: "center", children: [_jsx(Text, { color: colors.muted, children: "W " }), _jsx(Text, { color: colors.atmosphere, children: plot.join("\n") }), _jsx(Text, { color: colors.muted, children: " E" })] }), _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Text, { color: colors.muted, children: ["0\u00B0 ", _jsx(Text, { bold: true, color: colors.contrail, children: snapshot.visible.length })] }), _jsxs(Text, { color: colors.muted, children: ["25\u00B0 ", _jsx(Text, { bold: true, color: colors.propellant, children: snapshot.above25 })] }), _jsxs(Text, { color: colors.muted, children: ["45\u00B0 ", _jsx(Text, { bold: true, color: colors.contrail, children: snapshot.above45 })] })] })] }), _jsxs(Box, { flexDirection: "column", flexGrow: 1, gap: 1, children: [_jsx(Panel, { title: "GEOMETRY NOW", accent: colors.propellant, children: top ? _jsxs(_Fragment, { children: [_jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { bold: true, color: colors.contrail, children: top.name }), _jsxs(Text, { bold: true, color: colors.propellant, children: [top.elevation.toFixed(1), "\u00B0"] })] }), _jsxs(Text, { color: colors.atmosphere, children: [top.azimuth.toFixed(0), "\u00B0 ", compass(top.azimuth), "  \u00B7  ", Math.round(top.rangeKm), " km range  \u00B7  ", Math.round(top.altitudeKm), " km orbit"] })] }) : _jsx(Text, { color: colors.muted, children: "No objects above horizon." }) }), _jsxs(Panel, { title: "NEXT 60 MIN / ABOVE 25\u00B0", accent: colors.good, children: [_jsx(Text, { color: colors.good, children: series.length ? sparkline(series).repeat(2) : "calculating…" }), _jsx(Text, { color: colors.muted, children: series.length ? `${Math.min(...series)}–${Math.max(...series)} objects` : "" })] })] })] }), _jsxs(Box, { borderStyle: "single", borderColor: colors.propellant, paddingX: 1, flexDirection: "column", children: [_jsx(Text, { bold: true, color: colors.propellant, children: "NEXT HIGH PASSES / \u226525\u00B0" }), passes.length === 0 ? _jsx(Text, { color: colors.muted, children: "Calculating the next two hours\u2026" }) : passes.slice(0, 3).map((pass) => (_jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { color: colors.contrail, children: pass.name }), _jsxs(Text, { color: colors.muted, children: [formatTime(pass.rise), "\u2013", formatTime(pass.set)] }), _jsxs(Text, { color: colors.atmosphere, children: [compass(pass.peakAzimuth), " \u00B7 ", Math.round(pass.minRangeKm), " km"] }), _jsxs(Text, { bold: true, color: colors.propellant, children: [pass.peakElevation.toFixed(0), "\u00B0"] })] }, `${pass.catalogId}-${pass.peakAt.toISOString()}`)))] }), _jsxs(Box, { borderStyle: "single", borderColor: colors.muted, paddingX: 1, justifyContent: "space-between", children: [_jsxs(Text, { color: colors.muted, children: [data.satellites.length, " catalog \u00B7 elements ", formatAge(data.sourceEpoch, now), " \u00B7 ", data.cacheStatus] }), _jsxs(Text, { color: colors.muted, children: ["internet ", rtt === undefined ? "…" : rtt === null ? "offline" : `${rtt} ms`] })] }), _jsxs(Box, { justifyContent: "space-between", paddingX: 1, children: [_jsx(Text, { color: colors.muted, children: "ORBITAL GEOMETRY \u2260 SERVICE QUALITY" }), _jsx(Text, { color: colors.muted, children: "q quit" })] })] }));
    }
    return (_jsxs(Box, { flexDirection: "column", width: columns, height: rows, paddingX: 1, children: [_jsxs(Box, { backgroundColor: colors.abyss, paddingX: 1, justifyContent: "space-between", children: [_jsx(Text, { bold: true, color: colors.contrail, children: "\u25E2 LYON INDUSTRIES  /  STARLINK WALL" }), _jsxs(Text, { color: colors.atmosphere, children: [observer.label, "  \u00B7  ", formatCoordinates(observer), "  \u00B7  ", formatClock(now)] })] }), _jsxs(Box, { marginTop: 1, gap: 1, children: [_jsxs(Panel, { title: "LOCAL SKY / LIVE", width: compact ? "45%" : "38%", accent: colors.atmosphere, children: [_jsx(Box, { justifyContent: "center", children: _jsx(Text, { color: colors.muted, children: "N" }) }), _jsxs(Box, { children: [_jsx(Text, { color: colors.muted, children: "W " }), _jsx(Text, { color: colors.atmosphere, children: plot.join("\n") }), _jsx(Text, { color: colors.muted, children: " E" })] }), _jsx(Box, { justifyContent: "center", children: _jsx(Text, { color: colors.muted, children: "S  \u00B7  elevation rings 45\u00B0 / 0\u00B0" }) }), _jsxs(Box, { marginTop: 1, justifyContent: "space-between", children: [_jsx(Metric, { label: "ABOVE HORIZON", value: String(snapshot.visible.length) }), _jsx(Metric, { label: "ABOVE 25\u00B0", value: String(snapshot.above25), hot: true }), _jsx(Metric, { label: "ABOVE 45\u00B0", value: String(snapshot.above45) })] }), _jsxs(Box, { marginTop: 1, flexDirection: "column", children: [_jsx(Text, { color: colors.muted, children: "HIGHEST OBJECTS" }), snapshot.visible.slice(0, 4).map((item) => (_jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { color: colors.atmosphere, children: item.name.slice(0, 22) }), _jsxs(Text, { color: colors.muted, children: [compass(item.azimuth), " \u00B7 ", Math.round(item.rangeKm), " km"] }), _jsxs(Text, { bold: true, color: colors.contrail, children: [item.elevation.toFixed(0), "\u00B0"] })] }, item.catalogId)))] })] }), _jsxs(Box, { flexDirection: "column", flexGrow: 1, gap: 1, children: [_jsx(Panel, { title: "GEOMETRY NOW", accent: colors.propellant, children: top ? (_jsxs(_Fragment, { children: [_jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: colors.muted, children: "HIGHEST CATALOG OBJECT" }), _jsx(Text, { bold: true, color: colors.contrail, children: top.name })] }), _jsxs(Text, { bold: true, color: colors.propellant, children: [top.elevation.toFixed(1), "\u00B0"] })] }), _jsxs(Box, { marginTop: 1, justifyContent: "space-between", children: [_jsx(Datum, { label: "BEARING", value: `${top.azimuth.toFixed(0)}° ${compass(top.azimuth)}` }), _jsx(Datum, { label: "SLANT RANGE", value: `${Math.round(top.rangeKm)} km` }), _jsx(Datum, { label: "ORBIT ALT", value: `${Math.round(top.altitudeKm)} km` })] })] })) : _jsx(Text, { color: colors.muted, children: "No catalog objects above the local horizon." }) }), _jsxs(Panel, { title: "VISIBILITY / NEXT 60 MIN", accent: colors.good, children: [_jsx(Text, { color: colors.good, children: series.length ? sparkline(series).repeat(compact ? 2 : 3) : "calculating…" }), _jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { color: colors.muted, children: "objects above 25\u00B0" }), _jsx(Text, { color: colors.contrail, children: series.length ? `${Math.min(...series)}–${Math.max(...series)}` : "—" })] }), _jsx(Text, { color: colors.atmosphere, children: bar(snapshot.above25, maxVisible, compact ? 28 : 42) })] }), !compact && _jsx(StatusPanel, { data: data, snapshot: snapshot, rtt: rtt, now: now })] }), _jsx(Panel, { title: "NEXT HIGH PASSES / \u226525\u00B0", width: compact ? "36%" : "34%", accent: colors.propellant, children: passes.length === 0 ? (_jsx(Text, { color: colors.muted, children: "Calculating the next two hours\u2026" })) : passes.slice(0, compact ? 5 : 8).map((pass, index) => (_jsxs(Box, { flexDirection: "column", marginBottom: index === passes.length - 1 ? 0 : 1, children: [_jsxs(Box, { justifyContent: "space-between", children: [_jsx(Text, { color: index === 0 ? colors.contrail : colors.atmosphere, children: pass.name }), _jsxs(Text, { bold: true, color: index === 0 ? colors.propellant : colors.contrail, children: [pass.peakElevation.toFixed(0), "\u00B0"] })] }), _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Text, { color: colors.muted, children: [formatTime(pass.rise), " \u2192 ", formatTime(pass.set)] }), _jsxs(Text, { color: colors.muted, children: [compass(pass.peakAzimuth), " \u00B7 ", Math.round(pass.minRangeKm), " km"] })] })] }, `${pass.catalogId}-${pass.peakAt.toISOString()}`))) })] }), _jsxs(Box, { justifyContent: "space-between", paddingX: 1, children: [_jsx(Text, { color: colors.muted, children: "ORBITAL GEOMETRY \u2260 SERVICE QUALITY  \u00B7  CelesTrak OMM / SGP4" }), _jsx(Text, { color: colors.muted, children: "q quit  \u00B7  starlink-wall setup reconfigure" })] })] }));
}
function Panel({ title, accent, width, children }) {
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: accent, paddingX: 1, width: width, children: [_jsx(Text, { bold: true, color: accent, children: title }), children] }));
}
function Metric({ label, value, hot }) {
    return _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: colors.muted, children: label }), _jsx(Text, { bold: true, color: hot ? colors.propellant : colors.contrail, children: value })] });
}
function Datum({ label, value }) {
    return _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: colors.muted, children: label }), _jsx(Text, { color: colors.contrail, children: value })] });
}
function StatusPanel({ data, snapshot, rtt, now, compact = false }) {
    return (_jsxs(Box, { borderStyle: compact ? "single" : "round", borderColor: colors.muted, paddingX: 1, flexDirection: "column", children: [_jsxs(Text, { color: colors.muted, children: ["CAT ", _jsx(Text, { color: colors.contrail, children: data.satellites.length }), "  \u00B7  PROP ", _jsxs(Text, { color: colors.contrail, children: [snapshot.propagated, "/", data.satellites.length] })] }), _jsxs(Text, { color: colors.muted, children: ["ELEMENT ", _jsx(Text, { color: colors.contrail, children: formatAge(data.sourceEpoch, now) }), "  \u00B7  DATA ", _jsx(Text, { color: colors.contrail, children: data.cacheStatus.toUpperCase() }), "  \u00B7  RTT ", _jsx(Text, { color: colors.contrail, children: rtt === undefined ? "…" : rtt === null ? "offline" : `${rtt} ms` })] })] }));
}
const formatTime = (date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const formatClock = (date) => `${formatTime(date)}:${String(date.getSeconds()).padStart(2, "0")}`;
const formatCoordinates = (observer) => `${Math.abs(observer.latitude).toFixed(3)}°${observer.latitude >= 0 ? "N" : "S"}  ${Math.abs(observer.longitude).toFixed(3)}°${observer.longitude >= 0 ? "E" : "W"}`;
function useTerminalSize() {
    const [size, setSize] = useState(() => ({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
    }));
    useEffect(() => {
        const update = () => setSize({
            columns: process.stdout.columns || 80,
            rows: process.stdout.rows || 24,
        });
        process.stdout.on("resize", update);
        return () => {
            process.stdout.off("resize", update);
        };
    }, []);
    return size;
}
//# sourceMappingURL=app.js.map