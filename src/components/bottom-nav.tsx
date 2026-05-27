'use client'

import { motion } from 'framer-motion'
import { Home, Search, Bookmark, PieChart, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/watchlist', icon: Bookmark, label: 'Saved' },
  { href: '/predictions', icon: PieChart, label: 'Portfolio' },
  { href: '/profile', icon: Info, label: 'Info' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="max-w-md mx-auto px-4 pb-2">
        <div className="flex items-center justify-around py-2.5 px-2 rounded-2xl glass-card border-white/[0.04]">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all',
                  isActive ? 'text-brand' : 'text-white/25 hover:text-white/40'
                )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[9px] font-semibold uppercase tracking-wider">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
