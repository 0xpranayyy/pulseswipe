'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

export function useWallet() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()

  return {
    address: address || null,
    isConnected,
    connect: () => openConnectModal?.(),
    disconnect,
  }
}
