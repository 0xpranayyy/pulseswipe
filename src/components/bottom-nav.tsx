'use client'

import { motion } from 'framer-motion'
import { House, Compass, Search, TrendingUp, Info, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', icon: House, label: 'Swipe' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/watchlist', icon: Bookmark, label: 'Saved' },
  { href: '/predictions', icon: Compass, label: 'Portfolio' },
  { href: '/profile', icon: Info, label: 'About' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 p-1.5 rounded-full glass border border-white/10 shadow-2xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300',
                isActive ? 'bg-white text-black shadow-lg scale-105' : 'text-white/40 hover:text-white/60'
              )}>
              <Icon size={18} strokeWidth={2.5} />
              {isActive && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                  className="text-[11px] font-bold uppercase tracking-widest leading-none overflow-hidden">
                  {item.label}
                </motion.span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
