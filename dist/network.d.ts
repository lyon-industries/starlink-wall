export type NetworkSample = {
    at: Date;
    rttMs: number | null;
    dishReachable: boolean | null;
};
export type NetworkStatus = "STARTING" | "LEARNING" | "ONLINE" | "WATCH" | "DEGRADED" | "OFFLINE";
export type NetworkSummary = {
    status: NetworkStatus;
    currentMs: number | null;
    medianMs: number | null;
    p95Ms: number | null;
    jitterMs: number | null;
    lossPercent: number;
    samples: number;
    outageSeconds: number;
};
export declare function measureNetworkSample(checkDish?: boolean): Promise<NetworkSample>;
export declare function summarizeNetwork(samples: NetworkSample[], intervalSeconds?: number): NetworkSummary;
