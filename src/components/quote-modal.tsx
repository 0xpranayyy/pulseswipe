
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { formatNumber } from '@/lib/utils'

export function QuoteModal({ market, onClose, onSuccess, toast, update }: {
  market: any; onClose: () => void; onSuccess: () => void; toast: any; update: any
}) {
  const midpoint = market.midpoint ? parseFloat(market.midpoint) : 0.5
  const maxSpread = market.rewards_max_spread || 0.03
  const minSize = market.rewards_min_size || 10

  const [bidPrice, setBidPrice] = useState((midpoint - 0.01).toFixed(2))
  const [askPrice, setAskPrice] = useState((midpoint + 0.01).toFixed(2))
  const [size, setSize] = useState(Math.max(minSize, 20))
  const [placing, setPlacing] = useState(false)

  const handlePlace = async () => {
    setPlacing(true)
    const pid = toast({ type: 'pending', title: 'Placing quote orders...', duration: 0 })

    try {
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
      const { getClobClient } = await import('@/lib/trade-executor')
      const { Side, OrderType } = await import('@polymarket/clob-client-v2')

      const wc = await getWalletClientFromPrivy(null)
      const { client } = await getClobClient(wc as any)

      const BUILDER_CODE = process.env.NEXT_PUBLIC_POLY_BUILDER_CODE || ''
      const yesToken = market.tokens?.find((t: any) => t.outcome === 'Yes')?.token_id

      if (!yesToken) throw new Error('Market token not found')

      // Post bid (buy YES) + ask (sell YES)
      await client.createAndPostOrder(
        { tokenID: yesToken, price: parseFloat(bidPrice), size, side: Side.BUY, builderCode: BUILDER_CODE || undefined },
        { negRisk: market.negRisk || false },
        OrderType.GTC
      )

      await client.createAndPostOrder(
        { tokenID: yesToken, price: parseFloat(askPrice), size, side: Side.SELL, builderCode: BUILDER_CODE || undefined },
        { negRisk: market.negRisk || false },
        OrderType.GTC
      )

      update(pid, {
        type: 'success',
        title: 'Quote placed!',
        message: `Bid ${bidPrice} / Ask ${askPrice} — Earning rewards`,
        duration: 5000,
      })
      onSuccess()
    } catch (e: any) {
      update(pid, { type: 'error', title: 'Failed', message: e.message, duration: 5000 })
    } finally {
      setPlacing(false)
    }
  }

  const spread = (parseFloat(askPrice) - parseFloat(bidPrice)).toFixed(3)
  const spreadInRange = parseFloat(spread) <= maxSpread

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, mass: 1, stiffness: 180 }} className="fixed bottom-0 left-0 right-0 z-[60] max-w-lg mx-auto">
        <div className="liquid-glass border-t border-white/[0.04] rounded-t-[32px] p-6 pb-12 shadow-2xl bg-surface-modal/90">
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
          <h3 className="text-[17px] font-bold font-display text-text-primary mb-2 leading-snug">{market.question}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs text-text-tertiary font-semibold uppercase tracking-wider">
            <span>Midpoint: {(midpoint * 100).toFixed(0)}¢</span>
            <span>•</span>
            <span>Max spread: {(maxSpread * 100).toFixed(1)}¢</span>
            <span>•</span>
            <span>Reward: ${formatNumber(market.rewards_daily || 0)}/day</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold mb-2">Bid (Buy YES)</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-positive font-bold text-sm">$</span>
                <input type="number" value={bidPrice} onChange={(e) => setBidPrice(e.target.value)} step="0.01" min="0.01" max="0.99"
                  className="w-full bg-surface-elevated border border-transparent focus:border-brand/20 rounded-[20px] pl-8 pr-4 py-4 text-sm text-positive font-bold font-mono focus:outline-none focus:ring-2 focus:ring-brand/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold mb-2">Ask (Sell YES)</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-negative font-bold text-sm">$</span>
                <input type="number" value={askPrice} onChange={(e) => setAskPrice(e.target.value)} step="0.01" min="0.01" max="0.99"
                  className="w-full bg-surface-elevated border border-transparent focus:border-brand/20 rounded-[20px] pl-8 pr-4 py-4 text-sm text-negative font-bold font-mono focus:outline-none focus:ring-2 focus:ring-brand/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all" />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold mb-2">Size (shares each)</p>
            <input type="number" value={size} onChange={(e) => setSize(parseInt(e.target.value) || 0)} min={minSize}
              className="w-full bg-surface-elevated border border-transparent focus:border-brand/20 rounded-[20px] px-5 py-4 text-sm text-text-primary font-bold font-mono focus:outline-none focus:ring-2 focus:ring-brand/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all" />
            <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider mt-2">Min: {minSize} shares to qualify for rewards</p>
          </div>

          {/* Spread indicator */}
          <div className={`p-4 rounded-[20px] mb-6 border transition-all ${spreadInRange ? 'border-positive/20 bg-positive/[0.02]' : 'border-negative/20 bg-negative/[0.02]'}`}>
            <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider">
              <span className="text-text-tertiary">Spread</span>
              <span className={`font-bold ${spreadInRange ? 'text-positive' : 'text-negative'}`}>
                {(parseFloat(spread) * 100).toFixed(1)}¢ {spreadInRange ? '✓ Valid' : `✗ Too wide (max ${(maxSpread * 100).toFixed(1)}¢)`}
              </span>
            </div>
          </div>

          <button onClick={handlePlace} disabled={placing || !spreadInRange || size < minSize}
            className="w-full py-5 rounded-[24px] bg-brand text-black text-[15px] font-bold uppercase tracking-wider disabled:opacity-40 shadow-[0_4px_24px_rgba(183,255,0,0.25)] active:scale-[0.98] transition-all">
            {placing ? 'Placing Quote...' : 'Confirm Quote Orders'}
          </button>
        </div>
      </motion.div>
    </>
  )
}
