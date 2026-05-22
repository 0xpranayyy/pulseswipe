'use client'

import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto">
      <main className="flex-1 flex flex-col pb-24">{children}</main>
      <BottomNav />
    </div>
  )
}
