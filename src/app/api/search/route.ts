import { NextRequest } from 'next/server'

/**
 * GET /api/search?q=bitcoin
 * Fetches markets from Gamma API server-side, filters by query
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''

  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=300&order=volume_24hr&ascending=false',
      { next: { revalidate: 30 } }
    )
    if (!res.ok) throw new Error(`Gamma ${res.status}`)
    const raw = await res.json()

    const markets = raw
      .filter((m: any) => m.acceptingOrders)
      .map((m: any) => {
        let outcomePrices = [0.5, 0.5]
        try { outcomePrices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}
        const prob = outcomePrices[0] * 100
        if (prob === 0 || prob === 100) return null
        let clobTokenIds: string[] = []
        try { clobTokenIds = JSON.parse(m.clobTokenIds || '[]') } catch {}
        return {
          id: m.id,
          question: m.question,
          slug: m.slug,
          eventSlug: m.slug,
          image: m.image || m.icon || '',
          category: categorize(m.question),
          probability: prob,
          volume: m.volumeNum || parseFloat(m.volume) || 0,
          volume24hr: m.volume24hr || 0,
          endDate: m.endDateIso || m.endDate || '',
          trendDirection: 0,
          clobTokenIds,
          negRisk: m.negRisk || false,
        }
      })
      .filter(Boolean)

    let results = markets
    if (q.trim()) {
      const lower = q.toLowerCase()
      results = markets.filter((m: any) => m.question.toLowerCase().includes(lower))
    }

    return Response.json({ markets: results, total: results.length })
  } catch (error: any) {
    return Response.json({ markets: [], total: 0, error: error.message }, { status: 500 })
  }
}

function categorize(question: string): string {
  const q = question.toLowerCase()
  if (/bitcoin|btc|ethereum|eth|crypto|solana|defi|token|coin/.test(q)) return 'CRYPTO'
  if (/nba|nfl|soccer|football|tennis|ufc|world cup|championship|sport/.test(q)) return 'SPORTS'
  if (/trump|biden|election|president|congress|democrat|republican|politic/.test(q)) return 'POLITICS'
  if (/\bai\b|gpt|openai|artificial|machine learning/.test(q)) return 'AI'
  return 'OTHER'
}
