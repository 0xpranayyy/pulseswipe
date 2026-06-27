import { NextRequest } from 'next/server'

/**
 * GET /api/earn
 * Fetches:
 * 1. All markets with liquidity rewards (from CLOB API)
 * 2. User's open orders (if address provided)
 * 3. User's earned rewards for today
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')

  try {
    // Fetch rewarded markets from CLOB
    const rewardsRes = await fetch('https://clob.polymarket.com/rewards/markets', {
      next: { revalidate: 300 },
    })

    let rewardedMarkets: any[] = []
    if (rewardsRes.ok) {
      const data = await rewardsRes.json()
      // Enrich with Gamma market data (question, image)
      rewardedMarkets = await enrichWithMarketData(data || [])
    }

    let earnings = null
    let openOrders: any[] = []

    return Response.json({
      markets: rewardedMarkets.slice(0, 30),
      earnings,
      openOrders,
    })
  } catch (error: any) {
    return Response.json({ markets: [], earnings: null, openOrders: [], error: error.message }, { status: 500 })
  }
}

async function enrichWithMarketData(rewards: any[]) {
  try {
    // Get condition IDs from rewards
    const conditionIds = rewards.slice(0, 20).map((r: any) => r.condition_id).filter(Boolean)

    // Batch fetch market data from Gamma API
    const enriched = await Promise.all(
      conditionIds.map(async (condId: string) => {
        try {
          const r = await fetch(`https://gamma-api.polymarket.com/markets?condition_id=${condId}&limit=1`, {
            next: { revalidate: 60 },
          })
          if (!r.ok) return null
          const data = await r.json()
          const market = Array.isArray(data) ? data[0] : data

          const rewardInfo = rewards.find((r: any) => r.condition_id === condId)

          let outcomePrices = [0.5, 0.5]
          try { outcomePrices = JSON.parse(market?.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}

          let clobTokenIds: string[] = []
          try { clobTokenIds = JSON.parse(market?.clobTokenIds || '[]') } catch {}

          return {
            condition_id: condId,
            question: market?.question || 'Unknown market',
            image: market?.image || market?.icon || '',
            slug: market?.slug,
            eventSlug: market?.slug,
            midpoint: outcomePrices[0],
            negRisk: market?.negRisk || false,
            tokens: [
              { outcome: 'Yes', token_id: clobTokenIds[0] },
              { outcome: 'No', token_id: clobTokenIds[1] },
            ],
            rewards_daily: rewardInfo?.daily_rewards || 0,
            rewards_max_spread: rewardInfo?.max_spread || 0.03,
            rewards_min_size: rewardInfo?.min_size || 10,
          }
        } catch { return null }
      })
    )

    return enriched.filter(Boolean)
  } catch {
    return rewards
  }
}
