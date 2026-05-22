'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, X, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { formatNumber, timeRemaining } from '@/lib/utils'
import Link from 'next/link'
import type { AppMarket } from '@/lib/polymarket'

const SUGGESTIONS = ['Bitcoin', 'Trump', 'World Cup', 'AI', 'Election', 'Fed', 'Ethereum', 'SpaceX', 'UFC']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [allMarkets, setAllMarkets] = useState<AppMarket[]>([])
  const [results, setResults] = useState<AppMarket[]>([])
  const [loading, setLoading] = useState(true)

  // Preload markets via our server-side API (avoids CORS)
  useEffect(() => {
    fetch('/api/search').then(r => r.json()).then(d => {
      setAllMarkets(d.markets || [])
      setResults(d.markets || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Filter on query change
  useEffect(() => {
    if (!query.trim()) { setResults(allMarkets); return }
    const q = query.toLowerCase()
    setResults(allMarkets.filter((m: any) => m.question.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q)))
  }, [query, allMarkets])

  return (
    <motion.div initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col min-h-full pt-4">

      {/* Search bar */}
      <div className="px-5 mb-4">
        <div className="relative">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search markets..."
            autoFocus className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-11 pr-10 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/15 transition-all" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X size={16} className="text-white/30" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {!query && (
        <div className="px-5 mb-4 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => setQuery(s)}
              className="px-3 py-1.5 rounded-full glass border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white/60 transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 px-5 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/30 text-sm">No markets found</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-3">{results.length} markets</p>
            {results.map((market, i) => (
              <motion.div key={market.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Link href={`/market/${market.eventSlug}`}
                  className="flex items-center gap-3 glass-dark premium-border rounded-2xl p-3.5 hover:scale-[1.01] transition-transform active:scale-[0.98]">
                  {market.image ? (
                    <img src={market.image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 opacity-80" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0"><span className="text-sm">📊</span></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white/85 line-clamp-1">{market.question}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
                      <span className="font-bold uppercase tracking-wider">{market.category}</span>
                      <span className="flex items-center gap-0.5"><Clock size={9} />{timeRemaining(market.endDate)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[14px] font-bold font-[family-name:var(--font-display)] text-white">{Math.round(market.probability)}¢</span>
                    {market.trendDirection !== 0 && (
                      <span className={`text-[9px] font-bold flex items-center gap-0.5 ${market.trendDirection > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {market.trendDirection > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {market.trendDirection > 0 ? '+' : ''}{market.trendDirection.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
