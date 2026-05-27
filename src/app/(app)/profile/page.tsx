'use client'

import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/use-wallet'

import { Wallet, LogOut, ChevronRight, Zap, Target, BarChart3 } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function AboutPage() {
  const { address, isConnected, connect, disconnect } = useWallet()
  
  

  return (
    <motion.div initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col min-h-full pt-4 px-5 pb-24">

      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
        className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight mb-6">Account</motion.h1>

      {/* Wallet */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="glass-dark premium-border rounded-3xl p-5 mb-5">
        {isConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Connected</p>
                <p className="text-[12px] font-bold text-white font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
              </div>
            </div>
            <button onClick={() => disconnect()} className="w-9 h-9 rounded-xl glass border-white/5 flex items-center justify-center active:scale-90 transition-transform">
              <LogOut size={14} className="text-white/40" />
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Wallet size={28} className="text-white/15 mx-auto mb-3" />
            <p className="text-[11px] text-white/40 mb-4">Connect to trade and view portfolio</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={connect}
              className="px-5 py-2.5 bg-white text-black rounded-xl text-[11px] font-bold uppercase tracking-widest">
              Connect Wallet
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="glass-dark premium-border rounded-3xl p-5 mb-5">
        <h3 className="text-sm font-bold font-[family-name:var(--font-display)] text-white mb-4">How it works</h3>
        <div className="space-y-4">
          {[
            { icon: Target, color: 'text-brand bg-brand/10', title: 'Swipe right to buy', desc: 'Pick Yes or No, choose your amount, confirm' },
            { icon: Zap, color: 'text-amber-400 bg-amber-400/10', title: 'Swipe left to skip', desc: 'Feed learns your preferences over time' },
            { icon: BarChart3, color: 'text-emerald-400 bg-emerald-400/10', title: 'Track your portfolio', desc: 'Live positions, PnL, and trade history' },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <Icon size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white">{item.title}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{item.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Odds explainer */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass-dark premium-border rounded-3xl p-5 mb-5">
        <h3 className="text-sm font-bold font-[family-name:var(--font-display)] text-white mb-3">Understanding odds</h3>
        <div className="space-y-2 text-[11px] text-white/40 leading-relaxed">
          <p><span className="text-white font-bold">50¢ = 50% chance.</span> The price reflects the market&apos;s belief in the outcome.</p>
          <p><span className="text-white font-bold">Buy at 30¢, win $1.</span> If you&apos;re right, each share pays out $1. Your profit is $1 minus what you paid.</p>
          <p><span className="text-white font-bold">Sell anytime.</span> Don&apos;t want to wait? Sell your position back to the market at the current price.</p>
        </div>
      </motion.div>

      {/* Brand */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-center pt-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Logo size={20} />
          <span className="text-sm font-bold font-[family-name:var(--font-display)] bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">Pulse</span>
        </div>
        <p className="text-[9px] text-white/15 uppercase tracking-widest">v1.0</p>
      </motion.div>
    </motion.div>
  )
}
