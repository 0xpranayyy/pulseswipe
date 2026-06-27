/**
 * Recommendation Engine
 * 
 * Tracks user behavior (swipes, skips, buys) and builds a preference profile.
 * Uses this to score and rank markets for the feed.
 * 
 * Signals tracked:
 * - Categories user buys in (strongest signal)
 * - Categories user right-swipes (medium signal)
 * - Categories user skips/left-swipes (negative signal)
 * - Price ranges user prefers (near 50/50 vs high conviction)
 * - Volume ranges (degen vs safe)
 * - Time spent viewing a card (engagement)
 * - Keywords from questions user engages with
 */

const STORAGE_KEY = 'pulse_prefs'

export interface UserPreferences {
  // Category scores (-1 to 1, higher = more interested)
  categories: Record<string, number>
  // Probability range preference
  prefersHighConviction: number // 0-1, higher = likes markets far from 50%
  prefersHighVolume: number // 0-1
  // Keywords the user engages with
  keywords: Record<string, number>
  // Total interactions for weighting
  totalSwipes: number
  totalBuys: number
  totalSkips: number
}

function getPrefs(): UserPreferences {
  if (typeof window === 'undefined') return defaultPrefs()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : defaultPrefs()
  } catch { return defaultPrefs() }
}

function savePrefs(prefs: UserPreferences) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

function defaultPrefs(): UserPreferences {
  return {
    categories: {},
    prefersHighConviction: 0.5,
    prefersHighVolume: 0.5,
    keywords: {},
    totalSwipes: 0,
    totalBuys: 0,
    totalSkips: 0,
  }
}

/**
 * Record a user action and update preferences
 */
export function recordAction(action: 'buy' | 'skip', market: {
  category: string
  probability: number
  volume: number
  question: string
}) {
  const prefs = getPrefs()
  const weight = action === 'buy' ? 0.3 : -0.1 // Buys are strong positive, skips are weak negative

  // Update category score
  const cat = market.category
  prefs.categories[cat] = Math.max(-1, Math.min(1, (prefs.categories[cat] || 0) + weight))

  // Update conviction preference
  const conviction = Math.abs(market.probability - 50) / 50 // 0 = toss-up, 1 = high conviction
  if (action === 'buy') {
    prefs.prefersHighConviction = prefs.prefersHighConviction * 0.9 + conviction * 0.1
  }

  // Update volume preference
  const volScore = Math.min(1, market.volume / 5000000) // Normalize to 0-1
  if (action === 'buy') {
    prefs.prefersHighVolume = prefs.prefersHighVolume * 0.9 + volScore * 0.1
  }

  // Extract and score keywords
  const words = market.question.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  for (const word of words) {
    prefs.keywords[word] = Math.max(-1, Math.min(1, (prefs.keywords[word] || 0) + weight * 0.5))
  }

  // Update counts
  if (action === 'buy') prefs.totalBuys++
  else prefs.totalSkips++
  prefs.totalSwipes++

  savePrefs(prefs)
}

/**
 * Score a market based on user preferences.
 * Higher score = more likely to show first.
 */
export function scoreMarket(market: {
  category: string
  probability: number
  volume: number
  question: string
}): number {
  const prefs = getPrefs()

  // Not enough data yet — return random
  if (prefs.totalSwipes < 5) return Math.random()

  let score = 0

  // Category match (strongest signal)
  const catScore = prefs.categories[market.category] || 0
  score += catScore * 3

  // Conviction match
  const conviction = Math.abs(market.probability - 50) / 50
  const convictionMatch = 1 - Math.abs(conviction - prefs.prefersHighConviction)
  score += convictionMatch * 1.5

  // Volume match
  const volScore = Math.min(1, market.volume / 5000000)
  const volMatch = 1 - Math.abs(volScore - prefs.prefersHighVolume)
  score += volMatch

  // Keyword match
  const words = market.question.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  for (const word of words) {
    score += (prefs.keywords[word] || 0) * 0.5
  }

  // Add randomness to prevent filter bubble (exploration vs exploitation)
  score += (Math.random() - 0.5) * 1.5

  return score
}

/**
 * Sort markets by recommendation score
 */
export function rankMarkets<T extends { category: string; probability: number; volume: number; question: string }>(
  markets: T[]
): T[] {
  return [...markets].sort((a, b) => scoreMarket(b) - scoreMarket(a))
}


