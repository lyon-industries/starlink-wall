import type { DataSet } from "./types.js";
export declare const CELESTRAK_URL = "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?FILE=starlink&FORMAT=JSON";
export declare function loadData(options?: {
    force?: boolean;
}): Promise<DataSet>;
