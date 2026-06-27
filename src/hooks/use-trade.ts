'use client'

import { useCallback } from 'react'
import { useWallet } from './use-wallet'
import { useToast } from '@/components/toast'

interface TradeParams {
  tokenId: string
  amount: number
  negRisk: boolean
  side: 'BUY' | 'SELL'
  /** Number of shares (for sell only) */
  shares?: number
}

interface TradeCallbacks {
  onSigning?: () => void
  onSubmitting?: () => void
  onOnboarding?: (message: string) => void
  onSuccess?: (orderId?: string) => void
  onError?: (error: string) => void
}

/**
 * Hook that handles the full trade lifecycle including onboarding.
 * 
 * If the user hasn't set up their Polymarket account (no deposit wallet,
 * no API creds, or no approvals), it automatically runs the Enable Trading
 * flow and retries the trade.
 * 
 * Usage:
 *   const { executeTrade } = useTrade()
 *   await executeTrade({ tokenId, amount, negRisk, side: 'BUY' }, callbacks)
 */
export function useTrade() {
  const { toast, update } = useToast()

  const executeTrade = useCallback(async (
    params: TradeParams,
    callbacks?: TradeCallbacks
  ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    const { tokenId, amount, negRisk, side, shares } = params

    if (!tokenId || (side === 'BUY' && amount <= 0) || (side === 'SELL' && (!shares || shares <= 0))) {
      return { success: false, error: 'Invalid trade parameters' }
    }

    // Get wallet client
    const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
    const walletClient = await getWalletClientFromPrivy(null)
    if (!walletClient) {
      return { success: false, error: 'Wallet not connected' }
    }

    callbacks?.onSigning?.()

    // Attempt the trade
    const { buy, sell, clearCache } = await import('@/lib/trade-executor')

    let result = side === 'BUY'
      ? await buy(walletClient, tokenId, amount, negRisk)
      : await sell(walletClient, tokenId, shares!, negRisk)

    // If trade needs onboarding, run it and retry
    if (!result.success && (result.error === 'NEEDS_ONBOARDING' || result.error === 'NEEDS_APPROVALS')) {
      callbacks?.onOnboarding?.('Setting up your trading account...')

      const { enableTrading } = await import('@/lib/onboarding')

      const onboardResult = await enableTrading(walletClient, {
        onStatusChange: (_status, message) => {
          callbacks?.onOnboarding?.(message)
        },
      })

      if (!onboardResult.success) {
        callbacks?.onError?.(onboardResult.error || 'Setup failed')
        return { success: false, error: onboardResult.error || 'Setup failed' }
      }

      // Clear cached client so it re-initializes with the new deposit wallet
      clearCache()

      // Retry the trade
      callbacks?.onSubmitting?.()
      result = side === 'BUY'
        ? await buy(walletClient, tokenId, amount, negRisk)
        : await sell(walletClient, tokenId, shares!, negRisk)
    }

    if (!result.success) {
      callbacks?.onError?.(result.error || 'Trade failed')
      return { success: false, error: result.error }
    }

    callbacks?.onSuccess?.(result.orderId)
    return { success: true, orderId: result.orderId }
  }, [])

  return { executeTrade }
}
