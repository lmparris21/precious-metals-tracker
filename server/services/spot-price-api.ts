export async function fetchSpotPrices(): Promise<Record<string, number>> {
  const apiKey = process.env.METALS_DEV_API_KEY
  if (!apiKey) {
    throw new Error('No API key configured. Set METALS_DEV_API_KEY environment variable or use manual prices.')
  }

  const response = await fetch(
    `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`
  )

  if (!response.ok) {
    throw new Error(`Metals API returned ${response.status}: ${response.statusText}`)
  }

  const data = await response.json() as { status: string; metals: Record<string, number> }

  if (data.status !== 'success') {
    throw new Error('Metals API returned non-success status')
  }

  // Only return the metals we track
  const tracked = ['silver', 'gold', 'platinum', 'palladium']
  const prices: Record<string, number> = {}
  for (const metal of tracked) {
    if (data.metals[metal] != null) {
      prices[metal] = data.metals[metal]
    }
  }

  return prices
}
