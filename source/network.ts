export async function measureInternetRtt(samples = 3): Promise<number | null> {
  const values: number[] = []
  for (let index = 0; index < samples; index += 1) {
    const start = performance.now()
    try {
      const response = await fetch("https://www.gstatic.com/generate_204", {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      })
      if (response.ok) values.push(performance.now() - start)
    } catch {
      // A wall should degrade cleanly when the connection is down.
    }
  }
  if (values.length === 0) return null
  values.sort((a, b) => a - b)
  return Math.round(values[Math.floor(values.length / 2)])
}
