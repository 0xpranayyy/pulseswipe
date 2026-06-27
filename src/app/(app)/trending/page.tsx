'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, RefreshCw, Clock } from 'lucide-react'
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
    <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 overflow-x-hidden">
      <header className="px-5 pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="text-2xl font-bold font-display text-text-primary tracking-tight mb-1">What&apos;s Moving</motion.h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-4">Live market activity</p>

        <div className="flex gap-2">
          {([
            { id: 'movers' as Tab, label: '📈 Movers' },
            { id: 'volume' as Tab, label: '🔥 Volume' },
            { id: 'ending' as Tab, label: '⏰ Ending' },
          ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                tab === t.id ? 'bg-brand text-black shadow-lg' : 'bg-surface text-text-secondary border border-white/[0.04]'
              }`}>{t.label}</button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-5 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw className="w-5 h-5 text-brand/50" />
            </motion.div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16"><p className="text-text-tertiary text-sm">No data available right now</p></div>
        ) : (
          <div className="space-y-3">
            {sorted.map((market, i) => {
              const prob = Math.round(market.probability)
              const trend = market.trendDirection
              const url = `https://polymarket.com/event/${market.eventSlug}`
              return (
                <motion.a key={market.id} href={url} target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.5, type: 'spring', damping: 25, stiffness: 200 }}
                  className="flex items-center gap-4 bg-surface-elevated rounded-[24px] p-4 hover:border-white/[0.04] border border-transparent shadow-sm active:scale-[0.98] transition-all group">
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
                    <p className="text-[14px] font-semibold text-text-primary line-clamp-2 leading-snug">{market.question}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {tab === 'movers' && trend !== 0 && (
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 ${trend > 0 ? 'text-positive' : 'text-negative'}`}>
                          {trend > 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                          {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                        </span>
                      )}
                      {tab === 'volume' && <span className="text-[11px] font-bold text-text-tertiary px-1.5 py-0.5 rounded-md bg-white/5">${formatNumber(market.volume24hr || market.volume)} vol</span>}
                      {tab === 'ending' && <span className="text-[11px] font-bold text-brand px-1.5 py-0.5 rounded-md bg-brand/10 flex items-center gap-1"><Clock size={11} />{timeRemaining(market.endDate)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Yes</span>
                    <span className="text-[16px] font-extrabold text-text-primary leading-none">{prob}¢</span>
                  </div>
                </motion.a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
