'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink, Clock, Flame } from 'lucide-react'
import { formatNumber, timeRemaining } from '@/lib/utils'
import type { AppMarket } from '@/lib/polymarket'

type Tab = 'movers' | 'volume' | 'ending'

export default function FeedPage() {
  const [markets, setMarkets] = useState<AppMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('movers')

  useEffect(() => {
    fetch('/api/markets?limit=60&enrich=true').then(r => r.json()).then(d => setMarkets(d.markets || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const sorted = (() => {
    switch (tab) {
      case 'movers': return [...markets].filter(m => m.trendDirection !== 0).sort((a, b) => Math.abs(b.trendDirection) - Math.abs(a.trendDirection))
      case 'volume': return [...markets].sort((a, b) => (b.volume24hr || b.volume) - (a.volume24hr || a.volume))
      case 'ending': return [...markets].filter(m => m.endDate).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    }
  })().slice(0, 20)

  return (
    <motion.div initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col min-h-full pt-4">
      <header className="px-5 pb-4">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight mb-1">What&apos;s Moving</motion.h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Live market activity</p>

        <div className="flex gap-1.5">
          {([
            { id: 'movers' as Tab, label: '📈 Movers' },
            { id: 'volume' as Tab, label: '🔥 Volume' },
            { id: 'ending' as Tab, label: '⏰ Ending' },
          ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                tab === t.id ? 'bg-white text-black shadow-lg' : 'glass border-white/5 text-white/40'
              }`}>{t.label}</button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-5 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw className="w-4 h-4 text-white/20" />
            </motion.div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16"><p className="text-white/30 text-sm">No data</p></div>
        ) : (
          <div className="space-y-2">
            {sorted.map((market, i) => {
              const prob = Math.round(market.probability)
              const trend = market.trendDirection
              const url = `https://polymarket.com/event/${market.eventSlug}`
              return (
                <motion.a key={market.id} href={url} target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 15, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3 glass-dark premium-border rounded-2xl p-3.5 hover:scale-[1.01] transition-transform active:scale-[0.98]">
                  {market.image ? (
                    <img src={market.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 opacity-80" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0"><span className="text-sm">📊</span></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white/85 line-clamp-1">{market.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {tab === 'movers' && trend !== 0 && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trend > 0 ? <TrendingUp size={11} strokeWidth={3} /> : <TrendingDown size={11} strokeWidth={3} />}
                          {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                        </span>
                      )}
                      {tab === 'volume' && <span className="text-[10px] font-bold text-white/30">${formatNumber(market.volume24hr || market.volume)}</span>}
                      {tab === 'ending' && <span className="text-[10px] font-bold text-amber-400/70 flex items-center gap-0.5"><Clock size={10} />{timeRemaining(market.endDate)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[13px] font-bold font-[family-name:var(--font-display)] text-white">{prob}¢</span>
                    <ExternalLink size={10} className="text-white/15" />
                  </div>
                </motion.a>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
