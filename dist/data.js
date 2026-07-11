import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import { json2satrec } from "satellite.js";
export const CELESTRAK_URL = "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=JSON";
const cachePath = join(homedir(), ".cache", "starlink-wall", "starlink-omm.json");
const bundledPath = fileURLToPath(new URL("../catalog/starlink-omm.json.gz", import.meta.url));
const twoHoursMs = 2 * 60 * 60 * 1000;
const unzip = promisify(gunzip);
export async function loadData(options = {}) {
    const cached = await readCache();
    const cacheAge = cached ? Date.now() - cached.fetchedAt.getTime() : Number.POSITIVE_INFINITY;
    if (!options.force && cached && cacheAge < twoHoursMs) {
        return buildDataSet(cached.records, cached.fetchedAt, "cache");
    }
    try {
        const response = await fetch(CELESTRAK_URL, {
            headers: {
                accept: "application/json",
                "user-agent": "starlink-wall/0.1 (+https://github.com/lyon-industries/starlink-wall)",
            },
            signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok)
            throw new Error(`CelesTrak returned HTTP ${response.status}`);
        const records = (await response.json());
        if (!Array.isArray(records) || records.length === 0)
            throw new Error("CelesTrak returned no records");
        const fetchedAt = new Date();
        await mkdir(dirname(cachePath), { recursive: true });
        await writeFile(cachePath, `${JSON.stringify({ fetchedAt: fetchedAt.toISOString(), records })}\n`);
        return buildDataSet(records, fetchedAt, "live");
    }
    catch (error) {
        if (cached)
            return buildDataSet(cached.records, cached.fetchedAt, "stale-cache");
        const bundled = await readBundled();
        if (bundled)
            return buildDataSet(bundled.records, bundled.fetchedAt, "bundled");
        throw error;
    }
}
async function readCache() {
    try {
        await stat(cachePath);
        const parsed = JSON.parse(await readFile(cachePath, "utf8"));
        return { fetchedAt: new Date(parsed.fetchedAt), records: parsed.records };
    }
    catch {
        return null;
    }
}
async function readBundled() {
    try {
        const compressed = await readFile(bundledPath);
        const records = JSON.parse((await unzip(compressed)).toString("utf8"));
        const epochs = records
            .map((record) => new Date(record.EPOCH).getTime())
            .filter(Number.isFinite)
            .sort((a, b) => a - b);
        const fetchedAt = new Date(epochs[Math.floor(epochs.length / 2)] ?? 0);
        return { records, fetchedAt };
    }
    catch {
        return null;
    }
}
function buildDataSet(records, fetchedAt, cacheStatus) {
    const satellites = [];
    const epochs = [];
    for (const record of records) {
        try {
            const epoch = new Date(record.EPOCH);
            const satrec = json2satrec(record);
            if (!Number.isFinite(epoch.getTime()) || satrec.error)
                continue;
            epochs.push(epoch.getTime());
            satellites.push({
                name: record.OBJECT_NAME,
                catalogId: Number(record.NORAD_CAT_ID),
                epoch,
                satrec,
            });
        }
        catch {
            // One malformed catalog row must not take the wall offline.
        }
    }
    epochs.sort((a, b) => a - b);
    const medianEpoch = epochs[Math.floor(epochs.length / 2)] ?? fetchedAt.getTime();
    return { satellites, fetchedAt, sourceEpoch: new Date(medianEpoch), cacheStatus };
}
//# sourceMappingURL=data.js.map