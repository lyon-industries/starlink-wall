import type { Observer } from "./types.js";
export declare function readObserver(): Promise<Observer | null>;
export declare function saveObserver(observer: Observer): Promise<void>;
export declare function promptForObserver(existing?: Observer | null): Promise<Observer>;
export declare const validLatitude: (value: number) => boolean;
export declare const validLongitude: (value: number) => boolean;
