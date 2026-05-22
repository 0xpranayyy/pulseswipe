'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { polygon } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Pulse',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'demo', // WalletConnect project ID
  chains: [polygon],
  ssr: true,
})
