'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/use-wallet'
import { useToast } from '@/components/toast'
import { QuoteModal } from '@/components/quote-modal'
import { formatNumber } from '@/lib/utils'
import { Plus, Minus, RefreshCw, Zap } from 'lucide-react'

export default function EarnPage() {
  const { isConnected, connect } = useWallet()
  const { toast, update } = useToast()
  const [rewards, setRewards] = useState<any[]>([])
  const [earnings, setEarnings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openOrders, setOpenOrders] = useState<any[]>([])
  const [selectedMarket, setSelectedMarket] = useState<any>(null)
  const [quoteModal, setQuoteModal] = useState(false)

  // Fetch rewarded markets + user earnings
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/earn')
      const data = await res.json()
      setRewards(data.markets || [])
      setEarnings(data.earnings || null)
      setOpenOrders(data.openOrders || [])
    } catch { }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (isConnected) {
      loadData()
    }
  }, [isConnected, loadData])

  if (!isConnected) {
    return (
      <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 px-5">
        <header className="pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4">
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="text-2xl font-bold font-display text-text-primary tracking-tight">Earn</motion.h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 28, mass: 1, stiffness: 180 }}
            className="w-full bg-surface-elevated rounded-[32px] p-8 text-center border border-transparent hover:border-white/[0.04] transition-all max-w-sm mx-auto">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-[0_0_20px_rgba(183,255,0,0.1)]">
              <Zap className="w-8 h-8 text-brand" />
            </div>
            <h2 className="text-xl font-bold font-display text-text-primary mb-3">Earn LP Rewards</h2>
            <p className="text-text-tertiary text-sm mb-8 leading-relaxed font-medium">
              Provide liquidity on prediction markets. Earn daily rewards in pUSD from Polymarket's incentive program.
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

  return (
    <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="px-5 pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4 flex items-center justify-between">
        <div>
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="text-2xl font-bold font-display text-text-primary tracking-tight">Earn</motion.h1>
          <p className="text-[11px] text-text-tertiary font-medium mt-0.5">Provide liquidity, earn daily pUSD rewards</p>
        </div>
        <button onClick={loadData} disabled={loading} className="w-10 h-10 rounded-full border border-white/[0.04] bg-surface-elevated flex items-center justify-center active:scale-95 transition-all hover:bg-white/5">
          <RefreshCw className={`w-4 h-4 text-text-secondary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Earnings card */}
      {earnings && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="mx-5 mb-6 p-6 rounded-[32px] border border-brand/20 bg-brand/[0.02] shadow-[0_4px_20px_rgba(183,255,0,0.02)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full blur-2xl" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand mb-2">Your Earnings Today</p>
          <p className="text-3xl font-bold font-display text-brand">
            ${earnings.total?.toFixed(2) || '0.00'}
          </p>
          <p className="text-[10px] text-text-tertiary mt-2 font-medium">Paid daily to your wallet at midnight UTC</p>
        </motion.div>
      )}

      {/* Open orders */}
      {openOrders.length > 0 && (
        <div className="px-5 mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3">Your Active Quotes ({openOrders.length})</p>
          <div className="bg-surface-elevated rounded-[32px] p-5 border border-transparent hover:border-white/[0.04] transition-all space-y-3">
            {openOrders.slice(0, 5).map((order: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 last:pb-0 first:pt-0">
                <div>
                  <p className="text-[13px] font-bold text-text-primary">
                    {order.outcome || order.side} @ <span className="font-mono text-brand">{(parseFloat(order.price || '0.5') * 100).toFixed(0)}¢</span>
                  </p>
                  <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mt-0.5">
                    {order.side} • {parseFloat(order.original_size || '0').toFixed(0)} shares
                  </p>
                </div>
                <button onClick={async () => {
                  try {
                    const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
                    const wc = await getWalletClientFromPrivy(null)
                    const { getClobClient } = await import('@/lib/trade-executor')
                    const { client } = await getClobClient(wc as any)
                    await client.cancelOrder({ orderID: order.id } as any)
                    toast({ type: 'success', title: 'Order cancelled', duration: 2000 })
                    loadData()
                  } catch (e: any) {
                    toast({ type: 'error', title: 'Failed', message: e.message, duration: 3000 })
                  }
                }} className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center hover:bg-negative/10 hover:text-negative transition-all active:scale-90">
                  <Minus size={14} className="text-text-secondary hover:text-negative" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rewarded markets */}
      <div className="px-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3">
          Markets with Rewards {rewards.length > 0 && `(${rewards.length})`}
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-12 bg-surface-elevated rounded-[32px] border border-transparent">
            <p className="text-text-tertiary text-sm font-medium">No rewarded markets right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((market: any, i: number) => (
              <motion.button key={market.condition_id || i} onClick={() => { setSelectedMarket(market); setQuoteModal(true) }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 25, delay: i * 0.03 }}
                className="w-full flex items-center gap-4 p-4 bg-surface-elevated rounded-[24px] border border-transparent hover:border-brand/20 hover:bg-brand/[0.01] transition-all active:scale-[0.98] text-left shadow-sm">
                {market.image ? (
                  <img src={market.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 opacity-80" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 text-lg">💧</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-text-primary line-clamp-2 leading-snug">{market.question}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] font-bold text-brand">${formatNumber(market.rewards_daily || 0)}/day</span>
                    <span className="text-[10px] font-medium text-text-tertiary font-mono">min {market.rewards_min_size || 0} shares</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shadow-inner">
                    <Plus size={16} className="text-brand" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Quote modal */}
      <AnimatePresence>
        {quoteModal && selectedMarket && (
          <QuoteModal
            market={selectedMarket}
            onClose={() => setQuoteModal(false)}
            onSuccess={() => { setQuoteModal(false); loadData() }}
            toast={toast}
            update={update}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// We import QuoteModal from components now to avoid Next.js page compilation errors.
