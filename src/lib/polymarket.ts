/**
 * Polymarket API Integration
 * 
 * APIs used:
 * - Gamma API (https://gamma-api.polymarket.com) — Market discovery & metadata (PUBLIC)
 * - CLOB API (https://clob.polymarket.com) — Live prices, orderbooks, price history (PUBLIC)
 * 
 * No API keys needed for reading market data.
 */

// ============================================================
// TYPES
// ============================================================

export interface GammaMarket {
  id: string
  question: string
  conditionId: string
  slug: string
  resolutionSource: string
  endDate: string
  liquidity: string
  startDate: string
  image: string
  icon: string
  description: string
  outcomes: string
  outcomePrices: string
  volume: string
  active: boolean
  closed: boolean
  createdAt: string
  updatedAt: string
  archived: boolean
  restricted: boolean
  questionID: string
  enableOrderBook: boolean
  volumeNum: number
  liquidityNum: number
  endDateIso: string
  volume24hr: number
  clobTokenIds: string
  liquidityClob: number
  acceptingOrders: boolean
  negRisk: boolean
  negRiskMarketID: string
  tags: Array<{ id: string; label: string; slug: string }> | null
}

export interface PriceHistoryPoint {
  t: number
  p: number
}

export interface AppMarket {
  id: string
  question: string
  slug: string
  eventSlug: string  // The parent event slug — used for Polymarket URLs
  image: string
  description: string
  category: string
  probability: number
  volume: number
  volume24hr: number
  liquidity: number
  endDate: string
  outcomes: string[]
  outcomePrices: number[]
  clobTokenIds: string[]
  acceptingOrders: boolean
  negRisk: boolean
  sparklineData: number[]
  trendDirection: number
}

// ============================================================
// GAMMA API — Market Discovery
// ============================================================

const GAMMA_API = 'https://gamma-api.polymarket.com'
const CLOB_API = 'https://clob.polymarket.com'

/**
 * Fetch active events (includes markets with correct event slugs)
 * This is the preferred method — gives us the event slug for proper Polymarket URLs
 */
export async function fetchActiveEvents(params: {
  limit?: number
  offset?: number
  order?: string
}): Promise<Array<{ slug: string; title: string; image: string; markets: GammaMarket[] }>> {
  const searchParams = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: String(params.limit ?? 30),
    offset: String(params.offset ?? 0),
    order: params.order ?? 'volume_24hr',
    ascending: 'false',
  })

  const res = await fetch(`${GAMMA_API}/events?${searchParams}`, {
    next: { revalidate: 30 },
  })

  if (!res.ok) {
    console.error(`Gamma events API error: ${res.status}`)
    return []
  }

  return res.json()
}

/**
 * Get price history for sparkline charts
 */
export async function getPriceHistory(
  tokenId: string,
  interval: 'max' | '1w' | '1d' | '6h' | '1h' = '1d',
  fidelity = 20
): Promise<PriceHistoryPoint[]> {
  try {
    const res = await fetch(
      `${CLOB_API}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.history ?? []
  } catch {
    return []
  }
}

// ============================================================
// TRANSFORM — Gamma market → App market
// ============================================================

function categorize(question: string, tags: Array<{ label: string }> | null): string {
  const text = [question, ...(tags || []).map((t) => t.label)].join(' ').toLowerCase()

  if (/crypto|bitcoin|btc|ethereum|eth|solana|defi|blockchain|token|coin|nft/i.test(text)) return 'CRYPTO'
  if (/sport|nba|nfl|soccer|football|tennis|f1|ufc|boxing|mlb|nhl|championship|game score|playoff/i.test(text)) return 'SPORTS'
  if (/politic|election|president|congress|senate|governor|vote|democrat|republican|trump|biden|party|legislation/i.test(text)) return 'POLITICS'
  if (/\bai\b|artificial intelligence|gpt|openai|llm|machine learning|robot|autonomous|neural|chatgpt/i.test(text)) return 'AI'
  if (/tiktok|youtube|twitter|instagram|influencer|viral|meme|internet|streamer|celebrity|entertainment|movie|music|album|artist|gta/i.test(text)) return 'CULTURE'
  return 'OTHER'
}

export function transformMarket(raw: GammaMarket, eventSlug?: string): AppMarket {
  let outcomes: string[] = ['Yes', 'No']
  let outcomePrices: number[] = [0.5, 0.5]
  let clobTokenIds: string[] = []

  try { outcomes = JSON.parse(raw.outcomes || '["Yes","No"]') } catch {}
  try { outcomePrices = JSON.parse(raw.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}
  try { clobTokenIds = JSON.parse(raw.clobTokenIds || '[]') } catch {}

  return {
    id: raw.id,
    question: raw.question,
    slug: raw.slug,
    eventSlug: eventSlug || raw.slug, // Use event slug if provided, else market slug
    image: raw.image || raw.icon || '',
    description: raw.description || '',
    category: categorize(raw.question, raw.tags),
    probability: outcomePrices[0] * 100,
    volume: raw.volumeNum || parseFloat(raw.volume) || 0,
    volume24hr: raw.volume24hr || 0,
    liquidity: raw.liquidityClob || raw.liquidityNum || parseFloat(raw.liquidity) || 0,
    endDate: raw.endDateIso || raw.endDate || '',
    outcomes,
    outcomePrices,
    clobTokenIds,
    acceptingOrders: raw.acceptingOrders,
    negRisk: raw.negRisk,
    sparklineData: [],
    trendDirection: 0,
  }
}

/**
 * Enrich market with CLOB price history (sparkline + trend)
 */
export async function enrichWithHistory(market: AppMarket): Promise<AppMarket> {
  const tokenId = market.clobTokenIds[0]
  if (!tokenId || tokenId.startsWith('mock-')) return market

  const history = await getPriceHistory(tokenId, '1w', 20)
  if (history.length < 2) return market

  const sparklineData = history.map((p) => p.p * 100)
  const first = history[0].p
  const last = history[history.length - 1].p
  const trendDirection = first > 0 ? ((last - first) / first) * 100 : 0

  return { ...market, sparklineData, trendDirection }
}
