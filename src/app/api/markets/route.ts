import { NextRequest } from 'next/server'
import { fetchActiveEvents, fetchActiveMarkets, transformMarket, enrichWithHistory, AppMarket } from '@/lib/polymarket'

/**
 * GET /api/markets
 * 
 * Fetches real markets from Polymarket via the Events endpoint (for correct slugs)
 * and enriches with CLOB price history for sparklines.
 * 
 * Returns shuffled markets for the Tinder-style card feed.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '40')
  const offset = parseInt(searchParams.get('offset') || '0')
  const category = searchParams.get('category')
  const enrich = searchParams.get('enrich') === 'true'

  try {
    // Fetch from events endpoint — gives us correct event slugs for URLs
    const events = await fetchActiveEvents({ limit: 30, offset, order: 'volume_24hr' })

    // Transform: flatten events into individual markets, carrying the event slug
    let markets: AppMarket[] = []
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000) // Only filter markets ended 24h+ ago
    for (const event of events) {
      if (!event.markets) continue
      for (const market of event.markets) {
        if (!market.acceptingOrders || !market.enableOrderBook) continue
        const transformed = transformMarket(market, event.slug)
        // Skip extreme probability markets (basically resolved)
        if (transformed.probability <= 2 || transformed.probability >= 98) continue
        // Skip markets that ended more than 24h ago
        if (transformed.endDate) {
          const end = new Date(transformed.endDate).getTime()
          if (!isNaN(end) && end < oneDayAgo) continue
        }
        markets.push(transformed)
      }
    }

    // Category filter
    if (category && category !== 'ALL') {
      markets = markets.filter((m) => m.category === category)
    }

    // Shuffle for random discovery
    markets = shuffleArray(markets).slice(0, limit)

    // Enrich top markets with sparkline data from CLOB price history
    if (enrich) {
      const enriched = await Promise.all(
        markets.slice(0, 6).map(enrichWithHistory)
      )
      markets = [...enriched, ...markets.slice(6)]
    }

    return Response.json({
      markets,
      total: markets.length,
      source: 'polymarket',
    })
  } catch (error) {
    console.error('Polymarket API error:', error)
    return Response.json({ markets: [], total: 0, source: 'error', error: String(error) }, { status: 500 })
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
