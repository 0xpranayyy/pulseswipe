'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Zap, Trophy, AlertCircle, ChevronRight } from 'lucide-react'
import { useWallet } from '@/hooks/use-wallet'
import { useToast } from '@/components/toast'

interface ComboMarket {
  id: string
  question: string
  slug: string
  eventSlug: string
  image: string
  probability: number
  volume: number
  endDate: string
  clobTokenIds: string[]
  positionIds: string[]
  conditionId: string
  negRisk: boolean
  comboStatus: string
  category: string
}

interface ComboLeg {
  market: ComboMarket
  side: 'YES' | 'NO'
  probability: number // probability of selected side
}

const SPRING = { type: 'spring', damping: 28, mass: 1, stiffness: 180 } as const

export function ComboBuilder() {
  const { isConnected, connect } = useWallet()
  const { toast } = useToast()
  const [markets, setMarkets] = useState<ComboMarket[]>([])
  const [legs, setLegs] = useState<ComboLeg[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [amount, setAmount] = useState(5)

  // Fetch combo-eligible markets
  const loadMarkets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/combos')
      const data = await res.json()
      setMarkets(data.markets || [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadMarkets() }, [loadMarkets])

  // Calculate combined probability (independent events)
  const combinedProb = legs.reduce((acc, leg) => acc * (leg.probability / 100), 1) * 100
  const impliedOdds = combinedProb > 0 ? (100 / combinedProb).toFixed(1) : '—'
  const potentialPayout = combinedProb > 0 ? (amount / (combinedProb / 100)).toFixed(2) : '0'

  const addLeg = (market: ComboMarket, side: 'YES' | 'NO') => {
    // Don't add duplicate markets
    if (legs.find(l => l.market.id === market.id)) {
      toast({ type: 'error', title: 'Market already in combo', duration: 2000 })
      return
    }
    const probability = side === 'YES' ? market.probability : 100 - market.probability
    setLegs([...legs, { market, side, probability }])
    setShowPicker(false)
  }

  const removeLeg = (index: number) => {
    setLegs(legs.filter((_, i) => i !== index))
  }

  const handlePlaceCombo = async () => {
    if (!isConnected) { connect(); return }
    if (legs.length < 2) {
      toast({ type: 'error', title: 'Add at least 2 legs to build a combo', duration: 3000 })
      return
    }
    // RFQ requester API not yet available — show status
    toast({
      type: 'info',
      title: 'Combo RFQ coming soon',
      message: 'The combo requester API is in beta. Your parlay will be executable once Polymarket enables third-party combo requests.',
      duration: 6000,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (markets.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-[32px] p-6 text-center border border-transparent">
        <AlertCircle className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
        <p className="text-sm font-bold text-text-primary mb-1">No combo markets available</p>
        <p className="text-xs text-text-tertiary">Combo-eligible World Cup markets appear as matches go live</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
            <Zap size={16} className="text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Combo Builder</h3>
            <p className="text-[10px] text-text-tertiary font-medium">Build a parlay from live WC matches</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded-full uppercase tracking-wider">
          {markets.length} markets
        </span>
      </div>

      {/* Current legs */}
      <div className="space-y-2">
        <AnimatePresence>
          {legs.map((leg, i) => (
            <motion.div
              key={leg.market.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={SPRING}
              className="bg-surface-elevated rounded-[20px] p-4 flex items-center gap-3 border border-brand/10 relative"
            >
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-brand">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-text-primary line-clamp-1">{leg.market.question}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    leg.side === 'YES' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'
                  }`}>{leg.side}</span>
                  <span className="text-[10px] font-bold text-text-tertiary font-mono">{leg.probability.toFixed(0)}%</span>
                </div>
              </div>
              <button onClick={() => removeLeg(i)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-negative/10 transition-colors active:scale-90">
                <X size={12} className="text-text-tertiary" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add leg button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowPicker(true)}
          className="w-full py-4 rounded-[20px] border-2 border-dashed border-white/10 flex items-center justify-center gap-2 text-text-tertiary hover:border-brand/30 hover:text-brand transition-all active:scale-[0.98]"
        >
          <Plus size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {legs.length === 0 ? 'Add first leg' : 'Add another leg'}
          </span>
        </motion.button>
      </div>

      {/* Combo summary */}
      {legs.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="bg-surface-elevated rounded-[24px] p-5 border border-brand/20 space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-brand" />
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Combo Summary</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-wider mb-1">Legs</p>
              <p className="text-lg font-bold text-text-primary">{legs.length}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-wider mb-1">Odds</p>
              <p className="text-lg font-bold text-brand">{impliedOdds}x</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
              <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-wider mb-1">Prob</p>
              <p className="text-lg font-bold text-text-primary">{combinedProb.toFixed(1)}%</p>
            </div>
          </div>

          {/* Amount + payout */}
          <div className="flex gap-2">
            {[5, 10, 25, 50].map(a => (
              <button key={a} onClick={() => setAmount(a)}
                className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                  amount === a ? 'bg-white/10 text-white' : 'bg-white/[0.03] text-text-tertiary'
                }`}>${a}</button>
            ))}
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 flex justify-between items-center">
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Potential Payout</span>
            <span className="text-xl font-bold text-positive font-mono">${potentialPayout}</span>
          </div>

          {/* Place combo button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handlePlaceCombo}
            className="w-full py-5 bg-brand text-black rounded-[20px] text-[13px] font-bold uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all"
          >
            Place Combo — ${amount}
          </motion.button>

          <p className="text-[9px] text-text-tertiary text-center font-medium">
            Combo RFQ is in beta • All legs must resolve YES to win
          </p>
        </motion.div>
      )}

      {/* Market picker modal */}
      <AnimatePresence>
        {showPicker && (
          <ComboMarketPicker
            markets={markets}
            selectedIds={legs.map(l => l.market.id)}
            onSelect={addLeg}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// MARKET PICKER MODAL
// ============================================================
function ComboMarketPicker({
  markets,
  selectedIds,
  onSelect,
  onClose,
}: {
  markets: ComboMarket[]
  selectedIds: string[]
  onSelect: (market: ComboMarket, side: 'YES' | 'NO') => void
  onClose: () => void
}) {
  const available = markets.filter(m => !selectedIds.includes(m.id))

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={SPRING}
        className="fixed bottom-0 left-0 right-0 z-[60] max-w-lg mx-auto max-h-[75vh] flex flex-col"
      >
        <div className="liquid-glass border-t border-white/[0.04] rounded-t-[32px] p-6 pb-8 shadow-2xl bg-surface-modal/90 flex flex-col overflow-hidden">
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-4 flex-shrink-0" />
          <h3 className="text-[15px] font-bold font-display text-text-primary mb-1 flex-shrink-0">Add Combo Leg</h3>
          <p className="text-[11px] text-text-tertiary mb-4 font-medium flex-shrink-0">
            Pick a World Cup market outcome ({available.length} available)
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 -mx-2 px-2 scrollbar-hide">
            {available.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-tertiary text-sm">No more markets available</p>
              </div>
            ) : (
              available.map((market) => {
                const yesProb = Math.round(market.probability)
                const noProb = 100 - yesProb
                return (
                  <div key={market.id} className="bg-surface-elevated rounded-[20px] p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {market.image && (
                        <img src={market.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 opacity-80" />
                      )}
                      <p className="text-[12px] font-bold text-text-primary leading-snug flex-1">{market.question}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSelect(market, 'YES')}
                        className="flex-1 py-3 rounded-xl bg-positive/10 border border-positive/20 text-positive text-[12px] font-bold active:scale-95 transition-all"
                      >
                        YES {yesProb}¢
                      </button>
                      <button
                        onClick={() => onSelect(market, 'NO')}
                        className="flex-1 py-3 rounded-xl bg-negative/10 border border-negative/20 text-negative text-[12px] font-bold active:scale-95 transition-all"
                      >
                        NO {noProb}¢
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
