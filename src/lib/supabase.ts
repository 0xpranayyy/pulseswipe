import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================
// WATCHLIST
// ============================================================

export async function getWatchlist(walletAddress: string) {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('wallet', walletAddress.toLowerCase())
    .order('created_at', { ascending: false })
  if (error) { console.error('getWatchlist:', error); return [] }
  return data || []
}

export async function addToWatchlist(walletAddress: string, market: {
  market_id: string
  question: string
  slug: string
  image: string
  probability: number
  category: string
}) {
  const { error } = await supabase.from('watchlist').upsert({
    wallet: walletAddress.toLowerCase(),
    market_id: market.market_id,
    question: market.question,
    slug: market.slug,
    image: market.image,
    probability_at_save: market.probability,
    category: market.category,
  }, { onConflict: 'wallet,market_id' })
  if (error) console.error('addToWatchlist:', error)
  return !error
}

export async function removeFromWatchlist(walletAddress: string, marketId: string) {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('wallet', walletAddress.toLowerCase())
    .eq('market_id', marketId)
  if (error) console.error('removeFromWatchlist:', error)
  return !error
}

// ============================================================
// ACTIVITY LOG
// ============================================================

export async function logActivity(walletAddress: string, action: {
  type: 'buy' | 'sell' | 'skip' | 'watchlist_add' | 'watchlist_remove'
  market_id: string
  question: string
  amount?: number
  side?: string
  price?: number
}) {
  const { error } = await supabase.from('activity').insert({
    wallet: walletAddress.toLowerCase(),
    type: action.type,
    market_id: action.market_id,
    question: action.question,
    amount: action.amount,
    side: action.side,
    price: action.price,
  })
  if (error) console.error('logActivity:', error)
}

export async function getActivity(walletAddress: string, limit = 50) {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('wallet', walletAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('getActivity:', error); return [] }
  return data || []
}


