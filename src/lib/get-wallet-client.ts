/**
 * Get a viem WalletClient from wagmi.
 */
import { getWalletClient } from 'wagmi/actions'
import { config } from '@/lib/wagmi-config'

export async function getWalletClientFromPrivy(_wallet: any) {
  const client = await getWalletClient(config)
  if (!client) throw new Error('Wallet not connected')
  return client
}
