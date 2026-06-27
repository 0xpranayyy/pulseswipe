'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, X, Clock, ChevronRight } from 'lucide-react'
import { timeRemaining } from '@/lib/utils'
import { useToast } from '@/components/toast'
import { useWallet } from '@/hooks/use-wallet'
import type { AppMarket } from '@/lib/polymarket'

// Mock user history / interests
const RECENT_SEARCHES = ['SpaceX', 'Federal Reserve', 'UFC 300']
const FOR_YOU_SUGGESTIONS = ['Bitcoin', 'Ethereum', 'Election', 'AI', 'Apple']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AppMarket[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [buyModal, setBuyModal] = useState<AppMarket | null>(null)
  
  const { address } = useWallet()
  const { toast, update } = useToast()

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setHasSearched(false); return }
    setLoading(true)
    setHasSearched(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.markets || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setHasSearched(false); return }
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const handleBuyComplete = (amount?: number, side?: 'YES' | 'NO', price?: number) => {
    if (buyModal && address) {
      import('@/lib/supabase').then(({ logActivity }) => {
        logActivity(address, { 
          type: 'buy', 
          market_id: buyModal.id, 
          question: buyModal.question,
          amount,
          side,
          price
        })
      }).catch(() => {})
    }
    setBuyModal(null)
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 overflow-x-hidden">
      {/* Search Header / Input */}
      <div className="px-5 pt-2 mb-6 sticky top-0 z-40 liquid-glass rounded-b-[24px] pb-5 pt-6 shadow-sm">
        <div className="relative">
          <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search markets..."
            autoFocus 
            className="w-full bg-surface-elevated rounded-[24px] pl-12 pr-12 py-4 text-[17px] text-text-primary font-medium placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/30 transition-shadow shadow-sm" 
          />
          <AnimatePresence>
            {query && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setQuery('')} 
                className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-text-secondary hover:text-white transition-colors"
              >
                <X size={14} strokeWidth={3} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Suggestions — show when no query */}
      {!query && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 space-y-8">
          
          {/* Recent Searches */}
          <div>
            <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-4">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {RECENT_SEARCHES.map(s => (
                <button 
                  key={s} 
                  onClick={() => setQuery(s)}
                  className="px-4 py-2.5 rounded-full bg-surface text-[13px] font-semibold text-text-secondary border border-white/[0.04] active:scale-95 transition-all hover:bg-surface-elevated"
                >
                  <span className="flex items-center gap-1.5"><Clock size={12} className="opacity-50" /> {s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* For You / Recommended */}
          <div>
            <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-4">Recommended For You</h3>
            <div className="flex flex-wrap gap-2">
              {FOR_YOU_SUGGESTIONS.map(s => (
                <button 
                  key={s} 
                  onClick={() => setQuery(s)}
                  className="px-4 py-2.5 rounded-full bg-surface text-[13px] font-semibold text-brand/80 border border-brand/10 active:scale-95 transition-all hover:bg-brand/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Results */}
      <div className="flex-1 px-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
          </div>
        ) : hasSearched && results.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <h2 className="text-lg font-bold font-display text-text-primary mb-2">No markets found</h2>
            <p className="text-text-tertiary text-sm">Try adjusting your search terms.</p>
          </motion.div>
        ) : hasSearched && results.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4">{results.length} Results</p>
            {results.slice(0, 30).map((market: any, i: number) => {
              const prob = Math.round(market.probability || 50)
              return (
                <motion.button 
                  key={market.id || i} 
                  onClick={() => setBuyModal(market)}
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: Math.min(i * 0.04, 0.4), type: 'spring', damping: 25, stiffness: 200 }}
                  className="w-full bg-surface-elevated rounded-[24px] p-4 flex flex-col text-left group active:scale-[0.98] transition-all border border-transparent hover:border-white/[0.04] shadow-sm"
                >
                  <div className="flex gap-4 items-start mb-3">
                    {market.image ? (
                      <div className="w-12 h-12 rounded-[14px] overflow-hidden flex-shrink-0 bg-surface">
                        <img src={market.image} alt="" className="w-full h-full object-cover opacity-90" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-[14px] bg-surface flex items-center justify-center flex-shrink-0 border border-white/[0.04]">
                        <span className="text-lg">📊</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-text-primary leading-snug line-clamp-2">{market.question}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-3 text-[11px] text-text-tertiary font-medium">
                      <span className="font-bold text-text-secondary uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md">{market.category || 'OTHER'}</span>
                      {market.endDate && <span className="flex items-center gap-1"><Clock size={10} />{timeRemaining(market.endDate)}</span>}
                    </div>
                    
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Yes</span>
                        <span className="text-[16px] font-extrabold text-text-primary leading-none">{prob}¢</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-brand transition-colors">
                        <ChevronRight size={16} className="text-text-secondary group-hover:text-black" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        ) : null}
      </div>

      {/* Buy Modal */}
      <AnimatePresence>
        {buyModal && <BuyModal market={buyModal} onComplete={handleBuyComplete} onCancel={() => setBuyModal(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// BUY MODAL
// ============================================================
function BuyModal({ market, onComplete, onCancel }: { market: AppMarket; onComplete: (amount?: number, side?: 'YES' | 'NO', price?: number) => void; onCancel: () => void }) {
  const { address } = useWallet()
  const [amount, setAmount] = useState(10)
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [status, setStatus] = useState<'input' | 'signing' | 'submitting' | 'success' | 'error'>('input')
  const [errorMsg, setErrorMsg] = useState('')
  const [liveYesPrice, setLiveYesPrice] = useState<number | null>(null)
  const { toast, update } = useToast()

  const yesTokenId = market.clobTokenIds?.[0]

  useEffect(() => {
    if (!yesTokenId || yesTokenId.startsWith('mock-')) return

    let active = true
    const fetchPrice = async () => {
      try {
        const res = await fetch(`https://clob.polymarket.com/midpoint?token_id=${yesTokenId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.mid && active) {
          setLiveYesPrice(parseFloat(data.mid))
        }
      } catch (e) {
        console.error("Error fetching live price:", e)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [yesTokenId])

  const probability = liveYesPrice !== null ? liveYesPrice * 100 : market.probability
  const price = side === 'YES' ? probability / 100 : (100 - probability) / 100
  const shares = amount / price
  const tokenId = side === 'YES' ? market.clobTokenIds[0] : market.clobTokenIds[1]

  const handleSubmit = async () => {
    if (!tokenId || amount <= 0) return
    setStatus('signing')
    const pid = toast({ type: 'pending', title: 'Sign in wallet', duration: 0 })
    try {
      const { buy, clearCache } = await import('@/lib/trade-executor')
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
      const wc = await getWalletClientFromPrivy(null)
      if (!wc) throw new Error('Wallet disconnected')
      setStatus('submitting')
      update(pid, { title: 'Placing order...' })
      let result = await buy(wc, tokenId, amount, market.negRisk)

      // Handle onboarding if needed
      if (!result.success && (result.error === 'NEEDS_ONBOARDING' || result.error === 'NEEDS_APPROVALS')) {
        update(pid, { title: 'Setting up trading account...' })
        const { enableTrading } = await import('@/lib/onboarding')
        const onboardResult = await enableTrading(wc, {
          onStatusChange: (_s, msg) => update(pid, { title: msg }),
        })
        if (!onboardResult.success) {
          update(pid, { type: 'error', title: 'Setup failed', message: onboardResult.error, duration: 5000 }); setErrorMsg(onboardResult.error || ''); setStatus('error'); return
        }
        clearCache()
        update(pid, { title: 'Placing order...' })
        result = await buy(wc, tokenId, amount, market.negRisk)
      }

      if (!result.success) { update(pid, { type: 'error', title: 'Failed', message: result.error, duration: 5000 }); setErrorMsg(result.error || ''); setStatus('error'); return }
      update(pid, { type: 'success', title: 'Done!', message: `Bought ${side} for $${amount}`, duration: 4000 })
      setStatus('success'); try { navigator.vibrate?.(20) } catch {}
      setTimeout(() => onComplete(amount, side, price), 1000)
    } catch (e: any) {
      update(pid, { type: 'error', title: 'Failed', message: e.message, duration: 5000 }); setErrorMsg(e.message); setStatus('error')
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, mass: 1, stiffness: 180 }} className="fixed bottom-0 left-0 right-0 z-[60] max-w-lg mx-auto">
        <div className="liquid-glass border-t border-white/[0.04] rounded-t-[32px] p-6 pb-12 shadow-2xl bg-surface-modal/90">
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
          <h3 className="text-[17px] font-bold font-display text-text-primary mb-2">{market.question}</h3>
          <p className="text-xs text-text-tertiary mb-6 font-semibold uppercase tracking-wider">{Math.round(probability)}% Yes Probability</p>

          {/* Side pills */}
          <div className="flex gap-3 mb-6">
            <button onClick={() => setSide('YES')} disabled={status !== 'input'}
              className={`flex-1 py-4 rounded-[20px] text-[15px] font-bold transition-all ${side === 'YES' ? 'bg-brand/10 border-2 border-brand/50 text-brand' : 'bg-surface-elevated border border-transparent text-text-secondary'}`}>
              Yes {Math.round(probability)}¢
            </button>
            <button onClick={() => setSide('NO')} disabled={status !== 'input'}
              className={`flex-1 py-4 rounded-[20px] text-[15px] font-bold transition-all ${side === 'NO' ? 'bg-white/10 border-2 border-white/30 text-white' : 'bg-surface-elevated border border-transparent text-text-secondary'}`}>
              No {Math.round(100 - probability)}¢
            </button>
          </div>

          {/* Amount */}
          <div className="flex gap-2 mb-4">
            {[10, 50, 100, 500].map(a => (
              <button key={a} onClick={() => setAmount(a)} disabled={status !== 'input'}
                className={`flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all ${amount === a ? 'bg-white/10 text-white' : 'bg-surface-elevated text-text-tertiary'}`}>${a}</button>
            ))}
          </div>
          <div className="relative mb-6">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-tertiary text-lg font-bold">$</span>
            <input type="number" value={amount} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setAmount(v) }}
              disabled={status !== 'input'} min={1}
              className="w-full bg-surface-elevated rounded-[20px] pl-10 pr-5 py-4 text-lg text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-shadow" />
          </div>

          {/* Summary */}
          <div className="bg-surface-elevated rounded-[20px] p-5 mb-6 space-y-3">
            <div className="flex justify-between text-[13px] font-medium"><span className="text-text-tertiary">You pay</span><span className="text-text-primary">${amount}</span></div>
            <div className="flex justify-between text-[13px] font-medium"><span className="text-text-tertiary">Shares</span><span className="text-text-primary">{shares.toFixed(1)}</span></div>
            <div className="flex justify-between text-[13px] font-bold"><span className="text-text-tertiary">Payout if correct</span><span className="text-positive">${shares.toFixed(2)}</span></div>
          </div>

          {status === 'error' && (
            <div className="mb-5 p-4 rounded-[20px] border border-negative/20 bg-negative/5">
              <p className="text-[13px] text-negative font-medium">{errorMsg}</p>
              <button onClick={() => setStatus('input')} className="text-[11px] text-text-tertiary mt-2 uppercase tracking-wider font-bold">Try again</button>
            </div>
          )}

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-positive font-bold text-lg">✓ Trade Complete</p>
              </div>
              <button onClick={() => onComplete(amount, side, price)} className="w-full py-4 bg-surface-elevated rounded-[24px] text-text-primary text-[15px] font-bold active:scale-[0.98] transition-transform">
                Done
              </button>
            </div>
          ) : (
            <button onClick={handleSubmit} disabled={status !== 'input' || amount <= 0}
              className="w-full py-5 rounded-[24px] bg-brand text-black text-[15px] font-bold uppercase tracking-wider disabled:opacity-40 shadow-[0_4px_24px_rgba(183,255,0,0.25)] active:scale-[0.98] transition-all">
              {status === 'signing' ? 'Confirm in Wallet' : status === 'submitting' ? 'Executing Trade...' : `Confirm Trade`}
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}
