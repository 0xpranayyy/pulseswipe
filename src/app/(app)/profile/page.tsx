'use client'

import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/use-wallet'
import { Wallet, LogOut, Zap, Target, BarChart3, ChevronRight } from 'lucide-react'
import { Logo } from '@/components/logo'

export default function AboutPage() {
  const { address, isConnected, connect, disconnect } = useWallet()

  return (
    <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-24 overflow-x-hidden">
      <header className="px-5 pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="text-2xl font-bold font-display text-text-primary tracking-tight">Account</motion.h1>
      </header>

      <div className="px-5 space-y-4">
        {/* Wallet */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-surface-elevated rounded-[32px] p-5 shadow-sm border border-transparent hover:border-white/[0.04] transition-all">
          {isConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-positive/10 flex items-center justify-center border border-positive/20">
                  <div className="w-3 h-3 rounded-full bg-positive shadow-[0_0_12px_rgba(var(--positive-rgb),0.6)]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary mb-0.5">Connected</p>
                  <p className="text-[15px] font-bold text-text-primary font-mono tracking-wider">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                </div>
              </div>
              <button onClick={() => disconnect()} className="w-12 h-12 rounded-full bg-surface border border-white/[0.04] flex items-center justify-center active:scale-95 transition-all hover:bg-white/5">
                <LogOut size={16} className="text-text-secondary" />
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Wallet size={36} strokeWidth={1.5} className="text-text-tertiary mx-auto mb-4" />
              <p className="text-[14px] text-text-secondary font-medium mb-6">Connect to trade and view portfolio</p>
              <motion.button whileTap={{ scale: 0.96 }} onClick={connect}
                className="px-8 py-3.5 bg-brand text-black rounded-[20px] text-[13px] font-bold uppercase tracking-widest shadow-lg">
                Connect Wallet
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-surface-elevated rounded-[32px] p-6 shadow-sm border border-transparent hover:border-white/[0.04] transition-all">
          <h3 className="text-lg font-bold font-display text-text-primary mb-6">How it works</h3>
          <div className="space-y-6">
            {[
              { icon: Target, color: 'text-brand bg-brand/10', title: 'Find your market', desc: 'Scroll through categories to find predictions' },
              { icon: Zap, color: 'text-amber-400 bg-amber-400/10', title: 'Buy Yes or No', desc: 'Confirm trades instantly from your wallet' },
              { icon: BarChart3, color: 'text-positive bg-positive/10', title: 'Track portfolio', desc: 'Live positions, PnL, and trade history' },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-[15px] font-bold text-text-primary mb-0.5">{item.title}</p>
                    <p className="text-[12px] text-text-tertiary leading-snug">{item.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Odds explainer */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-surface-elevated rounded-[32px] p-6 shadow-sm border border-transparent hover:border-white/[0.04] transition-all">
          <h3 className="text-lg font-bold font-display text-text-primary mb-4">Understanding odds</h3>
          <div className="space-y-3 text-[13px] text-text-secondary leading-relaxed font-medium">
            <p><span className="text-text-primary font-bold">50¢ = 50% chance.</span> The price reflects the market&apos;s belief in the outcome.</p>
            <p><span className="text-text-primary font-bold">Buy at 30¢, win $1.</span> If you&apos;re right, each share pays out $1. Your profit is $1 minus what you paid.</p>
            <p><span className="text-text-primary font-bold">Sell anytime.</span> Don&apos;t want to wait? Sell your position back to the market at the current price.</p>
          </div>
        </motion.div>

        {/* Brand */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="text-center pt-8 pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Logo size={24} />
            <span className="text-lg font-bold font-display text-text-primary">Pulse</span>
          </div>
          <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold">v1.1 · Prediction Intelligence</p>
        </motion.div>
      </div>
    </div>
  )
}
