import { describe, expect, it } from "vitest"

import { validLatitude, validLongitude } from "../source/config.js"

describe("observer coordinates", () => {
  it("accepts geographic bounds", () => {
    expect(validLatitude(90)).toBe(true)
    expect(validLatitude(-90)).toBe(true)
    expect(validLongitude(180)).toBe(true)
    expect(validLongitude(-180)).toBe(true)
  })

  it("rejects coordinates outside geographic bounds", () => {
    expect(validLatitude(90.01)).toBe(false)
    expect(validLongitude(-180.01)).toBe(false)
  })
})
