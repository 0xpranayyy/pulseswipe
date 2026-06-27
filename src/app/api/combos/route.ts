import { NextRequest } from 'next/server'

/**
 * GET /api/combos
 * 
 * Fetches combo-eligible World Cup markets from Polymarket.
 * Uses the Gamma API to find markets with comboStatus: "enabled"
 * that are related to the FIFA World Cup 2026.
 * 
 * Once the user-side RFQ requester API is available,
 * this route will also handle combo quote requests.
 */

const GAMMA_API = 'https://gamma-api.polymarket.com'

interface ComboMarket {
  id: string
  question: string
  slug: string
  eventSlug: string
  image: string
  probability: number
  volume: number
  endDate: string
  clobTokenIds: string[]
  positionIds: string[]
  conditionId: string
  negRisk: boolean
  comboStatus: string
  category: string
}

export async function GET(request: NextRequest) {
  try {
    // Search for active WC match markets that are combo-enabled
    const queries = [
      'FIFA 2026 win',
      'world cup 2026 vs',
      'world cup 2026 beat',
      'world cup 2026 draw',
    ]

    const allMarkets: ComboMarket[] = []
    const seenIds = new Set<string>()

    for (const q of queries) {
      try {
        const res = await fetch(
          `${GAMMA_API}/public-search?q=${encodeURIComponent(q)}&limit=30`,
          { next: { revalidate: 60 } }
        )
        if (!res.ok) continue
        const data = await res.json()

        // Process events
        for (const event of data.events || []) {
          for (const m of event.markets || []) {
            if (seenIds.has(m.id)) continue
            if (m.comboStatus !== 'enabled') continue
            if (!m.acceptingOrders) continue

            let outcomePrices = [0.5, 0.5]
            let clobTokenIds: string[] = []
            try { outcomePrices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}
            try { clobTokenIds = JSON.parse(m.clobTokenIds || '[]') } catch {}

            const prob = outcomePrices[0] * 100
            if (prob <= 1 || prob >= 99) continue

            seenIds.add(m.id)
            allMarkets.push({
              id: m.id,
              question: m.question,
              slug: m.slug,
              eventSlug: event.slug || m.slug,
              image: m.image || m.icon || event.image || '',
              probability: prob,
              volume: m.volumeNum || parseFloat(m.volume || '0'),
              endDate: m.endDateIso || m.endDate || '',
              clobTokenIds,
              positionIds: clobTokenIds, // Position IDs for combo legs
              conditionId: m.conditionId || '',
              negRisk: m.negRisk || false,
              comboStatus: m.comboStatus,
              category: categorizeWC(m.question, event.title),
            })
          }
        }

        // Process direct market results
        for (const m of data.markets || []) {
          if (seenIds.has(m.id)) continue
          if (m.comboStatus !== 'enabled') continue
          if (!m.acceptingOrders) continue

          let outcomePrices = [0.5, 0.5]
          let clobTokenIds: string[] = []
          try { outcomePrices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}
          try { clobTokenIds = JSON.parse(m.clobTokenIds || '[]') } catch {}

          const prob = outcomePrices[0] * 100
          if (prob <= 1 || prob >= 99) continue

          seenIds.add(m.id)
          allMarkets.push({
            id: m.id,
            question: m.question,
            slug: m.slug,
            eventSlug: m.slug,
            image: m.image || m.icon || '',
            probability: prob,
            volume: m.volumeNum || parseFloat(m.volume || '0'),
            endDate: m.endDateIso || m.endDate || '',
            clobTokenIds,
            positionIds: clobTokenIds,
            conditionId: m.conditionId || '',
            negRisk: m.negRisk || false,
            comboStatus: m.comboStatus,
            category: categorizeWC(m.question, ''),
          })
        }
      } catch {
        // Skip failed queries
      }
    }

    // Sort by volume descending
    allMarkets.sort((a, b) => b.volume - a.volume)

    return Response.json({
      markets: allMarkets,
      total: allMarkets.length,
      comboEnabled: true,
      // When requester API is available, this will include RFQ endpoints
      rfqAvailable: false,
    })
  } catch (error: any) {
    console.error('Combos API error:', error)
    return Response.json(
      { markets: [], total: 0, comboEnabled: false, rfqAvailable: false, error: error.message },
      { status: 500 }
    )
  }
}

function categorizeWC(question: string, eventTitle: string): string {
  const text = `${question} ${eventTitle}`.toLowerCase()
  if (text.includes('draw')) return 'DRAW'
  if (text.includes('win') || text.includes('beat') || text.includes('defeat')) return 'MATCH_WINNER'
  if (text.includes('goal') || text.includes('score')) return 'GOALS'
  if (text.includes('both teams')) return 'BTTS'
  if (text.includes('over') || text.includes('under')) return 'OVER_UNDER'
  return 'OTHER'
}
