import type { Observer, Pass, Snapshot, TrackedSatellite, VisibleSatellite } from "./types.js";
export declare function computeSnapshot(satellites: TrackedSatellite[], observer: Observer, at?: Date): Snapshot;
export declare function lookAt(satellite: TrackedSatellite, observer: Observer, at: Date): VisibleSatellite | null;
export declare function predictPasses(satellites: TrackedSatellite[], observer: Observer, start?: Date, options?: {
    horizonMinutes?: number;
    stepSeconds?: number;
    minimumPeak?: number;
}): Pass[];
export declare function visibilitySeries(satellites: TrackedSatellite[], observer: Observer, start?: Date): number[];
export declare function subpoint(satellite: TrackedSatellite, at?: Date): {
    latitude: number;
    longitude: number;
} | null;
