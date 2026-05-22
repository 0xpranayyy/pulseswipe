/**
 * Polymarket Relayer — Server-side only
 * 
 * Uses our RELAYER_API_KEY to provide gasless operations for users:
 * - Deploy deposit wallets
 * - Execute signed wallet batches (approvals, etc.)
 * 
 * The user signs everything — we just relay it gaslessly.
 */

import 'server-only'

const RELAYER_URL = process.env.RELAYER_URL || 'https://relayer-v2.polymarket.com'
const RELAYER_API_KEY = process.env.RELAYER_API_KEY || ''
const DEPOSIT_WALLET_FACTORY = '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07' // Polygon mainnet

async function relayerPost(body: object) {
  const res = await fetch(`${RELAYER_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': RELAYER_API_KEY,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Relayer ${res.status}: ${text}`)
  }
  return res.json()
}

/**
 * Deploy a deposit wallet for a user (gasless — we pay gas via relayer)
 */
export async function deployDepositWallet(ownerAddress: string) {
  return relayerPost({
    type: 'WALLET-CREATE',
    from: ownerAddress,
    to: DEPOSIT_WALLET_FACTORY,
  })
}

/**
 * Execute a signed wallet batch (approvals, transfers, etc.)
 * User signs the batch, we submit it gaslessly.
 */
export async function executeWalletBatch(params: {
  ownerAddress: string
  depositWallet: string
  nonce: string
  deadline: string
  signature: string
  calls: Array<{ target: string; value: string; data: string }>
}) {
  return relayerPost({
    type: 'WALLET',
    from: params.ownerAddress,
    to: DEPOSIT_WALLET_FACTORY,
    nonce: params.nonce,
    signature: params.signature,
    depositWalletParams: {
      depositWallet: params.depositWallet,
      deadline: params.deadline,
      calls: params.calls,
    },
  })
}

/**
 * Get nonce for wallet batch signing
 */
export async function getWalletNonce(ownerAddress: string): Promise<string> {
  const res = await fetch(`${RELAYER_URL}/nonce?address=${ownerAddress}&type=WALLET`, {
    headers: { 'x-api-key': RELAYER_API_KEY },
  })
  if (!res.ok) throw new Error('Failed to get nonce')
  const data = await res.json()
  return data.nonce || '0'
}

export function isRelayerConfigured(): boolean {
  return !!RELAYER_API_KEY
}
