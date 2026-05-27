'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, X, Clock, ArrowUpRight } from 'lucide-react'
import { timeRemaining } from '@/lib/utils'
import { useToast } from '@/components/toast'

const SUGGESTIONS = ['Bitcoin', 'Trump', 'World Cup', 'AI', 'Election', 'Ethereum', 'SpaceX', 'UFC', 'NBA', 'Fed']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [buyMarket, setBuyMarket] = useState<any>(null)
  const [amount, setAmount] = useState(10)
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [tradeStatus, setTradeStatus] = useState<'idle' | 'signing' | 'placing' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { toast, update } = useToast()

  // Search function — calls API with query
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

  // Auto-search as user types (debounced)
  useEffect(() => {
    if (!query.trim()) { setResults([]); setHasSearched(false); return }
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const handleBuy = async () => {
    if (!buyMarket) return
    const tokenId = side === 'YES' ? buyMarket.clobTokenIds?.[0] : buyMarket.clobTokenIds?.[1]
    if (!tokenId || amount <= 0) return
    setTradeStatus('signing')
    const pid = toast({ type: 'pending', title: 'Sign in wallet', duration: 0 })
    try {
      const { buy } = await import('@/lib/trade-executor')
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
      const wc = await getWalletClientFromPrivy(null)
      if (!wc) throw new Error('Wallet disconnected')
      setTradeStatus('placing')
      update(pid, { title: 'Placing order...' })
      const result = await buy(wc, tokenId, amount, buyMarket.negRisk || false)
      if (!result.success) { update(pid, { type: 'error', title: 'Failed', message: result.error, duration: 5000 }); setErrorMsg(result.error || ''); setTradeStatus('error'); return }
      update(pid, { type: 'success', title: 'Done!', message: `Bought ${side} for $${amount}`, duration: 4000 })
      setTradeStatus('done')
      setTimeout(() => setBuyMarket(null), 1200)
    } catch (e: any) {
      update(pid, { type: 'error', title: 'Failed', message: e.message, duration: 5000 }); setErrorMsg(e.message); setTradeStatus('error')
    }
  }

  return (
    <div className="flex flex-col min-h-full pt-4 pb-24">
      {/* Search bar */}
      <div className="px-5 mb-3">
        <div className="relative">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search any market..."
            autoFocus className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-11 pr-10 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand/30 transition-all" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X size={16} className="text-white/30" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions — show when no query */}
      {!query && (
        <div className="px-5 mb-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">Popular</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setQuery(s)}
                className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] font-bold text-white/40 uppercase tracking-wider active:scale-95 transition-transform">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 px-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-12">
            <p className="text-white/20 text-sm">Type to search markets</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm">No markets found for &quot;{query}&quot;</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-2">{results.length} results</p>
            {results.slice(0, 30).map((market: any, i: number) => {
              const prob = Math.round(market.probability || 50)
              return (
                <motion.button key={market.id || i} onClick={() => { setBuyMarket(market); setTradeStatus('idle'); setErrorMsg('') }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="w-full flex items-center gap-3 glass-card rounded-2xl p-3.5 active:scale-[0.98] transition-transform text-left">
                  {market.image ? (
                    <img src={market.image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 opacity-80" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0"><span className="text-sm">📊</span></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white/85 line-clamp-1">{market.question}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
                      <span className="font-bold uppercase tracking-wider text-brand/70">{market.category}</span>
                      {market.endDate && <span className="flex items-center gap-0.5"><Clock size={9} />{timeRemaining(market.endDate)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[14px] font-extrabold font-[family-name:var(--font-display)] text-white">{prob}¢</span>
                    <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                      <ArrowUpRight size={14} className="text-brand" />
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Buy Modal */}
      <AnimatePresence>
        {buyMarket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setBuyMarket(null)} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto">
              <div className="bg-card border-t border-white/[0.06] rounded-t-[28px] p-5 pb-10">
                <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
                <h3 className="text-[15px] font-bold font-[family-name:var(--font-display)] text-white mb-1">{buyMarket.question}</h3>
                <p className="text-[11px] text-white/30 mb-5">{Math.round(buyMarket.probability || 50)}% Yes</p>

                <div className="flex gap-2 mb-5">
                  <button onClick={() => setSide('YES')}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${side === 'YES' ? 'bg-brand/15 border-2 border-brand/40 text-brand' : 'border border-white/[0.08] text-white/30'}`}>
                    Yes {Math.round(buyMarket.probability || 50)}¢
                  </button>
                  <button onClick={() => setSide('NO')}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${side === 'NO' ? 'bg-white/10 border-2 border-white/20 text-white' : 'border border-white/[0.08] text-white/30'}`}>
                    No {Math.round(100 - (buyMarket.probability || 50))}¢
                  </button>
                </div>

                <div className="flex gap-1.5 mb-3">
                  {[5, 10, 25, 50, 100].map(a => (
                    <button key={a} onClick={() => setAmount(a)}
                      className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${amount === a ? 'bg-brand/10 border border-brand/30 text-brand' : 'border border-white/[0.06] text-white/30'}`}>${a}</button>
                  ))}
                </div>
                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold">$</span>
                  <input type="number" value={amount} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setAmount(v) }}
                    min={1} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-8 pr-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-brand/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>

                {tradeStatus === 'error' && (
                  <div className="mb-4 p-3 rounded-2xl border border-brand/20 bg-brand/5">
                    <p className="text-[11px] text-brand">{errorMsg}</p>
                    <button onClick={() => setTradeStatus('idle')} className="text-[10px] text-white/40 mt-1 underline">Try again</button>
                  </div>
                )}

                <button onClick={handleBuy} disabled={tradeStatus !== 'idle' || amount <= 0}
                  className="w-full py-4 rounded-2xl bg-brand text-white text-sm font-bold uppercase tracking-wider disabled:opacity-40 glow-red active:scale-[0.98] transition-transform">
                  {tradeStatus === 'signing' ? 'Sign...' : tradeStatus === 'placing' ? 'Placing...' : tradeStatus === 'done' ? '✓ Done' : `Buy ${side} — $${amount}`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
