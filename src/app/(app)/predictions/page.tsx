'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { RefreshCw, Wallet, ExternalLink, CheckCircle2, X } from 'lucide-react'
import { useToast } from '@/components/toast'

type Tab = 'positions' | 'history' | 'closed'

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  const [tab, setTab] = useState<Tab>('positions')
  const [profile, setProfile] = useState<{ proxyWallet: string | null; hasAccount: boolean; name?: string } | null>(null)
  const [positions, setPositions] = useState<any[]>([])
  const [closed, setClosed] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [portfolioValue, setPortfolioValue] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      // Fetch profile first to determine if user has a Polymarket account
      const profileR = await fetch(`/api/positions?address=${address}&type=profile`)
      const profileData = await profileR.json()
      setProfile(profileData)

      if (profileData.hasAccount) {
        // Fetch all data in parallel
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
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [address])

  useEffect(() => { refresh() }, [refresh])

  // ============================================================
  // STATE 1: Wallet not connected
  // ============================================================
  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full border border-white/[0.08] flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white/30" />
          </div>
          <h2 className="text-base font-semibold text-white mb-1">Connect wallet</h2>
          <p className="text-sm text-white/30 mb-5 leading-relaxed max-w-[260px] mx-auto">
            See your positions, trades, and portfolio
          </p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={openConnectModal}
            className="px-6 py-2.5 bg-white text-black rounded-full text-sm font-semibold">
            Connect Wallet
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ============================================================
  // STATE 2: Wallet connected but no Polymarket account
  // ============================================================
  if (profile && !profile.hasAccount) {
    return (
      <div className="flex flex-col min-h-full">
        <header className="px-5 pt-5 pb-4 border-b border-white/[0.04]">
          <h1 className="text-lg font-semibold text-white">Portfolio</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-8 py-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500/15 to-rose-500/15 border border-white/[0.08] flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <h2 className="text-base font-semibold text-white mb-2">Set up to start trading</h2>
            <p className="text-sm text-white/40 mb-6 leading-relaxed">
              Quick one-time setup. Add some funds and you&apos;re ready to swipe and trade.
            </p>
            <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full text-sm font-semibold">
              Get started
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button onClick={refresh} className="block mx-auto mt-4 text-[11px] text-white/30 hover:text-white/60">
              I&apos;ve set up my account → Refresh
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  // ============================================================
  // STATE 3: Connected with Polymarket account
  // ============================================================
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'positions', label: 'Active', count: positions.length },
    { id: 'history', label: 'History', count: history.length },
    { id: 'closed', label: 'Closed', count: closed.length },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <header className="px-5 pt-5 pb-3 border-b border-white/[0.04]">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-widest">Portfolio</p>
            <p className="text-2xl font-bold text-white tracking-tight">
              ${portfolioValue.toFixed(2)}
            </p>
          </div>
          <button onClick={refresh} disabled={loading}
            className="w-9 h-9 rounded-full border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.03] transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${
                tab === t.id ? 'bg-white text-black border-white' : 'border-white/[0.08] text-white/30'
              }`}>
              {t.label}
              {t.count > 0 && <span className={`ml-1 ${tab === t.id ? 'text-black/60' : 'text-white/20'}`}>{t.count}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-3">
        {loading && positions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-4 h-4 text-white/20 animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'positions' && <PositionsList positions={positions} />}
            {tab === 'history' && <HistoryList items={history} />}
            {tab === 'closed' && <ClosedList items={closed} />}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
function PositionsList({ positions }: { positions: any[] }) {
  const [sellTarget, setSellTarget] = useState<any>(null)

  if (positions.length === 0) return <Empty title="No positions yet" sub="Swipe right on a market to make your first prediction" />

  return (
    <>
      <div className="space-y-1.5">
        {positions.map((p: any, i: number) => {
          const pnl = parseFloat(p.cashPnl || '0')
          const pnlPct = parseFloat(p.percentPnl || '0')

          return (
            <motion.div key={p.asset || p.conditionId || i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="border border-white/[0.05] rounded-xl p-3 hover:border-white/[0.1] transition-all">
              <div className="flex items-start gap-3">
                {p.icon ? (
                  <img src={p.icon} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 opacity-80" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0"><span className="text-sm">📊</span></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-white/85 line-clamp-1">{p.title || 'Position'}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
                    <span className={`font-bold ${(p.outcome || '').toUpperCase() === 'YES' ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                      {p.outcome || 'YES'}
                    </span>
                    <span>{parseFloat(p.size || 0).toFixed(1)} shares</span>
                    <span>@ {(parseFloat(p.avgPrice || 0) * 100).toFixed(0)}¢</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-bold text-white">${parseFloat(p.currentValue || 0).toFixed(2)}</p>
                  {pnl !== 0 && (
                    <p className={`text-[10px] font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                      {pnlPct !== 0 && <span className="ml-1 opacity-60">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>}
                    </p>
                  )}
                </div>
              </div>
              {/* Sell button */}
              <button onClick={() => setSellTarget(p)}
                className="w-full mt-2.5 py-2 rounded-xl border border-white/[0.08] text-[11px] font-medium text-white/50 hover:bg-white/[0.04] hover:text-white/80 active:scale-[0.98] transition-all">
                Sell
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Sell Modal */}
      <AnimatePresence>
        {sellTarget && <SellModal position={sellTarget} onClose={() => setSellTarget(null)} />}
      </AnimatePresence>
    </>
  )
}

// ============================================================
// SELL MODAL
// ============================================================
function SellModal({ position, onClose }: { position: any; onClose: () => void }) {
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
      const { sell } = await import('@/lib/trade-executor')
      const { getWalletClient } = await import('wagmi/actions')
      const { config } = await import('@/lib/wagmi-config')

      const walletClient = await getWalletClient(config)
      if (!walletClient) throw new Error('Wallet not connected')

      setStatus('submitting')
      update(pendingId, { title: 'Placing sell order...', message: 'Almost there' })

      const result = await sell(walletClient, tokenId, shares, position.negativeRisk || false)

      if (!result.success) {
        update(pendingId, { type: 'error', title: 'Sell failed', message: result.error || 'Could not sell', duration: 5000 })
        setErrorMsg(result.error || 'Failed')
        setStatus('error')
        return
      }

      update(pendingId, { type: 'success', title: 'Sell order placed', message: `${shares.toFixed(1)} shares listed`, orderId: result.orderId, duration: 4000 })
      setStatus('success')
      setTimeout(onClose, 1200)
    } catch (e: any) {
      update(pendingId, { type: 'error', title: 'Failed', message: e.message, duration: 5000 })
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[60] max-w-lg mx-auto">
        <div className="bg-[#0a0a0a] border-t border-white/[0.08] rounded-t-3xl p-5 pb-10">
          <div className="w-8 h-1 bg-white/10 rounded-full mx-auto mb-4" />

          {/* Title */}
          <h3 className="text-[14px] font-semibold text-white mb-1 line-clamp-1">{position.title || 'Sell position'}</h3>
          <p className="text-[11px] text-white/30 mb-5">
            {position.outcome || 'YES'} • Current price: {(curPrice * 100).toFixed(0)}¢ • {totalShares.toFixed(1)} shares
          </p>

          {/* Quick sell buttons */}
          <div className="flex gap-1.5 mb-3">
            {[0.25, 0.5, 0.75, 1].map((pct) => (
              <button key={pct} onClick={() => setShares(Math.floor(totalShares * pct * 10) / 10)}
                disabled={status !== 'input'}
                className={`flex-1 py-2 rounded-xl text-[11px] font-medium border transition-all ${
                  Math.abs(shares - totalShares * pct) < 0.01
                    ? 'bg-white/[0.08] border-white/20 text-white'
                    : 'border-white/[0.06] text-white/40'
                }`}>
                {pct === 1 ? 'All' : `${pct * 100}%`}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="relative mb-4">
            <input
              type="number"
              value={shares}
              onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0 && v <= totalShares) setShares(v) }}
              disabled={status !== 'input'}
              max={totalShares}
              min={0}
              step={0.1}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/25">shares</span>
          </div>

          {/* Summary */}
          <div className="border border-white/[0.06] rounded-xl p-3 mb-5 space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-white/30">Selling</span>
              <span className="text-white font-medium">{shares.toFixed(1)} of {totalShares.toFixed(1)} shares</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-white/30">Price per share</span>
              <span className="text-white font-medium">{(curPrice * 100).toFixed(0)}¢</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-white/30">You receive (est.)</span>
              <span className="text-emerald-400 font-medium">${proceeds.toFixed(2)}</span>
            </div>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="mb-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <p className="text-[11px] text-rose-400">{errorMsg}</p>
              <button onClick={() => setStatus('input')} className="text-[10px] text-white/40 mt-1 underline">Try again</button>
            </div>
          )}

          {/* Submit */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSell}
            disabled={status !== 'input' || shares <= 0}
            className="w-full py-3.5 bg-white text-black rounded-2xl text-sm font-semibold disabled:opacity-40 transition-opacity">
            {status === 'signing' ? 'Sign in wallet...' :
             status === 'submitting' ? 'Placing sell...' :
             status === 'success' ? '✓ Sell placed' :
             shares >= totalShares ? `Sell All — ${totalShares.toFixed(1)} shares` :
             `Sell ${shares.toFixed(1)} shares`}
          </motion.button>

          <p className="text-[9px] text-white/10 text-center mt-3">GTC order • fills when matched</p>
        </div>
      </motion.div>
    </>
  )
}

// ============================================================
function ClosedList({ items }: { items: any[] }) {
  if (items.length === 0) return <Empty title="No closed positions" sub="Resolved markets show up here" />

  return (
    <div className="space-y-1.5">
      {items.map((p: any, i: number) => {
        const pnl = parseFloat(p.cashPnl || p.realizedPnl || '0')
        const won = pnl >= 0
        const slug = p.eventSlug || p.slug
        const url = slug ? `https://polymarket.com/event/${slug}` : 'https://polymarket.com'

        return (
          <motion.a key={p.asset || i} href={url} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 border border-white/[0.05] rounded-xl p-3 hover:border-white/[0.1] transition-all">
            <div className="flex-shrink-0">
              {won ? <CheckCircle2 className="w-4 h-4 text-emerald-400/70" /> : <X className="w-4 h-4 text-rose-400/70" />}
            </div>
            {p.icon && <img src={p.icon} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 opacity-70" />}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white/70 line-clamp-1">{p.title || 'Closed'}</p>
              <p className="text-[10px] text-white/25">{p.outcome || ''}</p>
            </div>
            <p className={`text-[11px] font-bold flex-shrink-0 ${won ? 'text-emerald-400' : 'text-rose-400'}`}>
              {won ? '+' : ''}${Math.abs(pnl).toFixed(2)}
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
    <div className="space-y-1.5">
      {items.map((item: any, i: number) => {
        const slug = item.eventSlug || item.slug
        const url = slug ? `https://polymarket.com/event/${slug}` : 'https://polymarket.com'
        const date = item.timestamp ? new Date(item.timestamp * 1000) : null
        const type = String(item.type || item.side || 'TRADE').toUpperCase()
        const isBuy = type === 'BUY' || item.side === 'BUY'
        const isSell = type === 'SELL' || item.side === 'SELL'
        const isRedeem = type === 'REDEEM'

        const label = isBuy ? 'BOUGHT' : isSell ? 'SOLD' : isRedeem ? 'CLAIMED' : type
        const color = isBuy ? 'text-emerald-400/80' : isSell ? 'text-rose-400/80' : 'text-violet-400/80'

        return (
          <motion.a key={item.transactionHash || i} href={url} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
            className="border border-white/[0.05] rounded-xl p-3 hover:border-white/[0.1] transition-all">
            <div className="flex items-center gap-3">
              {item.icon && <img src={item.icon} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 opacity-70" />}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-white/75 line-clamp-1">{item.title || 'Trade'}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/25">
                  <span className={`font-bold ${color}`}>{label}</span>
                  {item.outcome && <span className="text-white/40">{item.outcome}</span>}
                  {item.price > 0 && <span>@ {(parseFloat(item.price) * 100).toFixed(0)}¢</span>}
                  {item.size && <span>{parseFloat(item.size).toFixed(1)} sh</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {item.usdcSize > 0 && <p className="text-[11px] font-medium text-white/70">${parseFloat(item.usdcSize).toFixed(2)}</p>}
                {date && <p className="text-[9px] text-white/20">{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>}
              </div>
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
    <div className="text-center py-12">
      <p className="text-white/40 text-sm font-medium mb-1">{title}</p>
      <p className="text-white/15 text-xs">{sub}</p>
    </div>
  )
}
