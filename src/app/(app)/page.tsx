'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { RefreshCw, TrendingUp, TrendingDown, Clock, BarChart3, ArrowUpRight, X as XIcon } from 'lucide-react'
import { formatNumber, timeRemaining } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { useWallet } from '@/hooks/use-wallet'
import { recordAction, rankMarkets } from '@/lib/recommendation'
import { useToast } from '@/components/toast'
import type { AppMarket } from '@/lib/polymarket'

const TABS = [
  { id: 'ALL', label: 'Live' },
  { id: 'CRYPTO', label: 'Crypto' },
  { id: 'POLITICS', label: 'Politics' },
  { id: 'SPORTS', label: 'Sports' },
  { id: 'AI', label: 'AI' },
  { id: 'OTHER', label: 'Other' },
]

export default function SwipePage() {
  const { address, isConnected, connect } = useWallet()
  const { toast, update } = useToast()
  const [markets, setMarkets] = useState<AppMarket[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [buyModal, setBuyModal] = useState<AppMarket | null>(null)

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/markets?limit=50&enrich=true')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMarkets(rankMarkets(data.markets || []) as AppMarket[])
      setCurrentIndex(0)
    } catch { toast({ type: 'error', title: 'Failed to load markets', duration: 3000 }) }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchMarkets() }, [fetchMarkets])

  const vibrate = () => { try { navigator.vibrate?.(8) } catch {} }

  const handleBuy = (market: AppMarket) => {
    vibrate()
    if (!isConnected) { connect(); return }
    setBuyModal(market)
  }

  const handleSkip = (market: AppMarket) => {
    vibrate()
    recordAction('skip', market)
    setCurrentIndex(i => i + 1)
  }

  const handleBuyComplete = () => {
    if (buyModal && address) {
      recordAction('buy', buyModal)
      import('@/lib/supabase').then(({ logActivity }) => {
        logActivity(address, { type: 'buy', market_id: buyModal.id, question: buyModal.question })
      }).catch(() => {})
      setCurrentIndex(i => i + 1)
    }
    setBuyModal(null)
  }

  const handleBookmark = async (market: AppMarket) => {
    if (!address) { connect(); return }
    try {
      const { addToWatchlist } = await import('@/lib/supabase')
      await addToWatchlist(address, { market_id: market.id, question: market.question, slug: market.eventSlug, image: market.image, probability: market.probability, category: market.category })
      toast({ type: 'success', title: 'Saved to watchlist', duration: 2000 })
    } catch {}
  }

  // Filter by active tab
  const filteredMarkets = activeTab === 'ALL' ? markets : markets.filter(m => m.category === activeTab)
  const currentMarket = filteredMarkets[currentIndex]
  const nextMarket = filteredMarkets[currentIndex + 1]

  // LOADING
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
          <RefreshCw className="w-5 h-5 text-brand/50" />
        </motion.div>
        <p className="text-[11px] text-white/20 font-medium">Loading markets...</p>
      </div>
    )
  }

  // EMPTY
  if (!currentMarket) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-4xl mb-4">🎯</p>
          <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-white mb-2">All caught up</h2>
          <p className="text-white/30 text-sm mb-6">New markets appear constantly.</p>
          <button onClick={fetchMarkets} className="pill pill-brand px-6 py-3 text-sm">Refresh</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-[15px] font-bold font-[family-name:var(--font-display)] text-white">Pulse</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/25 font-semibold tabular-nums">{currentIndex + 1}/{markets.length}</span>
          {isConnected ? (
            <div className="h-7 px-2.5 rounded-lg bg-brand/10 border border-brand/20 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-red" />
              <span className="text-[9px] font-bold text-brand uppercase">Connected</span>
            </div>
          ) : (
            <button onClick={connect} className="h-7 px-3 rounded-lg bg-brand text-white text-[9px] font-bold uppercase tracking-wider">
              Connect
            </button>
          )}
        </div>
      </header>

      {/* Category tabs */}
      <div className="flex gap-1.5 px-5 py-2 overflow-x-auto scrollbar-hide z-10">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setCurrentIndex(0) }}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
              activeTab === tab.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-white/[0.04] text-white/30 border border-white/[0.06]'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-5 pt-2 pb-4">
        <div className="relative w-full max-w-sm" style={{ height: 'min(72vh, 560px)' }}>
          {nextMarket && (
            <div className="absolute inset-0 scale-[0.93] opacity-20 pointer-events-none">
              <div className="w-full h-full rounded-[32px] glass-card" />
            </div>
          )}
          <AnimatePresence mode="popLayout">
            <SwipeCard key={currentMarket.id} market={currentMarket} onBuy={() => handleBuy(currentMarket)} onSkip={() => handleSkip(currentMarket)} onBookmark={() => handleBookmark(currentMarket)} />
          </AnimatePresence>
        </div>
      </div>

      {/* Buy Modal */}
      <AnimatePresence>
        {buyModal && <BuyModal market={buyModal} onComplete={handleBuyComplete} onCancel={() => setBuyModal(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// SWIPE CARD
// ============================================================
function SwipeCard({ market, onBuy, onSkip, onBookmark }: { market: AppMarket; onBuy: () => void; onSkip: () => void; onBookmark: () => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-8, 8])
  const buyOp = useTransform(x, [30, 100], [0, 1])
  const skipOp = useTransform(x, [-100, -30], [1, 0])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 80 || info.velocity.x > 400) onBuy()
    else if (info.offset.x < -80 || info.velocity.x < -400) onSkip()
  }

  const prob = Math.round(market.probability)
  const trend = market.trendDirection

  return (
    <motion.div style={{ x, rotate }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.7} onDragEnd={onDragEnd}
      initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ x: 400, opacity: 0, rotate: 15, transition: { duration: 0.35 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing z-10">

      {/* Swipe stamps */}
      <motion.div style={{ opacity: buyOp }} className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 rounded-[32px] border-2 border-brand/50 bg-brand/5" />
        <div className="px-8 py-3 rounded-full bg-brand -rotate-12 shadow-lg glow-red">
          <span className="text-xl font-black font-[family-name:var(--font-display)] text-white uppercase tracking-wider">BUY</span>
        </div>
      </motion.div>
      <motion.div style={{ opacity: skipOp }} className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 rounded-[32px] border-2 border-white/20" />
        <div className="px-8 py-3 rounded-full border-2 border-white/30 rotate-12">
          <span className="text-xl font-black font-[family-name:var(--font-display)] text-white/50 uppercase tracking-wider">SKIP</span>
        </div>
      </motion.div>

      {/* Card */}
      <div className="w-full h-full rounded-[32px] overflow-hidden glass-card flex flex-col">
        {/* Image */}
        <div className="relative flex-[1.2] min-h-0 overflow-hidden">
          {market.image && <img src={market.image} alt="" className="w-full h-full object-cover opacity-70" />}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
          {/* LIVE badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/90 shadow-lg glow-red">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Live</span>
          </div>
          {/* Category */}
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">{market.category}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          {/* Question */}
          <h2 className="text-[17px] font-bold font-[family-name:var(--font-display)] leading-snug text-white mb-3">{market.question}</h2>

          {/* Price row */}
          <div className="flex items-end justify-between mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-bold text-brand uppercase tracking-wider">Yes</span>
              <span className="text-3xl font-extrabold font-[family-name:var(--font-display)] text-white tabular-nums">{prob}¢</span>
            </div>
            {trend !== 0 && (
              <span className={`flex items-center gap-0.5 text-[11px] font-bold ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] mb-3 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${prob}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="h-full rounded-full bg-brand shadow-[0_0_12px_rgba(247,32,53,0.5)]" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-[10px] text-white/30 font-medium mb-4">
            <span className="flex items-center gap-1"><BarChart3 size={11} />${formatNumber(market.volume)}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{timeRemaining(market.endDate)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button onClick={(e) => { e.stopPropagation(); onSkip() }}
              className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/30 active:scale-90 transition-transform">
              <XIcon size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onBookmark() }}
              className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/30 active:scale-90 transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onBuy() }}
              className="flex-1 h-12 rounded-full bg-brand flex items-center justify-center gap-2 shadow-lg glow-red active:scale-95 transition-transform">
              <ArrowUpRight size={18} className="text-white" strokeWidth={2.5} />
              <span className="text-sm font-bold font-[family-name:var(--font-display)] text-white uppercase tracking-wider">Buy</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// BUY MODAL
// ============================================================
function BuyModal({ market, onComplete, onCancel }: { market: AppMarket; onComplete: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState(10)
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [status, setStatus] = useState<'input' | 'signing' | 'submitting' | 'success' | 'error'>('input')
  const [errorMsg, setErrorMsg] = useState('')
  const { toast, update } = useToast()

  const price = side === 'YES' ? market.probability / 100 : (100 - market.probability) / 100
  const shares = amount / price
  const tokenId = side === 'YES' ? market.clobTokenIds[0] : market.clobTokenIds[1]

  const handleSubmit = async () => {
    if (!tokenId || amount <= 0) return
    setStatus('signing')
    const pid = toast({ type: 'pending', title: 'Sign in wallet', duration: 0 })
    try {
      const { buy } = await import('@/lib/trade-executor')
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
      const wc = await getWalletClientFromPrivy(null)
      if (!wc) throw new Error('Wallet disconnected')
      setStatus('submitting')
      update(pid, { title: 'Placing order...' })
      const result = await buy(wc, tokenId, amount, market.negRisk)
      if (!result.success) { update(pid, { type: 'error', title: 'Failed', message: result.error, duration: 5000 }); setErrorMsg(result.error || ''); setStatus('error'); return }
      update(pid, { type: 'success', title: 'Done!', message: `Bought ${side} for $${amount}`, duration: 4000 })
      setStatus('success'); try { navigator.vibrate?.(20) } catch {}
      setTimeout(onComplete, 1000)
    } catch (e: any) {
      update(pid, { type: 'error', title: 'Failed', message: e.message, duration: 5000 }); setErrorMsg(e.message); setStatus('error')
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 z-[60] max-w-md mx-auto">
        <div className="bg-card border-t border-white/[0.06] rounded-t-[28px] p-5 pb-10">
          <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
          <h3 className="text-[15px] font-bold font-[family-name:var(--font-display)] text-white mb-1">{market.question}</h3>
          <p className="text-[11px] text-white/30 mb-5">{Math.round(market.probability)}% Yes</p>

          {/* Side pills */}
          <div className="flex gap-2 mb-5">
            <button onClick={() => setSide('YES')} disabled={status !== 'input'}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold font-[family-name:var(--font-display)] transition-all ${side === 'YES' ? 'bg-brand/15 border-2 border-brand/40 text-brand' : 'border border-white/[0.08] text-white/30'}`}>
              Yes {Math.round(market.probability)}¢
            </button>
            <button onClick={() => setSide('NO')} disabled={status !== 'input'}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold font-[family-name:var(--font-display)] transition-all ${side === 'NO' ? 'bg-white/10 border-2 border-white/20 text-white' : 'border border-white/[0.08] text-white/30'}`}>
              No {Math.round(100 - market.probability)}¢
            </button>
          </div>

          {/* Amount */}
          <div className="flex gap-1.5 mb-3">
            {[5, 10, 25, 50, 100].map(a => (
              <button key={a} onClick={() => setAmount(a)} disabled={status !== 'input'}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${amount === a ? 'bg-brand/10 border border-brand/30 text-brand' : 'border border-white/[0.06] text-white/30'}`}>${a}</button>
            ))}
          </div>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">$</span>
            <input type="number" value={amount} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setAmount(v) }}
              disabled={status !== 'input'} min={1}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-8 pr-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-brand/30 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>

          {/* Summary */}
          <div className="glass-card rounded-2xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-[11px]"><span className="text-white/30">You pay</span><span className="text-white font-bold">${amount}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-white/30">Shares</span><span className="text-white font-bold">{shares.toFixed(1)}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-white/30">Payout if correct</span><span className="text-brand font-bold">${shares.toFixed(2)}</span></div>
          </div>

          {status === 'error' && (
            <div className="mb-4 p-3 rounded-2xl border border-brand/20 bg-brand/5">
              <p className="text-[11px] text-brand">{errorMsg}</p>
              <button onClick={() => setStatus('input')} className="text-[10px] text-white/40 mt-1 underline">Try again</button>
            </div>
          )}

          <button onClick={handleSubmit} disabled={status !== 'input' || amount <= 0}
            className="w-full py-4 rounded-2xl bg-brand text-white text-sm font-bold font-[family-name:var(--font-display)] uppercase tracking-wider disabled:opacity-40 glow-red active:scale-[0.98] transition-transform">
            {status === 'signing' ? 'Sign in wallet...' : status === 'submitting' ? 'Placing...' : status === 'success' ? '✓ Done' : `Buy ${side} — $${amount}`}
          </button>
        </div>
      </motion.div>
    </>
  )
}

function cn(...classes: (string | boolean | undefined)[]) { return classes.filter(Boolean).join(' ') }
