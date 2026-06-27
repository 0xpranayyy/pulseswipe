/**
 * Get a viem WalletClient from wagmi.
 */
import { getWalletClient } from 'wagmi/actions'
import { config } from '@/lib/wagmi-config'

export async function getConnectedWalletClient() {
  const client = await getWalletClient(config)
  if (!client) throw new Error('Wallet not connected')
  return client
}

/** @deprecated Use getConnectedWalletClient instead */
export const getWalletClientFromPrivy = (_wallet: any) => getConnectedWalletClient()
