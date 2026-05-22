'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown, Clock, Share2, Wallet, X, Bookmark } from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { formatNumber, timeRemaining } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { recordAction, rankMarkets } from '@/lib/recommendation'
import { useToast } from '@/components/toast'
import type { AppMarket } from '@/lib/polymarket'

export default function SwipePage() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { toast, update } = useToast()
  const [markets, setMarkets] = useState<AppMarket[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buyModal, setBuyModal] = useState<AppMarket | null>(null)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => { if (localStorage.getItem('pulse_onboarded')) setShowHint(false) }, [])

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/markets?limit=50&enrich=true')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMarkets(rankMarkets(data.markets || []) as AppMarket[])
      setCurrentIndex(0)
    } catch { toast({ type: 'error', title: 'Failed to load', duration: 3000 }) }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchMarkets() }, [fetchMarkets])

  const vibrate = () => { try { navigator.vibrate?.(8) } catch {} }

  const handleBuy = (market: AppMarket) => {
    vibrate()
    if (!isConnected) { openConnectModal?.(); return }
    setBuyModal(market)
  }

  const handleSkip = (market: AppMarket) => {
    vibrate()
    recordAction('skip', market)
    setCurrentIndex(i => i + 1)
    if (showHint) { setShowHint(false); localStorage.setItem('pulse_onboarded', '1') }
  }

  const handleShare = async () => {
    const m = markets[currentIndex]
    if (!m) return
    const url = `https://polymarket.com/event/${m.eventSlug}`
    try { navigator.share ? await navigator.share({ title: m.question, url }) : await navigator.clipboard.writeText(url) } catch {}
  }

  const handleBookmark = async () => {
    const m = markets[currentIndex]
    if (!m || !address) return
    try {
      const { addToWatchlist, logActivity } = await import('@/lib/supabase')
      await addToWatchlist(address, {
        market_id: m.id,
        question: m.question,
        slug: m.eventSlug,
        image: m.image,
        probability: m.probability,
        category: m.category,
      })
      await logActivity(address, { type: 'watchlist_add', market_id: m.id, question: m.question })
      toast({ type: 'success', title: 'Saved to watchlist', duration: 2000 })
    } catch { toast({ type: 'error', title: 'Could not save', duration: 2000 }) }
  }

  const handleBuyComplete = () => {
    if (buyModal) {
      recordAction('buy', buyModal)
      if (address) {
        import('@/lib/supabase').then(({ logActivity }) => {
          logActivity(address, { type: 'buy', market_id: buyModal.id, question: buyModal.question })
        }).catch(() => {})
      }
      setCurrentIndex(i => i + 1)
    }
    setBuyModal(null)
  }

  const currentMarket = markets[currentIndex]
  const nextMarket = markets[currentIndex + 1]

  // ============================================================
  // LOADING SKELETON
  // ============================================================
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm px-6">
          <div className="rounded-[40px] glass-dark overflow-hidden animate-pulse">
            <div className="h-48 bg-white/[0.02]" />
            <div className="p-7 space-y-4">
              <div className="h-5 bg-white/[0.04] rounded-lg w-3/4" />
              <div className="h-5 bg-white/[0.04] rounded-lg w-1/2" />
              <div className="h-14 bg-white/[0.03] rounded-xl" />
              <div className="h-1 bg-white/[0.04] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // EMPTY
  // ============================================================
  if (!currentMarket) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <p className="text-4xl mb-5">✓</p>
          <h2 className="text-xl font-bold text-white font-[family-name:var(--font-display)] mb-2">All caught up</h2>
          <p className="text-white/30 text-sm mb-6">New markets appear constantly.</p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={fetchMarkets}
            className="px-6 py-3 bg-white text-black rounded-2xl text-xs font-bold uppercase tracking-widest">
            Refresh
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ============================================================
  // MAIN
  // ============================================================
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -left-[10%] w-[120%] h-[120%] rounded-full bg-brand/15 blur-[130px]" />
        <motion.div animate={{ scale: [1.3, 1, 1.3], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-[20%] -right-[10%] w-[120%] h-[120%] rounded-full bg-blue-500/10 blur-[130px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-5 bg-gradient-to-b from-black via-black/40 to-transparent">
        <div className="w-full max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-base font-bold tracking-tight font-[family-name:var(--font-display)] bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Pulse</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-white/40 tabular-nums">
              <span className="text-white">{currentIndex + 1}</span>
              <span className="mx-0.5 text-white/10">/</span>{markets.length}
            </span>
            {isConnected ? (
              <button onClick={() => disconnect()} className="h-8 px-3 rounded-lg glass border-white/5 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-transform">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-white/50">{address?.slice(0, 4)}..{address?.slice(-3)}</span>
              </button>
            ) : (
              <button onClick={openConnectModal} className="h-8 px-3 rounded-lg glass border-white/5 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-transform">
                <Wallet size={11} strokeWidth={3} className="text-brand" />
                <span className="text-white/50">Connect</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Swipe hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-5 right-5 z-30 max-w-md mx-auto">
            <div className="glass border-white/5 rounded-2xl py-2 px-4 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">← Skip</span>
              <div className="flex gap-1">{[0,1,2].map(i => <motion.div key={i} animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }} className="w-1 h-1 rounded-full bg-white" />)}</div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">Buy →</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-5 pt-16 pb-20">
        <div className="relative w-full max-w-sm" style={{ height: 'min(75vh, 600px)' }}>
          {/* Background card */}
          {nextMarket && (
            <div className="absolute inset-0 scale-[0.94] opacity-30 pointer-events-none">
              <div className="w-full h-full rounded-[40px] glass-dark border border-white/5 overflow-hidden grayscale brightness-[0.2]" />
            </div>
          )}
          {/* Active card */}
          <AnimatePresence mode="popLayout">
            <SwipeCard key={currentMarket.id} market={currentMarket} onBuy={() => handleBuy(currentMarket)} onSkip={() => handleSkip(currentMarket)} onShare={handleShare} onBookmark={handleBookmark} />
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
// SWIPE CARD — Premium design with in-card buttons
// ============================================================
function SwipeCard({ market, onBuy, onSkip, onShare, onBookmark }: { market: AppMarket; onBuy: () => void; onSkip: () => void; onShare: () => void; onBookmark: () => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const yesOp = useTransform(x, [40, 120], [0, 1])
  const noOp = useTransform(x, [-120, -40], [1, 0])
  const imgX = useTransform(x, [-200, 200], [20, -20])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 80 || info.velocity.x > 400) onBuy()
    else if (info.offset.x < -80 || info.velocity.x < -400) onSkip()
  }

  const prob = Math.round(market.probability)
  const trend = market.trendDirection

  return (
    <motion.div style={{ x, rotate }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.8} onDragEnd={onDragEnd}
      initial={{ scale: 0.92, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 1.05, opacity: 0, x: 500, rotate: 45, transition: { duration: 0.5, ease: [0.32, 0, 0.67, 0] } }}
      transition={{ type: 'spring', stiffness: 450, damping: 30, mass: 0.8 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing z-10">

      <div className="relative w-full h-full rounded-[40px] overflow-hidden glass-dark premium-border flex flex-col">
        {/* Image with parallax — FULL CARD BACKGROUND */}
        <div className="absolute inset-0 z-0 bg-neutral-900">
          {market.image && (
            <motion.img style={{ x: imgX }} src={market.image} alt="" className="w-[120%] h-full object-cover opacity-60 ml-[-10%]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
        </div>

        {/* YES/NO stamps */}
        <motion.div style={{ opacity: yesOp }}
          className="absolute top-10 right-8 z-20 border-[3px] border-emerald-400 bg-emerald-400/10 backdrop-blur-md rounded-2xl px-5 py-1.5 rotate-12 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
          <span className="text-2xl font-bold font-[family-name:var(--font-display)] text-emerald-400 uppercase tracking-tighter">YES</span>
        </motion.div>
        <motion.div style={{ opacity: noOp }}
          className="absolute top-10 left-8 z-20 border-[3px] border-rose-500 bg-rose-500/10 backdrop-blur-md rounded-2xl px-5 py-1.5 -rotate-12 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
          <span className="text-2xl font-bold font-[family-name:var(--font-display)] text-rose-500 uppercase tracking-tighter">SKIP</span>
        </motion.div>

        {/* Content */}
        <div className="relative z-10 p-7 mt-auto flex flex-col gap-4">
          {/* Category + Live */}
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-white/10 rounded-lg backdrop-blur-md border border-white/5 text-[9px] font-bold uppercase tracking-widest text-white/80">{market.category}</span>
            <div className="flex items-center gap-1.5 text-brand font-bold text-[9px] uppercase tracking-wider bg-brand/10 px-2 py-1 rounded-lg">
              <div className="w-1 h-1 rounded-full bg-brand animate-pulse" />Live
            </div>
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold font-[family-name:var(--font-display)] leading-[1.1] tracking-tight text-white">{market.question}</h2>

          {/* Price */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Market Odds</span>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-bold font-[family-name:var(--font-display)] tabular-nums tracking-tighter leading-none bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">{prob}</span>
              <span className="text-2xl font-medium text-white/40 font-[family-name:var(--font-display)]">¢</span>
              {trend !== 0 && (
                <span className={`ml-2 text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Bar */}
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${prob}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              className="h-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5 text-white/30 text-[10px] font-bold uppercase tracking-widest">
              <TrendingUp size={12} strokeWidth={2.5} />{formatNumber(market.volume)} Vol
            </span>
            <span className="flex items-center gap-1.5 text-white/30 text-[10px] font-bold uppercase tracking-widest">
              <Clock size={12} strokeWidth={2.5} />{timeRemaining(market.endDate)}
            </span>
          </div>

          {/* In-card buttons */}
          <div className="flex items-center gap-2 mt-3">
            <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); onSkip() }}
              className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:bg-white/10 transition-all">
              <X size={22} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); onBookmark() }}
              className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:bg-white/10 transition-all">
              <Bookmark size={18} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); onShare() }}
              className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:bg-white/10 transition-all">
              <Share2 size={18} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); onBuy() }}
              className="flex-[2] h-14 rounded-2xl bg-white text-black font-bold font-[family-name:var(--font-display)] uppercase tracking-[0.12em] text-sm shadow-[0_10px_25px_rgba(255,255,255,0.15)] flex items-center justify-center">
              Buy Now
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// BUY MODAL (same logic, updated style)
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
      const { getWalletClient } = await import('wagmi/actions')
      const { config } = await import('@/lib/wagmi-config')
      const wc = await getWalletClient(config)
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
        <div className="bg-surface border-t border-white/[0.08] rounded-t-[32px] p-6 pb-10">
          <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-5" />
          <h3 className="text-base font-bold font-[family-name:var(--font-display)] text-white mb-1">{market.question}</h3>
          <p className="text-[11px] text-white/30 mb-5">{Math.round(market.probability)}% Yes</p>

          <div className="flex gap-2 mb-5">
            <button onClick={() => setSide('YES')} disabled={status !== 'input'}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all ${side === 'YES' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/[0.08] text-white/30'}`}>
              Yes {Math.round(market.probability)}¢
            </button>
            <button onClick={() => setSide('NO')} disabled={status !== 'input'}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all ${side === 'NO' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'border-white/[0.08] text-white/30'}`}>
              No {Math.round(100 - market.probability)}¢
            </button>
          </div>

          <div className="mb-4">
            <div className="flex gap-1.5 mb-2">
              {[5, 10, 25, 50, 100].map(a => (
                <button key={a} onClick={() => setAmount(a)} disabled={status !== 'input'}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${amount === a ? 'bg-white/[0.08] border-white/20 text-white' : 'border-white/[0.06] text-white/30'}`}>${a}</button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">$</span>
              <input type="number" value={amount} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setAmount(v) }}
                disabled={status !== 'input'} min={1}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-8 pr-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-white/20 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          </div>

          <div className="glass rounded-2xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-[11px]"><span className="text-white/30">You pay</span><span className="text-white font-bold">${amount}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-white/30">Shares</span><span className="text-white font-bold">{shares.toFixed(1)}</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-white/30">Payout if correct</span><span className="text-emerald-400 font-bold">${shares.toFixed(2)}</span></div>
          </div>

          {status === 'error' && (
            <div className="mb-4 p-3 rounded-2xl border border-rose-500/20 bg-rose-500/5">
              <p className="text-[11px] text-rose-400">{errorMsg}</p>
              <button onClick={() => setStatus('input')} className="text-[10px] text-white/40 mt-1 underline">Try again</button>
            </div>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={status !== 'input' || amount <= 0}
            className="w-full py-4 bg-white text-black rounded-2xl text-sm font-bold font-[family-name:var(--font-display)] uppercase tracking-widest disabled:opacity-40 shadow-[0_10px_25px_rgba(255,255,255,0.1)]">
            {status === 'signing' ? 'Sign in wallet...' : status === 'submitting' ? 'Placing...' : status === 'success' ? '✓ Done' : `Buy ${side} — $${amount}`}
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}
