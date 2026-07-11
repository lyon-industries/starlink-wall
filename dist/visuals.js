const brailleBits = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80],
];
export function skyPlot(satellites, width = 30, height = 12) {
    const pixelsWide = width * 2;
    const pixelsHigh = height * 4;
    const cells = Array.from({ length: height }, () => Array(width).fill(0));
    const centerX = (pixelsWide - 1) / 2;
    const centerY = (pixelsHigh - 1) / 2;
    const radius = Math.min(pixelsWide, pixelsHigh) * 0.44;
    const plot = (x, y) => {
        const px = Math.round(x);
        const py = Math.round(y);
        if (px < 0 || py < 0 || px >= pixelsWide || py >= pixelsHigh)
            return;
        cells[Math.floor(py / 4)][Math.floor(px / 2)] |= brailleBits[py % 4][px % 2];
    };
    for (let degree = 0; degree < 360; degree += 2) {
        const angle = (degree * Math.PI) / 180;
        plot(centerX + Math.sin(angle) * radius, centerY - Math.cos(angle) * radius);
    }
    for (const fraction of [0.5]) {
        for (let degree = 0; degree < 360; degree += 5) {
            const angle = (degree * Math.PI) / 180;
            plot(centerX + Math.sin(angle) * radius * fraction, centerY - Math.cos(angle) * radius * fraction);
        }
    }
    for (let offset = -radius; offset <= radius; offset += 2) {
        plot(centerX + offset, centerY);
        plot(centerX, centerY + offset);
    }
    for (const satellite of satellites) {
        const angle = (satellite.azimuth * Math.PI) / 180;
        const distance = radius * (1 - Math.min(90, satellite.elevation) / 90);
        const x = centerX + Math.sin(angle) * distance;
        const y = centerY - Math.cos(angle) * distance;
        plot(x, y);
        if (satellite.elevation >= 25) {
            plot(x + 1, y);
            plot(x, y + 1);
        }
    }
    return cells.map((row) => row.map((value) => (value === 0 ? " " : String.fromCodePoint(0x2800 + value))).join(""));
}
export function sparkline(values) {
    if (values.length === 0)
        return "";
    const bars = "▁▂▃▄▅▆▇█";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values
        .map((value) => bars[Math.min(7, Math.floor(((value - min) / span) * 7))])
        .join("");
}
export function nullableSparkline(values) {
    const present = values.filter((value) => value !== null);
    if (present.length === 0)
        return values.map(() => "×").join("");
    const bars = "▁▂▃▄▅▆▇█";
    const min = Math.min(...present);
    const max = Math.max(...present);
    const span = max - min || 1;
    return values.map((value) => {
        if (value === null)
            return "×";
        return bars[Math.min(7, Math.floor(((value - min) / span) * 7))];
    }).join("");
}
export function bar(value, max, width) {
    const filled = Math.max(0, Math.min(width, Math.round((value / Math.max(1, max)) * width)));
    return `${"━".repeat(filled)}${"─".repeat(width - filled)}`;
}
export function compass(degrees) {
    const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return points[Math.round(degrees / 45) % 8];
}
export function formatAge(date, now = new Date()) {
    const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
    if (minutes < 60)
        return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
//# sourceMappingURL=visuals.js.map