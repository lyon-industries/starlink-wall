import type { VisibleSatellite } from "./types.js";
export declare function skyPlot(satellites: VisibleSatellite[], width?: number, height?: number): string[];
export declare function sparkline(values: number[]): string;
export declare function nullableSparkline(values: Array<number | null>): string;
export declare function bar(value: number, max: number, width: number): string;
export declare function compass(degrees: number): string;
export declare function formatAge(date: Date, now?: Date): string;
