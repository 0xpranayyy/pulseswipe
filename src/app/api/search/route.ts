import { NextRequest } from 'next/server'

/**
 * GET /api/search?q=bitcoin
 * Uses Polymarket's /public-search endpoint for full-text search across ALL markets
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''

  if (!q.trim()) {
    return Response.json({ markets: [], total: 0 })
  }

  try {
    // Use Polymarket's dedicated search endpoint
    const res = await fetch(
      `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(q)}&limit=50`,
      { next: { revalidate: 10 } }
    )
    if (!res.ok) throw new Error(`Search API ${res.status}`)
    const data = await res.json()

    // Response has { events: [...], markets: [...] }
    // Combine events' markets + direct market results
    const markets: any[] = []

    // From events
    if (data.events) {
      for (const event of data.events) {
        if (event.markets) {
          for (const m of event.markets) {
            let outcomePrices = [0.5, 0.5]
            let clobTokenIds: string[] = []
            try { outcomePrices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}
            try { clobTokenIds = JSON.parse(m.clobTokenIds || '[]') } catch {}
            const prob = outcomePrices[0] * 100
            if (prob === 0 || prob === 100) continue
            markets.push({
              id: m.id,
              question: m.question,
              slug: m.slug,
              eventSlug: event.slug,
              image: m.image || m.icon || event.image || '',
              category: categorize(m.question),
              probability: prob,
              volume: m.volumeNum || parseFloat(m.volume || '0'),
              endDate: m.endDateIso || m.endDate || '',
              clobTokenIds,
              negRisk: m.negRisk || false,
            })
          }
        } else {
          // Event without nested markets — use event-level data
          markets.push({
            id: event.id,
            question: event.title,
            slug: event.slug,
            eventSlug: event.slug,
            image: event.image || '',
            category: categorize(event.title),
            probability: 50,
            volume: event.volume || 0,
            endDate: event.endDate || '',
            clobTokenIds: [],
            negRisk: false,
          })
        }
      }
    }

    // From direct market results
    if (data.markets) {
      for (const m of data.markets) {
        // Skip if already added from events
        if (markets.find(x => x.id === m.id)) continue
        let outcomePrices = [0.5, 0.5]
        let clobTokenIds: string[] = []
        try { outcomePrices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}
        try { clobTokenIds = JSON.parse(m.clobTokenIds || '[]') } catch {}
        const prob = outcomePrices[0] * 100
        if (prob === 0 || prob === 100) continue
        markets.push({
          id: m.id,
          question: m.question,
          slug: m.slug,
          eventSlug: m.slug,
          image: m.image || m.icon || '',
          category: categorize(m.question),
          probability: prob,
          volume: m.volumeNum || parseFloat(m.volume || '0'),
          endDate: m.endDateIso || m.endDate || '',
          clobTokenIds,
          negRisk: m.negRisk || false,
        })
      }
    }

    return Response.json({ markets, total: markets.length })
  } catch (error: any) {
    return Response.json({ markets: [], total: 0, error: error.message }, { status: 500 })
  }
}

function categorize(question: string): string {
  const q = (question || '').toLowerCase()
  if (/bitcoin|btc|ethereum|eth|crypto|solana|defi|token|coin/.test(q)) return 'CRYPTO'
  if (/nba|nfl|soccer|football|tennis|ufc|world cup|championship|sport|ipl|cricket|premier league/.test(q)) return 'SPORTS'
  if (/trump|biden|election|president|congress|democrat|republican|politic/.test(q)) return 'POLITICS'
  if (/\bai\b|gpt|openai|artificial|machine learning/.test(q)) return 'AI'
  return 'OTHER'
}
