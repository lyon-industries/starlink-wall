import { describe, expect, it } from "vitest"

import { summarizeNetwork, type NetworkSample } from "../source/network.js"

const samples = (values: Array<number | null>): NetworkSample[] => values.map((rttMs, index) => ({
  at: new Date(index * 5_000),
  rttMs,
  dishReachable: null,
}))

describe("network health", () => {
  it("reports stable paths as online", () => {
    const result = summarizeNetwork(samples(Array.from({ length: 20 }, (_, index) => 38 + (index % 6))))
    expect(result.status).toBe("ONLINE")
    expect(result.medianMs).toBe(40)
    expect(result.lossPercent).toBe(0)
  })

  it("surfaces loss and current outages", () => {
    expect(summarizeNetwork(samples([40, 42, null, 43, 41])).status).toBe("DEGRADED")
    const offline = summarizeNetwork(samples([40, null, null, null]))
    expect(offline.status).toBe("OFFLINE")
    expect(offline.outageSeconds).toBe(15)
  })

  it("uses explicit warm-up state", () => {
    expect(summarizeNetwork(samples([55, 51])).status).toBe("LEARNING")
  })
})
