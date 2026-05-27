'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, Clock, BarChart3, ExternalLink, Users } from 'lucide-react'
import { useWallet } from '@/hooks/use-wallet'

import { useRouter } from 'next/navigation'
import { formatNumber, timeRemaining } from '@/lib/utils'
import { useToast } from '@/components/toast'
import type { AppMarket } from '@/lib/polymarket'

export default function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('')
  const [market, setMarket] = useState<AppMarket | null>(null)
  const [orderbook, setOrderbook] = useState<{ bids: any[]; asks: any[] } | null>(null)
  const [subMarkets, setSubMarkets] = useState<AppMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState(10)
  const [buying, setBuying] = useState(false)
  const { isConnected, connect } = useWallet()
  
  const { toast, update } = useToast()
  const router = useRouter()

  useEffect(() => {
    params.then(p => setSlug(p.slug))
  }, [params])

  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      try {
        let matching: AppMarket[] = []

        // Try 1: Fetch as event slug
        let res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`)
        if (res.ok) {
          const events = await res.json()
          if (events && events.length > 0) {
            const event = events[0]
            for (const m of (event.markets || [])) {
              let outcomePrices = [0.5, 0.5]
              let clobTokenIds: string[] = []
              try { outcomePrices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}
              try { clobTokenIds = JSON.parse(m.clobTokenIds || '[]') } catch {}
              matching.push({
                id: m.id,
                question: m.question,
                slug: m.slug,
                eventSlug: event.slug,
                image: m.image || m.icon || event.image || '',
                description: m.description || '',
                category: 'OTHER',
                probability: outcomePrices[0] * 100,
                volume: m.volumeNum || parseFloat(m.volume) || 0,
                volume24hr: m.volume24hr || 0,
                liquidity: m.liquidityClob || 0,
                endDate: m.endDateIso || m.endDate || '',
                outcomes: ['Yes', 'No'],
                outcomePrices,
                clobTokenIds,
                acceptingOrders: m.acceptingOrders,
                negRisk: m.negRisk || false,
                sparklineData: [],
                trendDirection: 0,
              })
            }
          }
        }

        // Try 2: Fetch as market slug
        if (matching.length === 0) {
          res = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}`)
          if (res.ok) {
            const markets = await res.json()
            if (markets && markets.length > 0) {
              const m = markets[0]
              let outcomePrices = [0.5, 0.5]
              let clobTokenIds: string[] = []
              try { outcomePrices = JSON.parse(m.outcomePrices || '["0.5","0.5"]').map(Number) } catch {}
              try { clobTokenIds = JSON.parse(m.clobTokenIds || '[]') } catch {}
              matching.push({
                id: m.id,
                question: m.question,
                slug: m.slug,
                eventSlug: m.slug,
                image: m.image || m.icon || '',
                description: m.description || '',
                category: 'OTHER',
                probability: outcomePrices[0] * 100,
                volume: m.volumeNum || parseFloat(m.volume) || 0,
                volume24hr: m.volume24hr || 0,
                liquidity: m.liquidityClob || 0,
                endDate: m.endDateIso || m.endDate || '',
                outcomes: ['Yes', 'No'],
                outcomePrices,
                clobTokenIds,
                acceptingOrders: m.acceptingOrders,
                negRisk: m.negRisk || false,
                sparklineData: [],
                trendDirection: 0,
              })
            }
          }
        }

        if (matching.length > 0) {
          setMarket(matching[0])
          setSubMarkets(matching)

          // Fetch orderbook
          if (matching[0].clobTokenIds[0]) {
            try {
              const obRes = await fetch(`https://clob.polymarket.com/book?token_id=${matching[0].clobTokenIds[0]}`)
              if (obRes.ok) {
                const ob = await obRes.json()
                setOrderbook({ bids: ob.bids || [], asks: ob.asks || [] })
              }
            } catch {}
          }
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [slug])

  const handleBuy = async () => {
    if (!isConnected) { connect(); return }
    if (!market) return
    setBuying(true)
    const tokenId = side === 'YES' ? market.clobTokenIds[0] : market.clobTokenIds[1]
    if (!tokenId) { setBuying(false); return }

    const pid = toast({ type: 'pending', title: 'Sign in wallet', duration: 0 })
    try {
      const { buy } = await import('@/lib/trade-executor')
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
      
      const wc = await getWalletClientFromPrivy(null)
      if (!wc) throw new Error('Wallet disconnected')
      update(pid, { title: 'Placing order...' })
      const result = await buy(wc, tokenId, amount, market.negRisk)
      if (!result.success) { update(pid, { type: 'error', title: 'Failed', message: result.error, duration: 5000 }); setBuying(false); return }
      update(pid, { type: 'success', title: 'Done!', message: `Bought ${side} for $${amount}`, duration: 4000 })
      try { navigator.vibrate?.(20) } catch {}
    } catch (e: any) {
      update(pid, { type: 'error', title: 'Failed', message: e.message, duration: 5000 })
    }
    setBuying(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
      </div>
    )
  }

  if (!market) {
    return (
      <div className="flex-1 flex items-center justify-center px-8 text-center">
        <div>
          <p className="text-white/40 mb-4">Market not found</p>
          <button onClick={() => router.back()} className="text-sm text-white/60 underline">Go back</button>
        </div>
      </div>
    )
  }

  const prob = Math.round(market.probability)
  const trend = market.trendDirection
  const price = side === 'YES' ? market.probability / 100 : (100 - market.probability) / 100
  const shares = amount / price

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-full pb-24">
      {/* Header image */}
      <div className="relative h-48 overflow-hidden">
        {market.image && <img src={market.image} alt="" className="w-full h-full object-cover opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <button onClick={() => router.back()} className="absolute top-4 left-4 w-9 h-9 rounded-full glass flex items-center justify-center z-10">
          <ArrowLeft size={16} className="text-white" />
        </button>
        <a href={`https://polymarket.com/event/${market.eventSlug}`} target="_blank" rel="noopener noreferrer"
          className="absolute top-4 right-4 w-9 h-9 rounded-full glass flex items-center justify-center z-10">
          <ExternalLink size={14} className="text-white/60" />
        </a>
        <div className="absolute bottom-4 left-5 right-5">
          <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/5 text-[9px] font-bold uppercase tracking-widest text-white/80">{market.category}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-5 space-y-5">
        {/* Question */}
        <h1 className="text-xl font-bold font-[family-name:var(--font-display)] leading-tight tracking-tight text-white">{market.question}</h1>

        {/* Price + stats */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 mb-1">Yes Price</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold font-[family-name:var(--font-display)] tabular-nums tracking-tighter bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">{prob}</span>
              <span className="text-lg text-white/30 font-[family-name:var(--font-display)]">¢</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-[10px] text-white/30">
            {trend !== 0 && (
              <span className={`flex items-center gap-0.5 font-bold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            )}
            <span className="flex items-center gap-1"><BarChart3 size={10} />${formatNumber(market.volume)} vol</span>
            <span className="flex items-center gap-1"><Clock size={10} />{timeRemaining(market.endDate)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${prob}%` }} />
        </div>

        {/* Sub-markets (if multi-outcome) */}
        {subMarkets.length > 1 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">All outcomes</p>
            <div className="space-y-1.5">
              {subMarkets.map((sm) => (
                <div key={sm.id} className="flex items-center justify-between glass-dark premium-border rounded-xl px-3.5 py-2.5">
                  <p className="text-[11px] font-medium text-white/80 flex-1 line-clamp-1 pr-3">{sm.question}</p>
                  <span className="text-[13px] font-bold font-[family-name:var(--font-display)] text-white">{Math.round(sm.probability)}¢</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orderbook */}
        {orderbook && (orderbook.bids.length > 0 || orderbook.asks.length > 0) && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Orderbook</p>
            <div className="grid grid-cols-2 gap-2">
              {/* Bids */}
              <div className="glass-dark premium-border rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/70 mb-2">Bids</p>
                <div className="space-y-1">
                  {orderbook.bids.slice(0, 5).map((b: any, i: number) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="text-emerald-400/80 font-bold">{(parseFloat(b.price) * 100).toFixed(0)}¢</span>
                      <span className="text-white/30">{parseFloat(b.size).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Asks */}
              <div className="glass-dark premium-border rounded-xl p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-rose-400/70 mb-2">Asks</p>
                <div className="space-y-1">
                  {orderbook.asks.slice(0, 5).map((a: any, i: number) => (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="text-rose-400/80 font-bold">{(parseFloat(a.price) * 100).toFixed(0)}¢</span>
                      <span className="text-white/30">{parseFloat(a.size).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trade panel */}
        <div className="glass-dark premium-border rounded-3xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Trade</p>

          {/* Side pills */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setSide('YES')}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                side === 'YES' ? 'bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400' : 'glass border border-white/5 text-white/30'
              }`}>Yes {prob}¢</button>
            <button onClick={() => setSide('NO')}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all ${
                side === 'NO' ? 'bg-rose-500/15 border-2 border-rose-500/40 text-rose-400' : 'glass border border-white/5 text-white/30'
              }`}>No {100 - prob}¢</button>
          </div>

          {/* Amount pills */}
          <div className="flex gap-1.5 mb-3">
            {[5, 10, 25, 50, 100].map(a => (
              <button key={a} onClick={() => setAmount(a)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${
                  amount === a ? 'bg-white/10 border border-white/20 text-white' : 'glass border-white/5 text-white/30'
                }`}>${a}</button>
            ))}
          </div>

          {/* Custom */}
          <div className="relative mb-4">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">$</span>
            <input type="number" value={amount} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setAmount(v) }}
              min={1} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-8 pr-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>

          {/* Summary */}
          <div className="flex justify-between text-[11px] mb-4 px-1">
            <span className="text-white/30">Shares: <span className="text-white font-bold">{shares.toFixed(1)}</span></span>
            <span className="text-white/30">Payout: <span className="text-emerald-400 font-bold">${shares.toFixed(2)}</span></span>
          </div>

          {/* Buy button */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleBuy} disabled={buying || amount <= 0}
            className="w-full py-4 bg-white text-black rounded-2xl text-sm font-bold font-[family-name:var(--font-display)] uppercase tracking-widest disabled:opacity-40 shadow-[0_10px_25px_rgba(255,255,255,0.1)]">
            {buying ? 'Placing...' : isConnected ? `Buy ${side} — $${amount}` : 'Connect to trade'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
