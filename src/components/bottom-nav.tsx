'use client'

import { motion } from 'framer-motion'
import { Home, Search, Bookmark, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SPRING = {
  type: 'spring',
  damping: 28,
  mass: 1,
  stiffness: 180,
} as const

export function BottomNav() {
  const pathname = usePathname()

  const navItemsLeft = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
  ]

  const navItemsRight = [
    { href: '/watchlist', icon: Bookmark, label: 'Saved' },
    { href: '/predictions', icon: Briefcase, label: 'Portfolio' },
  ]

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none safe-area-bottom">
      <div className="w-[92%] max-w-[420px] h-[72px] rounded-[36px] liquid-glass flex items-center justify-between px-2 relative pointer-events-auto">
        
        {/* Left Items */}
        <div className="flex items-center justify-around flex-1">
          {navItemsLeft.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className="flex items-center justify-center w-12 h-12 relative">
                <motion.div
                  initial={false}
                  animate={{ scale: isActive ? 1.15 : 1, opacity: isActive ? 1 : 0.4 }}
                  transition={SPRING}
                  className={cn("flex flex-col items-center justify-center", isActive ? "text-text-primary" : "text-text-primary")}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div 
                      layoutId="nav-indicator"
                      className="absolute -bottom-2 w-1 h-1 rounded-full bg-text-primary"
                      transition={SPRING}
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </div>

        {/* Central Pulse Button */}
        <div className="relative -top-4 flex items-center justify-center px-2">
          <Link href="/pulse">
            <motion.button
              whileTap={{ scale: 0.96 }}
              transition={SPRING}
              className="w-[68px] h-[68px] rounded-full bg-brand flex items-center justify-center glow-brand shadow-lg relative group"
            >
              <div className="absolute inset-0 rounded-full bg-brand/15 animate-pulse-brand" />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </motion.button>
          </Link>
        </div>

        {/* Right Items */}
        <div className="flex items-center justify-around flex-1">
          {navItemsRight.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className="flex items-center justify-center w-12 h-12 relative">
                <motion.div
                  initial={false}
                  animate={{ scale: isActive ? 1.15 : 1, opacity: isActive ? 1 : 0.4 }}
                  transition={SPRING}
                  className={cn("flex flex-col items-center justify-center", isActive ? "text-text-primary" : "text-text-primary")}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div 
                      layoutId="nav-indicator"
                      className="absolute -bottom-2 w-1 h-1 rounded-full bg-text-primary"
                      transition={SPRING}
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </div>

      </div>
    </nav>
  )
}
