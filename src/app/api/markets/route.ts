import { NextRequest } from 'next/server'
import { fetchActiveEvents, transformMarket, enrichWithHistory, AppMarket } from '@/lib/polymarket'

/**
 * GET /api/markets
 * 
 * Fetches real markets from Polymarket via the Events endpoint.
 * All data is live from Polymarket — no mock/simulated markets.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '40')
  const offset = parseInt(searchParams.get('offset') || '0')
  const category = searchParams.get('category')
  const enrich = searchParams.get('enrich') === 'true'

  try {
    // Fetch more events to ensure we have enough after filtering
    const fetchLimit = category === 'EXPIRING' ? 100 : 80
    const events = await fetchActiveEvents({ limit: fetchLimit, offset, order: 'volume_24hr' })

    // Transform: flatten events into individual markets
    let markets: AppMarket[] = []
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)

    for (const event of events) {
      if (!event.markets) continue
      for (const market of event.markets) {
        if (!market.acceptingOrders || !market.enableOrderBook) continue
        const transformed = transformMarket(market, event.slug)
        // Skip fully resolved markets (price at 0 or 100)
        if (transformed.probability <= 1 || transformed.probability >= 99) continue
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
      if (category === 'EXPIRING') {
        const nowTime = Date.now()
        let limitTime = nowTime + 48 * 60 * 60 * 1000
        let filtered = markets.filter((m) => {
          if (!m.endDate) return false
          const end = new Date(m.endDate).getTime()
          return !isNaN(end) && end > nowTime && end <= limitTime
        })
        // Expand to 7 days if too few results
        if (filtered.length < 10) {
          limitTime = nowTime + 7 * 24 * 60 * 60 * 1000
          filtered = markets.filter((m) => {
            if (!m.endDate) return false
            const end = new Date(m.endDate).getTime()
            return !isNaN(end) && end > nowTime && end <= limitTime
          })
        }
        markets = filtered
      } else {
        markets = markets.filter((m) => m.category.toUpperCase() === category.toUpperCase())
      }
    }

    // Shuffle for discovery, then cap at limit
    markets = shuffleArray(markets).slice(0, limit)

    // Enrich top markets with sparkline/trend data
    if (enrich && markets.length > 0) {
      const enrichCount = Math.min(6, markets.length)
      const enriched = await Promise.all(
        markets.slice(0, enrichCount).map(enrichWithHistory)
      )
      markets = [...enriched, ...markets.slice(enrichCount)]
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
