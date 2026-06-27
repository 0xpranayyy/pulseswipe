import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from '@/components/providers'
import './globals.css'

// Using system fonts as specified in the CSS variables
// We'll leave Inter as a fallback variable if needed, but it's handled natively in globals.css

export const metadata: Metadata = {
  title: 'Pulse',
  description: 'Swipe to predict.',
  keywords: ['prediction market', 'predictions', 'forecasting'],
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
  openGraph: {
    title: 'Pulse',
    description: 'Swipe to predict.',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Pulse',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0b000c',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-bg-primary text-text-primary min-h-dvh overflow-x-hidden selection:bg-brand selection:text-black">
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
