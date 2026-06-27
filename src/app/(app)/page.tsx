'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { X as XIcon, Bookmark, Share2, Wallet, Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { Logo } from '@/components/logo'
import { useWallet } from '@/hooks/use-wallet'
import { rankMarkets, recordAction } from '@/lib/recommendation'
import { useToast } from '@/components/toast'
import type { AppMarket } from '@/lib/polymarket'
import { formatNumber, timeRemaining } from '@/lib/utils'

export default function SwipePage() {
  const { address, isConnected, connect } = useWallet()
  const { toast } = useToast()
  const [markets, setMarkets] = useState<AppMarket[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buyModal, setBuyModal] = useState<AppMarket | null>(null)
  const [showHint, setShowHint] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  useEffect(() => {
    if (localStorage.getItem('pulse_onboarded')) {
      setShowHint(false)
    }
  }, [])

  const fetchMarkets = useCallback(async (cat: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/markets?category=${cat}&limit=100&enrich=true`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMarkets(rankMarkets(data.markets || []) as AppMarket[])
      setCurrentIndex(0)
    } catch {
      toast({ type: 'error', title: 'Failed to load', duration: 3000 })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMarkets(selectedCategory)
  }, [selectedCategory, fetchMarkets])

  const vibrate = () => {
    try {
      navigator.vibrate?.(8)
    } catch {}
  }

  const handleBuy = (market: AppMarket) => {
    vibrate()
    if (!isConnected) {
      connect()
      return
    }
    setBuyModal(market)
  }

  const handleSkip = (market: AppMarket) => {
    vibrate()
    recordAction('skip', market)
    setCurrentIndex((i) => i + 1)
    if (showHint) {
      setShowHint(false)
      localStorage.setItem('pulse_onboarded', '1')
    }
  }

  const handleShare = async () => {
    const m = markets[currentIndex]
    if (!m) return
    const url = `https://polymarket.com/event/${m.eventSlug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: m.question, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast({ type: 'success', title: 'Copied link to clipboard', duration: 2000 })
      }
    } catch {}
  }

  const handleBookmark = async () => {
    const m = markets[currentIndex]
    if (!m || !address) {
      if (!isConnected) connect()
      return
    }
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
    } catch {
      toast({ type: 'error', title: 'Could not save', duration: 2000 })
    }
  }

  const handleBuyComplete = (amount?: number, side?: 'YES' | 'NO', price?: number) => {
    if (buyModal) {
      recordAction('buy', buyModal)
      if (address) {
        import('@/lib/supabase').then(({ logActivity }) => {
          logActivity(address, {
            type: 'buy',
            market_id: buyModal.id,
            question: buyModal.question,
            amount,
            side,
            price,
          })
        }).catch(() => {})
      }
      setCurrentIndex((i) => i + 1)
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
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary min-h-dvh">
        <div className="w-full max-w-sm px-6">
          <div className="rounded-[40px] bg-surface-elevated border border-white/[0.04] overflow-hidden animate-pulse">
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
      <div className="flex-1 flex items-center justify-center px-8 bg-bg-primary min-h-dvh">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl text-brand font-bold">✓</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary font-display mb-2">All caught up</h2>
          <p className="text-text-tertiary text-sm mb-8 font-medium">New prediction markets appear constantly. Check back shortly.</p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => fetchMarkets(selectedCategory)}
            className="w-full py-4 bg-brand text-black rounded-[20px] text-[13px] font-bold uppercase tracking-widest shadow-lg">
            Refresh Stack
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ============================================================
  // MAIN
  // ============================================================
  return (
    <div className="flex flex-col h-dvh max-h-dvh bg-bg-primary pt-safe-top pb-28 overflow-hidden relative">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -left-[10%] w-[120%] h-[120%] rounded-full bg-brand/10 blur-[130px]" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.2, 0.08] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-[20%] -right-[10%] w-[120%] h-[120%] rounded-full bg-blue-500/5 blur-[130px]" />
      </div>

      {/* Header */}
      <header className="px-5 pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={24} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-text-tertiary font-mono tracking-widest">
            <span className="text-text-primary">{currentIndex + 1}</span>
            <span className="mx-0.5 opacity-30">/</span>{markets.length}
          </span>
          {isConnected ? (
            <div className="h-8 px-3 rounded-xl bg-surface-elevated border border-white/[0.04] flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-brand" />
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest font-mono">{address?.slice(0, 4)}..{address?.slice(-3)}</span>
            </div>
          ) : (
            <button onClick={connect} className="h-8 px-3.5 rounded-xl bg-brand text-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform">
              <Wallet size={11} strokeWidth={2.5} />
              <span>Connect</span>
            </button>
          )}
        </div>
      </header>

      {/* Categories Horizontal Scroll */}
      <div className="px-5 mb-2 overflow-x-auto scrollbar-hide flex items-center gap-2 z-20 flex-shrink-0">
        {[
          { id: 'ALL', label: 'All', icon: '✨' },
          { id: 'EXPIRING', label: 'Expiring Soon', icon: '⏰' },
          { id: 'POLITICS', label: 'Politics', icon: '⚖️' },
          { id: 'SPORTS', label: 'Sports', icon: '⚽' },
          { id: 'CRYPTO', label: 'Crypto', icon: '🪙' },
          { id: 'POP_CULTURE', label: 'Culture', icon: '🎬' },
        ].map((cat) => {
          const isActive = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap active:scale-95 border ${
                isActive
                  ? 'bg-brand text-black border-brand shadow-[0_2px_12px_rgba(183,255,0,0.2)]'
                  : 'bg-surface-elevated/40 border-white/[0.04] text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Swipe hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-[135px] left-5 right-5 z-30 max-w-sm mx-auto">
            <div className="liquid-glass border-white/5 rounded-2xl py-2 px-5 flex items-center justify-between shadow-lg">
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">← Skip</span>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }} className="w-1.5 h-1.5 rounded-full bg-white" />
                ))}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand">Trade YES →</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-5 pt-4 pb-4 z-10">
        <div className="relative w-full max-w-sm" style={{ height: 'min(64vh, 520px)' }}>
          {/* Background card */}
          {nextMarket && (
            <div className="absolute inset-0 scale-[0.94] translate-y-4 opacity-30 pointer-events-none transition-all duration-300">
              <div className="w-full h-full rounded-[40px] bg-surface-elevated border border-white/[0.04] overflow-hidden grayscale brightness-[0.2]" />
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
  const imgX = useTransform(x, [-200, 200], [15, -15])

  const [liveYesPrice, setLiveYesPrice] = useState<number | null>(null)

  const yesTokenId = market.clobTokenIds?.[0]

  useEffect(() => {
    setLiveYesPrice(null)
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
        console.error("Error fetching swipe live price:", e)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 4000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [yesTokenId])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 80 || info.velocity.x > 400) onBuy()
    else if (info.offset.x < -80 || info.velocity.x < -400) onSkip()
  }

  const prob = liveYesPrice !== null ? Math.round(liveYesPrice * 100) : Math.round(market.probability)
  const trend = market.trendDirection

  return (
    <motion.div style={{ x, rotate }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.8} onDragEnd={onDragEnd}
      initial={{ scale: 0.92, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 1.05, opacity: 0, x: x.get() > 0 ? 500 : -500, rotate: x.get() > 0 ? 45 : -45, transition: { duration: 0.4 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 30, mass: 0.8 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing z-10">

      <div className="relative w-full h-full rounded-[40px] overflow-hidden bg-surface-elevated border border-white/[0.04] flex flex-col shadow-2xl">
        {/* Parallax Image Background */}
        <div className="absolute inset-0 z-0 bg-neutral-950">
          {market.image ? (
            <motion.img style={{ x: imgX }} src={market.image} alt="" className="w-[115%] h-full object-cover opacity-60 ml-[-7.5%]" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-bg-primary/20" />
        </div>

        {/* YES/NO swipe stamps */}
        <motion.div style={{ opacity: yesOp }}
          className="absolute top-10 right-8 z-20 border-[3px] border-brand bg-brand/10 backdrop-blur-md rounded-2xl px-5 py-1.5 rotate-12 shadow-[0_0_30px_rgba(183,255,0,0.3)]">
          <span className="text-xl font-bold font-display text-brand uppercase tracking-tighter">YES</span>
        </motion.div>
        <motion.div style={{ opacity: noOp }}
          className="absolute top-10 left-8 z-20 border-[3px] border-negative bg-negative/10 backdrop-blur-md rounded-2xl px-5 py-1.5 -rotate-12 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
          <span className="text-xl font-bold font-display text-negative uppercase tracking-tighter">SKIP</span>
        </motion.div>

        {/* Dynamic Watermark Background */}
        <div className="absolute bottom-24 -right-12 opacity-[0.03] pointer-events-none z-0">
          <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 p-6 mt-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-white/10 rounded-lg backdrop-blur-md border border-white/5 text-[9px] font-bold uppercase tracking-widest text-text-secondary">{market.category}</span>
            <div className="flex items-center gap-1.5 text-brand font-bold text-[9px] uppercase tracking-wider bg-brand/10 px-2 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-brand" />Live
            </div>
          </div>

          <h2 className="text-xl font-bold font-display leading-[1.15] tracking-tight text-text-primary">{market.question}</h2>

          {/* Probability visualizer */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary">YES Probability</span>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold font-display tabular-nums tracking-tighter leading-none text-text-primary">{prob}</span>
              <span className="text-xl font-semibold text-text-tertiary font-display">¢</span>
              {trend !== 0 && (
                <span className={`ml-2.5 text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? 'text-positive' : 'text-negative'}`}>
                  {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Glow line progress indicator */}
          <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${prob}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              className="h-full bg-brand shadow-[0_0_12px_rgba(183,255,0,0.5)]" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10px] text-text-tertiary font-bold tracking-wider uppercase font-mono">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={12} strokeWidth={2.5} />${formatNumber(market.volume)} Vol
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} strokeWidth={2.5} />{timeRemaining(market.endDate)}
            </span>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-2 mt-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); onSkip() }}
              className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/[0.04] flex items-center justify-center text-text-secondary hover:bg-white/10 active:scale-90 transition-all">
              <XIcon size={20} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); onBookmark() }}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/[0.04] flex items-center justify-center text-text-secondary hover:bg-white/10 active:scale-90 transition-all">
              <Bookmark size={16} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); onShare() }}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/[0.04] flex items-center justify-center text-text-secondary hover:bg-white/10 active:scale-90 transition-all">
              <Share2 size={16} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); onBuy() }}
              className="flex-[2] h-12 rounded-2xl bg-brand text-black font-bold font-display uppercase tracking-wider text-xs shadow-lg hover:shadow-brand/25 transition-all flex items-center justify-center">
              Trade now
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
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
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
      const wc = await getWalletClientFromPrivy(null)
      if (!wc) throw new Error('Wallet disconnected')

      const { buy, clearCache } = await import('@/lib/trade-executor')

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
          update(pid, { type: 'error', title: 'Setup failed', message: onboardResult.error, duration: 5000 })
          setErrorMsg(onboardResult.error || 'Setup failed')
          setStatus('error')
          return
        }
        // Retry trade after onboarding
        clearCache()
        update(pid, { title: 'Placing order...' })
        result = await buy(wc, tokenId, amount, market.negRisk)
      }

      if (!result.success) {
        update(pid, { type: 'error', title: 'Failed', message: result.error, duration: 5000 })
        setErrorMsg(result.error || '')
        setStatus('error')
        return
      }
      update(pid, { type: 'success', title: 'Done!', message: `Bought ${side} for $${amount}`, duration: 4000 })
      setStatus('success')
      try {
        navigator.vibrate?.(20)
      } catch {}
      setTimeout(() => onComplete(amount, side, price), 1000)
    } catch (e: any) {
      update(pid, { type: 'error', title: 'Failed', message: e.message, duration: 5000 })
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, mass: 1, stiffness: 180 }} className="fixed bottom-0 left-0 right-0 z-[60] max-w-lg mx-auto">
        <div className="liquid-glass border-t border-white/[0.04] rounded-t-[32px] p-6 pb-12 shadow-2xl bg-surface-modal/90">
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
          <h3 className="text-[17px] font-bold font-display text-text-primary mb-2 leading-snug">{market.question}</h3>
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

          {/* Amount presets */}
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
