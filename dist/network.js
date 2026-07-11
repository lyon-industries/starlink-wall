const CONNECTIVITY_URL = "https://1.1.1.1/cdn-cgi/trace";
const DISH_URL = "http://192.168.100.1";
export async function measureNetworkSample(checkDish = false) {
    const [rttMs, dishReachable] = await Promise.all([
        measureHttpsRtt(),
        checkDish ? detectDish() : Promise.resolve(null),
    ]);
    return { at: new Date(), rttMs, dishReachable };
}
export function summarizeNetwork(samples, intervalSeconds = 5) {
    if (samples.length === 0) {
        return {
            status: "STARTING",
            currentMs: null,
            medianMs: null,
            p95Ms: null,
            jitterMs: null,
            lossPercent: 0,
            samples: 0,
            outageSeconds: 0,
        };
    }
    const successful = samples.flatMap((sample) => sample.rttMs === null ? [] : [sample.rttMs]);
    const sorted = [...successful].sort((a, b) => a - b);
    const currentMs = samples.at(-1)?.rttMs ?? null;
    const medianMs = median(sorted);
    const p95Ms = percentile(sorted, 0.95);
    const differences = successful.slice(1).map((value, index) => Math.abs(value - successful[index]));
    const jitterMs = differences.length
        ? Math.round(differences.reduce((sum, value) => sum + value, 0) / differences.length)
        : null;
    const lossPercent = Math.round(((samples.length - successful.length) / samples.length) * 100);
    let failures = 0;
    for (let index = samples.length - 1; index >= 0 && samples[index].rttMs === null; index -= 1) {
        failures += 1;
    }
    const outageSeconds = failures * intervalSeconds;
    let status;
    if (samples.slice(-3).every((sample) => sample.rttMs === null))
        status = "OFFLINE";
    else if (currentMs === null)
        status = "DEGRADED";
    else if (lossPercent >= 10)
        status = "DEGRADED";
    else if (successful.length < 12)
        status = "LEARNING";
    else if ((successful.length >= 20 && (p95Ms ?? 0) >= 250) || (jitterMs ?? 0) >= 80)
        status = "DEGRADED";
    else if (lossPercent > 0 || (successful.length >= 20 && (p95Ms ?? 0) >= 140) || (jitterMs ?? 0) >= 35)
        status = "WATCH";
    else
        status = "ONLINE";
    return { status, currentMs, medianMs, p95Ms, jitterMs, lossPercent, samples: samples.length, outageSeconds };
}
async function measureHttpsRtt() {
    const start = performance.now();
    try {
        const response = await fetch(CONNECTIVITY_URL, {
            cache: "no-store",
            signal: AbortSignal.timeout(4_000),
        });
        return response.ok ? Math.round(performance.now() - start) : null;
    }
    catch {
        return null;
    }
}
async function detectDish() {
    try {
        await fetch(DISH_URL, {
            method: "GET",
            redirect: "manual",
            signal: AbortSignal.timeout(1_500),
        });
        return true;
    }
    catch {
        return false;
    }
}
function percentile(sorted, fraction) {
    if (sorted.length === 0)
        return null;
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}
function median(sorted) {
    if (sorted.length === 0)
        return null;
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2)
        return sorted[middle];
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
//# sourceMappingURL=network.js.map