'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/use-wallet'
import { Bookmark, Trash2, Wallet, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getWatchlist, removeFromWatchlist } from '@/lib/supabase'
import { useToast } from '@/components/toast'

export default function WatchlistPage() {
  const { address, isConnected, connect } = useWallet()
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!address) { setLoading(false); return }
    getWatchlist(address).then(setItems).finally(() => setLoading(false))
  }, [address])

  const handleRemove = async (marketId: string) => {
    if (!address) return
    await removeFromWatchlist(address, marketId)
    setItems(items.filter(i => i.market_id !== marketId))
    toast({ type: 'success', title: 'Removed from watchlist', duration: 2000 })
  }

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center px-8 bg-bg-primary min-h-dvh">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Wallet size={32} strokeWidth={1.5} className="text-text-tertiary mx-auto mb-4" />
          <p className="text-text-secondary font-medium mb-6">Connect wallet to see your saved markets</p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={connect}
            className="px-6 py-3 bg-brand text-black rounded-[20px] text-[13px] font-bold uppercase tracking-widest shadow-lg">
            Connect
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 overflow-x-hidden">
      <header className="px-5 pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark size={20} className="text-brand" fill="currentColor" />
          <h1 className="text-2xl font-bold font-display text-text-primary tracking-tight">Watchlist</h1>
        </div>
        <span className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">{items.length} saved</span>
      </header>

      <div className="flex-1 px-5 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <div className="w-5 h-5 border-2 border-brand/20 border-t-brand rounded-full" />
            </motion.div>
          </div>
        ) : items.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <Bookmark size={36} strokeWidth={1.5} className="text-text-tertiary mx-auto mb-4" />
            <p className="text-lg font-bold font-display text-text-primary mb-1">No saved markets</p>
            <p className="text-text-tertiary text-sm">Tap the bookmark icon on any market to save it here</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 bg-surface-elevated rounded-[24px] p-4 border border-transparent shadow-sm group">
                <Link href={`/market/${item.slug}`} className="flex items-center gap-4 flex-1 min-w-0">
                  {item.image ? (
                    <div className="w-12 h-12 rounded-[14px] overflow-hidden flex-shrink-0 bg-surface">
                      <img src={item.image} alt="" className="w-full h-full object-cover opacity-90" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-[14px] bg-surface flex items-center justify-center flex-shrink-0 border border-white/[0.04]">
                      <span className="text-lg">📊</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary line-clamp-2 leading-snug">{item.question}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md">{item.category || 'OTHER'}</span>
                      <span className="text-[11px] text-text-tertiary font-medium">Saved at {Math.round(item.probability_at_save)}¢</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleRemove(item.market_id)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-negative/10 transition-colors active:scale-95 group/btn">
                    <Trash2 size={16} className="text-text-secondary group-hover/btn:text-negative transition-colors" />
                  </button>
                  <Link href={`/market/${item.slug}`} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand transition-colors group/link">
                    <ChevronRight size={16} className="text-text-secondary group-hover/link:text-black" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
