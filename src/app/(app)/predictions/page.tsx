'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/use-wallet'
import { RefreshCw, Wallet, CheckCircle2, X, Briefcase } from 'lucide-react'
import { useToast } from '@/components/toast'

type Tab = 'positions' | 'history' | 'closed'

export default function PortfolioPage() {
  const { address, isConnected, connect } = useWallet()
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('positions')
  const [positions, setPositions] = useState<any[]>([])
  const [closed, setClosed] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [portfolioValue, setPortfolioValue] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      const [posR, histR, valR, closedR] = await Promise.all([
        fetch(`/api/positions?address=${address}&type=positions`).then(r => r.json()),
        fetch(`/api/positions?address=${address}&type=history`).then(r => r.json()),
        fetch(`/api/positions?address=${address}&type=value`).then(r => r.json()),
        fetch(`/api/positions?address=${address}&type=closed`).then(r => r.json()),
      ])
      setPositions(posR.positions || [])
      setHistory(histR.activity || [])
      setPortfolioValue(parseFloat(valR.value || '0'))
      setClosed(closedR.closed || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [address])

  useEffect(() => {
    if (isConnected) {
      refresh()
    }
  }, [isConnected, refresh])

  // ============================================================
  // STATE 1: Wallet not connected
  // ============================================================
  if (!isConnected) {
    return (
      <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 px-5">
        <header className="pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4">
          <div className="flex items-center gap-2">
            <Briefcase size={20} className="text-brand" fill="currentColor" />
            <h1 className="text-2xl font-bold font-display text-text-primary tracking-tight">Portfolio</h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 28, mass: 1, stiffness: 180 }}
            className="w-full bg-surface-elevated rounded-[32px] p-8 text-center border border-transparent hover:border-white/[0.04] transition-all max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-[0_0_20px_rgba(183,255,0,0.1)]">
              <Wallet className="w-8 h-8 text-brand" />
            </div>
            <h2 className="text-xl font-bold font-display text-text-primary mb-3">Portfolio Tracker</h2>
            <p className="text-text-tertiary text-sm mb-8 leading-relaxed font-medium">
              See your active positions, trading history, and closed prediction outcomes in one unified terminal dashboard.
            </p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={connect}
              className="w-full py-4 bg-brand text-black rounded-[20px] text-[13px] font-bold uppercase tracking-widest shadow-lg hover:shadow-brand/25 transition-all">
              Connect Wallet
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  // ============================================================
  // STATE 2: Connected — show portfolio
  // ============================================================
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'positions', label: 'Active', count: positions.length },
    { id: 'history', label: 'History', count: history.length },
    { id: 'closed', label: 'Closed', count: closed.length },
  ]

  return (
    <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="px-5 pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={20} className="text-brand" fill="currentColor" />
          <h1 className="text-2xl font-bold font-display text-text-primary tracking-tight">Portfolio</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-bold text-brand font-mono">${portfolioValue.toFixed(2)}</span>
          <button onClick={refresh} disabled={loading} className="w-8 h-8 rounded-full border border-white/[0.04] bg-surface-elevated flex items-center justify-center active:scale-95 transition-all hover:bg-white/5">
            <RefreshCw className={`w-3.5 h-3.5 text-text-secondary ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-5">
        <div className="bg-surface-elevated rounded-[20px] p-1 flex gap-1 border border-white/[0.04]">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3 rounded-2xl text-[12px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                tab === t.id ? 'bg-white/10 text-white shadow-inner' : 'text-text-tertiary hover:text-text-secondary'
              }`}>
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full ${
                  tab === t.id ? 'bg-brand text-black' : 'bg-white/5 text-text-tertiary'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List content */}
      <div className="flex-1">
        {loading && positions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 text-brand animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'positions' && <PositionsList positions={positions} toast={toast} refresh={refresh} />}
            {tab === 'history' && <HistoryList items={history} />}
            {tab === 'closed' && <ClosedList items={closed} />}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
function PositionsList({ positions, toast, refresh }: { positions: any[]; toast: (t: any) => string; refresh: () => void }) {
  const [sellTarget, setSellTarget] = useState<any>(null)

  if (positions.length === 0) return <Empty title="No positions yet" sub="Swipe right on a market to make your first prediction" />

  return (
    <>
      <div className="space-y-3 px-5">
        {positions.map((p: any, i: number) => {
          const pnl = parseFloat(p.cashPnl || '0')
          const pnlPct = parseFloat(p.percentPnl || '0')

          return (
            <motion.div key={p.asset || p.conditionId || i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 25, delay: i * 0.03 }}
              className="bg-surface-elevated rounded-[24px] p-4 border border-transparent hover:border-white/[0.04] transition-all shadow-sm">
              <div className="flex items-start gap-4">
                {p.icon ? (
                  <img src={p.icon} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 opacity-85" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 text-lg">📊</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-text-primary line-clamp-1 leading-snug">{p.title || 'Position'}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10.5px] font-semibold tracking-wide uppercase">
                    <span className={`font-bold ${(p.outcome || '').toUpperCase() === 'YES' ? 'text-positive' : 'text-negative'}`}>
                      {p.outcome || 'YES'}
                    </span>
                    <span className="text-text-tertiary">•</span>
                    <span className="text-text-secondary font-mono">{parseFloat(p.size || 0).toFixed(1)} sh</span>
                    <span className="text-text-tertiary">•</span>
                    <span className="text-text-secondary font-mono">{(parseFloat(p.avgPrice || 0) * 100).toFixed(0)}¢</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[14px] font-bold text-text-primary font-mono">${parseFloat(p.currentValue || 0).toFixed(2)}</p>
                  {pnl !== 0 && (
                    <p className={`text-[11px] font-bold font-mono mt-1 ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                      {pnlPct !== 0 && <span className="ml-1 opacity-60">({pnlPct >= 0 ? '+' : '-'}{pnlPct.toFixed(1)}%)</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {p.redeemable ? (
                <button onClick={async () => {
                  try {
                    const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
                    const { redeemPosition } = await import('@/lib/redeem')
                    const wc = await getWalletClientFromPrivy(null)
                    toast({ type: 'pending', title: 'Redeeming winnings...', duration: 0 })
                    const result = await redeemPosition(wc as any, p.conditionId, p.negativeRisk || false)
                    if (result.success) {
                      toast({ type: 'success', title: 'Redeemed!', message: 'Funds returned to your wallet', duration: 4000 })
                      refresh()
                    } else {
                      toast({ type: 'error', title: 'Redeem failed', message: result.error, duration: 5000 })
                    }
                  } catch (e: any) {
                    toast({ type: 'error', title: 'Failed', message: e.message, duration: 5000 })
                  }
                }}
                  className="w-full mt-4 py-3 rounded-2xl border border-positive/20 bg-positive/5 text-xs font-bold text-positive text-center active:scale-[0.98] transition-all uppercase tracking-wider">
                  Redeem winnings
                </button>
              ) : p.mergeable ? (
                <button onClick={async () => {
                  try {
                    const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
                    const { redeemPosition } = await import('@/lib/redeem')
                    const wc = await getWalletClientFromPrivy(null)
                    toast({ type: 'pending', title: 'Closing position...', duration: 0 })
                    const result = await redeemPosition(wc as any, p.conditionId, p.negativeRisk || false)
                    if (result.success) {
                      toast({ type: 'success', title: 'Position closed', duration: 4000 })
                      refresh()
                    } else {
                      toast({ type: 'error', title: 'Failed', message: result.error, duration: 5000 })
                    }
                  } catch (e: any) {
                    toast({ type: 'error', title: 'Failed', message: e.message, duration: 5000 })
                  }
                }}
                  className="w-full mt-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-xs font-bold text-text-secondary text-center active:scale-[0.98] transition-all uppercase tracking-wider hover:bg-white/5">
                  Close position
                </button>
              ) : (
                <button onClick={() => setSellTarget(p)}
                  className="w-full mt-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.01] text-xs font-bold text-text-secondary hover:bg-white/[0.04] hover:text-text-primary active:scale-[0.98] transition-all uppercase tracking-wider">
                  Sell Position
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Sell Modal */}
      <AnimatePresence>
        {sellTarget && <SellModal position={sellTarget} onClose={() => { setSellTarget(null); refresh() }} />}
      </AnimatePresence>
    </>
  )
}

// ============================================================
// SELL MODAL
// ============================================================
function SellModal({ position, onClose }: { position: any; onClose: () => void }) {
  const { address } = useWallet()
  const totalShares = parseFloat(position.size || '0')
  const curPrice = parseFloat(position.curPrice || '0.5')
  const [shares, setShares] = useState(totalShares)
  const [status, setStatus] = useState<'input' | 'signing' | 'submitting' | 'success' | 'error'>('input')
  const [errorMsg, setErrorMsg] = useState('')
  const { toast, update } = useToast()

  const proceeds = shares * curPrice
  const tokenId = position.asset

  const handleSell = async () => {
    if (!tokenId || shares <= 0) return
    setStatus('signing')

    const pendingId = toast({
      type: 'pending',
      title: 'Sign in your wallet',
      message: `Selling ${shares.toFixed(1)} shares`,
      duration: 0,
    })

    try {
      const { sell, clearCache } = await import('@/lib/trade-executor')
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')

      const walletClient = await getWalletClientFromPrivy(null)
      if (!walletClient) throw new Error('Wallet not connected')

      setStatus('submitting')
      update(pendingId, { title: 'Placing sell order...', message: 'Executing trade' })

      let result = await sell(walletClient, tokenId, shares, position.negativeRisk || false)

      // Handle onboarding if needed
      if (!result.success && (result.error === 'NEEDS_ONBOARDING' || result.error === 'NEEDS_APPROVALS')) {
        update(pendingId, { title: 'Setting up trading account...' })
        const { enableTrading } = await import('@/lib/onboarding')
        const onboardResult = await enableTrading(walletClient, {
          onStatusChange: (_s, msg) => update(pendingId, { title: msg }),
        })
        if (!onboardResult.success) {
          update(pendingId, { type: 'error', title: 'Setup failed', message: onboardResult.error, duration: 5000 })
          setErrorMsg(onboardResult.error || 'Failed')
          setStatus('error')
          return
        }
        clearCache()
        update(pendingId, { title: 'Placing sell order...' })
        result = await sell(walletClient, tokenId, shares, position.negativeRisk || false)
      }

      if (!result.success) {
        update(pendingId, { type: 'error', title: 'Sell failed', message: result.error || 'Could not sell', duration: 5000 })
        setErrorMsg(result.error || 'Failed')
        setStatus('error')
        return
      }

      update(pendingId, { type: 'success', title: 'Done!', message: `Sold ${shares.toFixed(1)} shares`, orderId: result.orderId, duration: 4000 })
      setStatus('success')
      try { navigator.vibrate?.(20) } catch {}
      if (address) {
        import('@/lib/supabase').then(({ logActivity }) => {
          logActivity(address, {
            type: 'sell',
            market_id: position.conditionId || position.asset,
            question: position.title,
            amount: proceeds,
            side: position.outcome,
            price: curPrice
          })
        }).catch(() => {})
      }
      setTimeout(onClose, 1000)
    } catch (e: any) {
      update(pendingId, { type: 'error', title: 'Failed', message: e.message, duration: 5000 })
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, mass: 1, stiffness: 180 }}
        className="fixed bottom-0 left-0 right-0 z-[60] max-w-lg mx-auto">
        <div className="liquid-glass border-t border-white/[0.04] rounded-t-[32px] p-6 pb-12 shadow-2xl bg-surface-modal/90">
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />

          {/* Title */}
          <h3 className="text-[17px] font-bold font-display text-text-primary mb-2 leading-snug">{position.title || 'Sell position'}</h3>
          <p className="text-xs text-text-tertiary mb-6 font-semibold uppercase tracking-wider">
            {position.outcome || 'YES'} • {(curPrice * 100).toFixed(0)}¢ Current Price
          </p>

          {/* Quick sell buttons */}
          <div className="flex gap-2 mb-4">
            {[0.25, 0.5, 0.75, 1].map((pct) => (
              <button key={pct} onClick={() => setShares(Math.floor(totalShares * pct * 10) / 10)}
                disabled={status !== 'input'}
                className={`flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all ${
                  Math.abs(shares - totalShares * pct) < 0.01
                    ? 'bg-white/10 text-white'
                    : 'bg-surface-elevated text-text-tertiary hover:text-text-secondary'
                }`}>
                {pct === 1 ? 'MAX' : `${pct * 100}%`}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="relative mb-6">
            <input
              type="number"
              value={shares}
              onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0 && v <= totalShares) setShares(v) }}
              disabled={status !== 'input'}
              max={totalShares}
              min={0}
              step={0.1}
              className="w-full bg-surface-elevated rounded-[20px] px-5 py-4 text-lg text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-shadow"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-text-tertiary">shares</span>
          </div>

          {/* Summary */}
          <div className="bg-surface-elevated rounded-[20px] p-5 mb-6 space-y-3">
            <div className="flex justify-between text-[13px] font-medium">
              <span className="text-text-tertiary">Selling</span>
              <span className="text-text-primary font-mono">{shares.toFixed(1)} / {totalShares.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-medium">
              <span className="text-text-tertiary">Price per share</span>
              <span className="text-text-primary font-mono">{(curPrice * 100).toFixed(0)}¢</span>
            </div>
            <div className="flex justify-between text-[13px] font-bold">
              <span className="text-text-tertiary">You receive (est.)</span>
              <span className="text-positive font-mono">${proceeds.toFixed(2)}</span>
            </div>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="mb-5 p-4 rounded-[20px] border border-negative/20 bg-negative/5">
              <p className="text-[13px] text-negative font-medium">{errorMsg}</p>
              <button onClick={() => setStatus('input')} className="text-[11px] text-text-tertiary mt-2 uppercase tracking-wider font-bold">Try again</button>
            </div>
          )}

          {/* Submit */}
          {status === 'success' ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-positive font-bold text-lg">✓ Trade Complete</p>
              </div>
              <button onClick={onClose} className="w-full py-4 bg-surface-elevated rounded-[24px] text-text-primary text-[15px] font-bold active:scale-[0.98] transition-transform">
                Done
              </button>
            </div>
          ) : (
            <button onClick={handleSell} disabled={status !== 'input' || shares <= 0}
              className="w-full py-5 rounded-[24px] bg-brand text-black text-[15px] font-bold uppercase tracking-wider disabled:opacity-40 shadow-[0_4px_24px_rgba(183,255,0,0.25)] active:scale-[0.98] transition-all">
              {status === 'signing' ? 'Confirm in Wallet' :
               status === 'submitting' ? 'Executing Trade...' :
               shares >= totalShares ? `Sell All shares` :
               `Sell ${shares.toFixed(1)} shares`}
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ============================================================
function ClosedList({ items }: { items: any[] }) {
  if (items.length === 0) return <Empty title="No closed positions" sub="Resolved markets show up here" />

  return (
    <div className="space-y-3 px-5">
      {items.map((p: any, i: number) => {
        const pnl = parseFloat(p.cashPnl || p.realizedPnl || '0')
        const won = pnl >= 0
        const slug = p.eventSlug || p.slug
        const url = slug ? `https://polymarket.com/event/${slug}` : 'https://polymarket.com'

        return (
          <motion.a key={p.asset || i} href={url} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 25, delay: i * 0.03 }}
            className="flex items-center gap-4 bg-surface-elevated rounded-[24px] p-4 border border-transparent hover:border-white/[0.04] transition-all shadow-sm">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/[0.02] flex items-center justify-center">
              {won ? <CheckCircle2 className="w-5 h-5 text-positive/80" /> : <X className="w-5 h-5 text-negative/80" />}
            </div>
            {p.icon && <img src={p.icon} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 opacity-70" />}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-text-primary line-clamp-1 leading-snug">{p.title || 'Closed'}</p>
              <p className="text-[11px] text-text-tertiary font-semibold uppercase tracking-wider mt-1">{p.outcome || ''}</p>
            </div>
            <p className={`text-[13px] font-bold flex-shrink-0 font-mono ${won ? 'text-positive' : 'text-negative'}`}>
              {won ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
            </p>
          </motion.a>
        )
      })}
    </div>
  )
}

// ============================================================
function HistoryList({ items }: { items: any[] }) {
  if (items.length === 0) return <Empty title="No history" sub="Your trades will appear here" />

  return (
    <div className="space-y-3 px-5">
      {items.map((item: any, i: number) => {
        const slug = item.eventSlug || item.slug
        const url = slug ? `https://polymarket.com/event/${slug}` : 'https://polymarket.com'
        const date = item.timestamp ? new Date(item.timestamp * 1000) : null
        const type = String(item.type || item.side || 'TRADE').toUpperCase()
        const isBuy = type === 'BUY' || item.side === 'BUY'
        const isSell = type === 'SELL' || item.side === 'SELL'
        const isRedeem = type === 'REDEEM'

        const label = isBuy ? 'BOUGHT' : isSell ? 'SOLD' : isRedeem ? 'CLAIMED' : type
        const color = isBuy ? 'text-positive' : isSell ? 'text-negative' : 'text-brand'

        return (
          <motion.a key={item.transactionHash || i} href={url} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 25, delay: i * 0.02 }}
            className="flex items-center gap-4 bg-surface-elevated rounded-[24px] p-4 border border-transparent hover:border-white/[0.04] transition-all shadow-sm">
            {item.icon && <img src={item.icon} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 opacity-70" />}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-text-primary line-clamp-1 leading-snug">{item.title || 'Trade'}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[10.5px] font-medium text-text-tertiary">
                <span className={`font-bold ${color}`}>{label}</span>
                <span>•</span>
                {item.outcome && <span className="text-text-secondary font-bold uppercase">{item.outcome}</span>}
                {item.price > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-mono">@ {(parseFloat(item.price) * 100).toFixed(0)}¢</span>
                  </>
                )}
                {item.size && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{parseFloat(item.size).toFixed(1)} sh</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {item.usdcSize > 0 && <p className="text-[13px] font-bold text-text-primary font-mono">${parseFloat(item.usdcSize).toFixed(2)}</p>}
              {date && <p className="text-[10px] text-text-tertiary font-semibold uppercase mt-1">{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>}
            </div>
          </motion.a>
        )
      })}
    </div>
  )
}

// ============================================================
function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center py-16 px-5 bg-surface-elevated rounded-[32px] border border-transparent max-w-sm mx-auto my-6">
      <p className="text-text-secondary text-sm font-bold mb-2">{title}</p>
      <p className="text-text-tertiary text-xs leading-relaxed font-medium">{sub}</p>
    </div>
  )
}
