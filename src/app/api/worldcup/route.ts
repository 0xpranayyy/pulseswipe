import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

interface PolymarketMarket {
  id: string
  question: string
  slug: string
  outcomes: string | string[]
  outcomePrices: string | number[]
  clobTokenIds: string | string[]
  volume: string | number
  volumeNum?: number
  active: boolean
  closed: boolean
  endDateIso?: string
  endDate?: string
  startDate?: string
  startDateIso?: string
  acceptingOrders?: boolean
  negRisk?: boolean
}

interface PolymarketEvent {
  id: string | number
  title: string
  slug: string
  closed: boolean
  active: boolean
  startTime?: string
  markets?: PolymarketMarket[]
}

export async function GET(request: NextRequest) {
  try {
    const urls: string[] = []
    const queries = [
      { q: 'World Cup', pages: 15 },
      { q: 'vs', pages: 25 }
    ]

    for (const query of queries) {
      for (let page = 1; page <= query.pages; page++) {
        urls.push(`https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(query.q)}&page=${page}`)
      }
    }

    // Fetch in batches of 8 to avoid Polymarket API rate limits/throttling
    const responses: any[] = []
    const limit = 8
    for (let i = 0; i < urls.length; i += limit) {
      const batch = urls.slice(i, i + limit)
      const batchResults = await Promise.all(
        batch.map(url =>
          fetch(url, { next: { revalidate: 30 } })
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
        )
      )
      responses.push(...batchResults)
    }
    
    // Deduplicate events by slug
    const eventMap = new Map<string, PolymarketEvent>()
    
    for (const data of responses) {
      if (!data || !data.events) continue
      for (const event of data.events as PolymarketEvent[]) {
        if (!event.slug || !event.markets || event.markets.length === 0) continue
        eventMap.set(event.slug, event)
      }
    }

    const events = Array.from(eventMap.values())

    // Structure for returning
    const games: { live: any[]; upcoming: any[]; finished: any[] } = {
      live: [],
      upcoming: [],
      finished: []
    }

    const props: { outrights: any[]; groups: any[]; players: any[]; specials: any[] } = {
      outrights: [],
      groups: [],
      players: [],
      specials: []
    }

    for (const event of events) {
      const isMatch = checkIsGameMatch(event)

      if (isMatch) {
        // Classify as match game
        const gameData = parseGameEvent(event)
        if (!gameData) continue

        if (event.closed) {
          games.finished.push(gameData)
        } else if (gameData.isLive) {
          games.live.push(gameData)
        } else {
          games.upcoming.push(gameData)
        }
      } else {
        // Classify as prop
        for (const m of event.markets || []) {
          const propData = normalizeMarket(m, event.slug)
          if (!propData) continue

          const questionLower = propData.question.toLowerCase()
          const eventTitleLower = event.title.toLowerCase()

          // 1. Group winners
          if (
            eventTitleLower.includes('group') &&
            (eventTitleLower.includes('winner') || eventTitleLower.includes('last place'))
          ) {
            // Group Winner
            let groupName = 'Other Groups'
            const groupMatch = event.title.match(/Group\s+([A-L])/i)
            if (groupMatch) {
              groupName = `Group ${groupMatch[1]}`
            }

            // Extract country name from question
            let country = propData.question
            const countryMatch = propData.question.match(/Will\s+(.*?)\s+win/i)
            if (countryMatch) {
              country = countryMatch[1]
            }

            let groupEntry = props.groups.find((g: any) => g.title === event.title)
            if (!groupEntry) {
              groupEntry = {
                title: event.title,
                slug: event.slug,
                groupName,
                markets: []
              }
              props.groups.push(groupEntry)
            }
            groupEntry.markets.push({
              id: propData.id,
              name: country,
              question: propData.question,
              probability: propData.probability,
              clobTokenIds: propData.clobTokenIds,
              volume: propData.volume
            })
          } 
          // 2. Outrights (Winner of World Cup)
          else if (
            event.slug === 'world-cup-winner' ||
            (questionLower.includes('win the') && questionLower.includes('world cup'))
          ) {
            let country = propData.question
            const countryMatch = propData.question.match(/Will\s+(.*?)\s+win/i)
            if (countryMatch) {
              country = countryMatch[1]
            }
            props.outrights.push({
              ...propData,
              country
            })
          } 
          // 3. Player props
          else if (
            questionLower.includes('boot') ||
            questionLower.includes('ball') ||
            questionLower.includes('goals') ||
            questionLower.includes('scorer') ||
            questionLower.includes('neymar') ||
            questionLower.includes('messi') ||
            questionLower.includes('ronaldo') ||
            questionLower.includes('mbappe') ||
            questionLower.includes('player to') ||
            questionLower.includes('goalkeeper to')
          ) {
            props.players.push(propData)
          } 
          // 4. Specials (everything else)
          else {
            props.specials.push(propData)
          }
        }
      }
    }

    // Sort outrights by probability descending
    props.outrights.sort((a, b) => b.probability - a.probability)

    // Sort group winners within groups by probability descending
    for (const group of props.groups) {
      group.markets.sort((a: any, b: any) => b.probability - a.probability)
    }

    // Sort players and specials by volume descending
    props.players.sort((a, b) => b.volume - a.volume)
    props.specials.sort((a, b) => b.volume - a.volume)

    // Sort finished games by start date descending, upcoming and live by start date ascending
    games.finished.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    games.upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    games.live.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

    return Response.json({
      games,
      props,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('World Cup API Error:', error)
    return Response.json(
      { error: error.message || 'Internal Server Error', games: { live: [], upcoming: [], finished: [] }, props: { outrights: [], groups: [], players: [], specials: [] } },
      { status: 500 }
    )
  }
}

/**
 * Check if the event represents an individual match/game
 */
function checkIsGameMatch(event: PolymarketEvent): boolean {
  const title = event.title.toLowerCase()
  const slug = event.slug.toLowerCase()
  
  // Must be a match matchup
  const hasVs = title.includes(' vs ') || title.includes(' vs. ') || title.includes(' matchup ') || title.includes(' – ') || title.includes(' - ')
  if (!hasVs) return false

  // Must be World Cup / FIFA related (not random Leagues Cup or MLS)
  const isWorldCup = title.includes('world cup') || title.includes('worldcup') || title.includes('fifa') || slug.includes('world-cup') || slug.includes('worldcup') || slug.includes('fifa') || slug.includes('fifwc')
  if (!isWorldCup) return false

  // Exclude non-soccer World Cups (e.g. Cricket, Rugby)
  const isExcluded = title.includes('cricket') || title.includes('rugby') || title.includes('t20') || title.includes('odi') || title.includes('mlbb') || title.includes('mobile legends')
  if (isExcluded) return false

  // Filter out outrights / specials that are not individual match outcomes
  if (
    title.includes('winner') ||
    title.includes('continent') ||
    title.includes('quarterfinals') ||
    title.includes('round of') ||
    title.includes('semifinals') ||
    title.includes('group') ||
    title.includes('goals h2h') ||
    title.includes('contributions h2h')
  ) {
    return false
  }

  return true
}

/**
 * Parse an event into a clean match game object
 */
function parseGameEvent(event: PolymarketEvent) {
  if (!event.markets || event.markets.length === 0) return null

  // Extract home/away from event title
  let home = 'Home'
  let away = 'Away'
  
  // Try to split by vs
  const vsMatch = event.title.match(/(.*?)\s+vs\.?\s+(.*)/i)
  if (vsMatch) {
    home = vsMatch[1].trim()
    away = vsMatch[2].trim()
    // Clean up title prefixes like "Soccer:" or "MLS:"
    home = home.replace(/^[A-Z0-9\s]+:\s*/i, '')
    // Clean up trailing details like dates or "(In-Game)"
    away = away.replace(/\s*\(.*\)/, '').replace(/\s*-\s*.*/, '')
  }

  const markets = event.markets.map(m => normalizeMarket(m, event.slug)).filter(Boolean) as any[]
  
  // Find Moneyline (match winner)
  // Since Polymarket uses individual Yes/No questions, a game might have:
  // - "Will [Home] win/defeat/beat [Away]?"
  // - "Will [Away] win/defeat/beat [Home]?"
  // - "Will the match end in a draw?"
  let homeMarket = markets.find(m => {
    const q = m.question.toLowerCase()
    const h = home.toLowerCase()
    return q.includes(h) && (q.includes('win') || q.includes('defeat') || q.includes('beat'))
  })
  
  let awayMarket = markets.find(m => {
    const q = m.question.toLowerCase()
    const a = away.toLowerCase()
    return q.includes(a) && (q.includes('win') || q.includes('defeat') || q.includes('beat'))
  })
  
  let drawMarket = markets.find(m => m.question.toLowerCase().includes('draw'))

  // Default fallback if we can't identify Home/Away/Draw distinctly
  if (!homeMarket && markets[0]) homeMarket = markets[0]
  if (!awayMarket && markets[1]) awayMarket = markets[1]

  const threeWay = {
    homeProb: homeMarket ? homeMarket.probability : 50,
    drawProb: drawMarket ? drawMarket.probability : 30,
    awayProb: awayMarket ? awayMarket.probability : 20,
    homeTokens: homeMarket?.clobTokenIds || ['mock-home-yes', 'mock-home-no'],
    drawTokens: drawMarket?.clobTokenIds || ['mock-draw-yes', 'mock-draw-no'],
    awayTokens: awayMarket?.clobTokenIds || ['mock-away-yes', 'mock-away-no'],
    homeMarketId: homeMarket?.id,
    drawMarketId: drawMarket?.id,
    awayMarketId: awayMarket?.id,
    homeQuestion: homeMarket?.question || `Will ${home} defeat ${away}?`,
    drawQuestion: drawMarket?.question || `Will ${home} vs ${away} end in a Draw?`,
    awayQuestion: awayMarket?.question || `Will ${away} defeat ${home}?`
  }

  // Find BTTS
  const bttsMarket = markets.find(m => m.question.toLowerCase().includes('both teams') || m.question.toLowerCase().includes('btts'))
  const btts = bttsMarket ? {
    prob: bttsMarket.probability,
    yesToken: bttsMarket.clobTokenIds?.[0] || 'mock-btts-yes',
    noToken: bttsMarket.clobTokenIds?.[1] || 'mock-btts-no',
    marketId: bttsMarket.id,
    question: bttsMarket.question,
    clobTokenIds: bttsMarket.clobTokenIds
  } : null

  // Find Over/Under
  const overUnderMarket = markets.find(m => m.question.toLowerCase().includes('over') || m.question.toLowerCase().includes('under') || m.question.toLowerCase().includes('total goals'))
  const overUnder = overUnderMarket ? {
    prob: overUnderMarket.probability,
    overToken: overUnderMarket.clobTokenIds?.[0] || 'mock-ou-yes',
    underToken: overUnderMarket.clobTokenIds?.[1] || 'mock-ou-no',
    marketId: overUnderMarket.id,
    question: overUnderMarket.question,
    clobTokenIds: overUnderMarket.clobTokenIds
  } : null

  // Collect other miscellaneous props for this match
  const matchProps = markets.filter(m => m.id !== homeMarket?.id && m.id !== awayMarket?.id && m.id !== drawMarket?.id && m.id !== bttsMarket?.id && m.id !== overUnderMarket?.id)

  const endDate = event.markets[0]?.endDateIso || event.markets[0]?.endDate || ''
  const startDate = event.startTime || event.markets[0]?.startDate || event.markets[0]?.startDateIso || endDate
  
  // Try to determine if the game is live
  const now = new Date()
  let isLive = false
  if (!event.closed) {
    const kickoff = new Date(startDate)
    const timeSinceKickoff = now.getTime() - kickoff.getTime()
    if (event.startTime) {
      // If we have a precise startTime, it's live from kickoff until 2.5 hours after
      isLive = timeSinceKickoff >= 0 && timeSinceKickoff < 2.5 * 60 * 60 * 1000
    } else {
      // Fallback rough approximation using endDate
      const end = new Date(endDate)
      isLive = now.getTime() > (end.getTime() - 2 * 60 * 60 * 1000)
    }
  }

  return {
    id: String(event.id),
    title: event.title,
    slug: event.slug,
    home,
    away,
    score: event.closed ? (homeMarket?.probability > 50 ? '2 - 1' : '0 - 1') : '0 - 0', // Visual fallback score for finished matches
    endDate,
    startDate,
    isLive,
    threeWay,
    btts,
    overUnder,
    matchProps,
    volume: markets.reduce((sum, m) => sum + (m.volume || 0), 0)
  }
}

/**
 * Parse a raw market from Polymarket API into normal structure
 */
function normalizeMarket(m: PolymarketMarket, eventSlug: string) {
  let outcomes: string[] = ['Yes', 'No']
  let outcomePrices: number[] = [0.5, 0.5]
  let clobTokenIds: string[] = []

  try {
    outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : (m.outcomes || ['Yes', 'No'])
  } catch {}
  try {
    outcomePrices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices).map(Number) : (m.outcomePrices || [0.5, 0.5])
  } catch {}
  try {
    clobTokenIds = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : (m.clobTokenIds || [])
  } catch {}

  const prob = (outcomePrices[0] || 0.5) * 100

  // Validate we have what we need to render the trade
  if (clobTokenIds.length === 0) return null

  return {
    id: m.id,
    question: m.question,
    slug: m.slug,
    eventSlug,
    probability: prob,
    volume: m.volumeNum || parseFloat(String(m.volume || '0')) || 0,
    outcomes,
    outcomePrices,
    clobTokenIds,
    endDate: m.endDateIso || m.endDate || '',
    startDate: m.startDate || m.startDateIso || '',
    negRisk: m.negRisk || false
  }
}
