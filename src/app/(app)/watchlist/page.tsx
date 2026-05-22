'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Bookmark, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { getWatchlist, removeFromWatchlist } from '@/lib/supabase'
import { useToast } from '@/components/toast'

export default function WatchlistPage() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
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
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Wallet size={28} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/40 text-sm mb-4">Connect wallet to see your watchlist</p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={openConnectModal}
            className="px-5 py-2.5 bg-white text-black rounded-xl text-[11px] font-bold uppercase tracking-widest">
            Connect
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col min-h-full pt-4 px-5 pb-24">

      <div className="flex items-center gap-2 mb-5">
        <Bookmark size={18} className="text-brand" />
        <h1 className="text-xl font-bold font-[family-name:var(--font-display)] tracking-tight">Watchlist</h1>
        <span className="text-[10px] text-white/30 font-bold ml-auto">{items.length} saved</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm mb-1">No saved markets</p>
          <p className="text-white/20 text-xs">Tap the bookmark icon on any card to save it here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 glass-dark premium-border rounded-2xl p-3.5">
              <Link href={`/market/${item.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                {item.image ? (
                  <img src={item.image} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 opacity-80" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0"><span>📊</span></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white/85 line-clamp-1">{item.question}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-white/30">
                    <span className="font-bold uppercase">{item.category}</span>
                    <span>Saved at {Math.round(item.probability_at_save)}¢</span>
                  </div>
                </div>
              </Link>
              <button onClick={() => handleRemove(item.market_id)}
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all active:scale-90">
                <Trash2 size={14} className="text-white/30" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
