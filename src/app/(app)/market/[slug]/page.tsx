'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
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
  const { address, isConnected, connect } = useWallet()
  
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
        const matching: AppMarket[] = []

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

  // Poll orderbook and midpoint in the background for real-time updates
  useEffect(() => {
    const tokenId = market?.clobTokenIds?.[0]
    if (!tokenId || tokenId.startsWith('mock-')) return

    let active = true
    const pollPriceAndBook = async () => {
      try {
        const [obRes, midRes] = await Promise.all([
          fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`),
          fetch(`https://clob.polymarket.com/midpoint?token_id=${tokenId}`)
        ])

        if (!active) return

        if (obRes.ok) {
          const ob = await obRes.json()
          setOrderbook({ bids: ob.bids || [], asks: ob.asks || [] })
        }

        if (midRes.ok) {
          const midData = await midRes.json()
          if (midData.mid) {
            const liveProb = parseFloat(midData.mid) * 100
            setMarket(prev => prev ? { ...prev, probability: liveProb } : null)
          }
        }
      } catch (e) {
        console.error("Error polling orderbook and midpoint:", e)
      }
    }

    const interval = setInterval(pollPriceAndBook, 4000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [market?.clobTokenIds])

  const prob = market ? Math.round(market.probability) : 50
  const trend = market ? market.trendDirection : 0
  const price = market ? (side === 'YES' ? market.probability / 100 : (100 - market.probability) / 100) : 0.5
  const shares = amount / price

  const handleBuy = async () => {
    if (!isConnected) { connect(); return }
    if (!market) return
    setBuying(true)
    const tokenId = side === 'YES' ? market.clobTokenIds[0] : market.clobTokenIds[1]
    if (!tokenId) { setBuying(false); return }

    const pid = toast({ type: 'pending', title: 'Sign in wallet', duration: 0 })
    try {
      const { buy, clearCache } = await import('@/lib/trade-executor')
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
      
      const wc = await getWalletClientFromPrivy(null)
      if (!wc) throw new Error('Wallet disconnected')
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
          update(pid, { type: 'error', title: 'Setup failed', message: onboardResult.error, duration: 5000 }); setBuying(false); return
        }
        clearCache()
        update(pid, { title: 'Placing order...' })
        result = await buy(wc, tokenId, amount, market.negRisk)
      }

      if (!result.success) { update(pid, { type: 'error', title: 'Failed', message: result.error, duration: 5000 }); setBuying(false); return }
      update(pid, { type: 'success', title: 'Done!', message: `Bought ${side} for $${amount}`, duration: 4000 })
      if (address) {
        import('@/lib/supabase').then(({ logActivity }) => {
          logActivity(address, {
            type: 'buy',
            market_id: market.id,
            question: market.question,
            amount: amount,
            side: side,
            price: price
          })
        }).catch(() => {})
      }
      try { navigator.vibrate?.(20) } catch {}
    } catch (e: any) {
      update(pid, { type: 'error', title: 'Failed', message: e.message, duration: 5000 })
    }
    setBuying(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-dvh bg-bg-primary">
        <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (!market) {
    return (
      <div className="flex-1 flex items-center justify-center px-8 text-center min-h-dvh bg-bg-primary">
        <div>
          <p className="text-text-tertiary mb-4 font-semibold">Market not found</p>
          <button onClick={() => router.back()} className="text-sm text-brand underline font-medium">Go back</button>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="px-5 pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full border border-white/[0.04] bg-surface-elevated flex items-center justify-center active:scale-95 transition-all hover:bg-white/5">
          <ArrowLeft size={16} className="text-text-primary" />
        </button>
        <div className="flex-1 text-center mx-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Market Intelligence</p>
        </div>
        <a href={`https://polymarket.com/event/${market.eventSlug}`} target="_blank" rel="noopener noreferrer"
          className="w-10 h-10 rounded-full border border-white/[0.04] bg-surface-elevated flex items-center justify-center active:scale-95 transition-all hover:bg-white/5">
          <ExternalLink size={14} className="text-text-secondary" />
        </a>
      </header>

      {/* Category + Title */}
      <div className="px-5">
        <span className="inline-block px-2.5 py-1 rounded-full bg-brand/10 border border-brand/20 text-[9px] font-bold uppercase tracking-widest text-brand mb-3">
          {market.category}
        </span>
        <h1 className="text-xl font-bold font-display leading-tight tracking-tight text-text-primary mb-4">
          {market.question}
        </h1>
      </div>

      {/* Header nested image */}
      {market.image && (
        <div className="px-5 mb-5">
          <div className="relative h-44 w-full rounded-[32px] overflow-hidden border border-white/[0.04] shadow-sm">
            <img src={market.image} alt="" className="w-full h-full object-cover opacity-65" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />
          </div>
        </div>
      )}

      {/* Price + Stats Grid */}
      <div className="px-5 grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-elevated rounded-[24px] p-5 border border-transparent hover:border-white/[0.02] transition-all shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary mb-2">YES Price</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold font-display tabular-nums tracking-tighter text-text-primary">{prob}</span>
            <span className="text-sm font-semibold text-text-tertiary font-display">¢</span>
          </div>
        </div>
        <div className="bg-surface-elevated rounded-[24px] p-5 border border-transparent hover:border-white/[0.02] transition-all shadow-sm flex flex-col justify-between">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary mb-2">Market Stats</p>
          <div className="space-y-1 font-semibold text-[10px] text-text-secondary uppercase">
            {trend !== 0 && (
              <div className={`flex items-center gap-1 font-bold ${trend > 0 ? 'text-positive' : 'text-negative'}`}>
                {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}% 24h
              </div>
            )}
            <div className="flex items-center gap-1 font-mono">${formatNumber(market.volume)} Vol</div>
            <div className="flex items-center gap-1">{timeRemaining(market.endDate)}</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 mb-6">
        <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden border border-white/[0.02]">
          <div className="h-full bg-brand rounded-full shadow-[0_0_12px_rgba(183,255,0,0.4)] transition-all duration-500" style={{ width: `${prob}%` }} />
        </div>
      </div>

      {/* Sub-markets */}
      {subMarkets.length > 1 && (
        <div className="px-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3">All outcomes</p>
          <div className="bg-surface-elevated rounded-[32px] p-5 border border-transparent hover:border-white/[0.04] transition-all space-y-3 shadow-sm">
            {subMarkets.map((sm) => (
              <div key={sm.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 last:pb-0 first:pt-0">
                <p className="text-[12px] font-bold text-text-primary flex-1 line-clamp-1 pr-4">{sm.question}</p>
                <span className="text-[13px] font-bold font-display text-brand font-mono">{Math.round(sm.probability)}¢</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orderbook */}
      {orderbook && (orderbook.bids.length > 0 || orderbook.asks.length > 0) && (
        <div className="px-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3">Orderbook</p>
          <div className="grid grid-cols-2 gap-4">
            {/* Bids */}
            <div className="bg-surface-elevated rounded-[24px] p-4 border border-transparent shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-widest text-positive mb-3">Bids (Buy)</p>
              <div className="space-y-1.5">
                {orderbook.bids.slice(0, 5).map((b: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] font-mono">
                    <span className="text-positive font-bold">{(parseFloat(b.price) * 100).toFixed(0)}¢</span>
                    <span className="text-text-tertiary">{parseFloat(b.size).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Asks */}
            <div className="bg-surface-elevated rounded-[24px] p-4 border border-transparent shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-widest text-negative mb-3">Asks (Sell)</p>
              <div className="space-y-1.5">
                {orderbook.asks.slice(0, 5).map((a: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] font-mono">
                    <span className="text-negative font-bold">{(parseFloat(a.price) * 100).toFixed(0)}¢</span>
                    <span className="text-text-tertiary">{parseFloat(a.size).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade panel */}
      <div className="px-5 mb-6">
        <div className="bg-surface-elevated rounded-[32px] p-6 border border-transparent shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-4">Execute Trade</p>

          {/* Side pills */}
          <div className="flex gap-3 mb-5">
            <button onClick={() => setSide('YES')}
              className={`flex-1 py-4 rounded-[20px] text-[15px] font-bold transition-all ${
                side === 'YES' ? 'bg-brand/10 border-2 border-brand/50 text-brand' : 'bg-surface border border-white/[0.04] text-text-secondary'
              }`}>Yes {prob}¢</button>
            <button onClick={() => setSide('NO')}
              className={`flex-1 py-4 rounded-[20px] text-[15px] font-bold transition-all ${
                side === 'NO' ? 'bg-white/10 border-2 border-white/30 text-white' : 'bg-surface border border-white/[0.04] text-text-secondary'
              }`}>No {100 - prob}¢</button>
          </div>

          {/* Amount pills */}
          <div className="flex gap-2 mb-4">
            {[10, 50, 100, 500].map(a => (
              <button key={a} onClick={() => setAmount(a)}
                className={`flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all ${
                  amount === a ? 'bg-white/10 text-white' : 'bg-surface text-text-tertiary'
                }`}>${a}</button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="relative mb-5">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-tertiary text-lg font-bold">$</span>
            <input type="number" value={amount} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setAmount(v) }}
              min={1} className="w-full bg-surface rounded-[20px] pl-10 pr-5 py-4 text-lg text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-shadow" />
          </div>

          {/* Summary */}
          <div className="bg-surface rounded-[20px] p-5 mb-6 space-y-3">
            <div className="flex justify-between text-[13px] font-medium">
              <span className="text-text-tertiary">Shares</span>
              <span className="text-text-primary font-mono">{shares.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-bold">
              <span className="text-text-tertiary">Payout if correct</span>
              <span className="text-positive font-mono">${shares.toFixed(2)}</span>
            </div>
          </div>

          {/* Buy Button */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleBuy} disabled={buying || amount <= 0}
            className="w-full py-5 bg-brand text-black rounded-[24px] text-[15px] font-bold uppercase tracking-wider disabled:opacity-40 shadow-[0_4px_24px_rgba(183,255,0,0.25)] active:scale-[0.98] transition-all">
            {buying ? 'Executing...' : isConnected ? `Confirm Trade — $${amount}` : 'Connect Wallet'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
