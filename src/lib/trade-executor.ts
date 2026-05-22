/**
 * Trade Executor
 * 
 * Uses @polymarket/clob-client-v2 to place orders directly.
 * The SDK accepts viem WalletClient natively.
 * 
 * Flow:
 * 1. User connects wallet (wagmi → WalletClient)
 * 2. We look up their Polymarket proxy wallet
 * 3. Derive API creds (one-time)
 * 4. Place market order with builder code
 */

import { ClobClient, SignatureTypeV2, Side, OrderType } from '@polymarket/clob-client-v2'
import type { WalletClient } from 'viem'

const CLOB_HOST = 'https://clob.polymarket.com'
const CHAIN_ID = 137
const BUILDER_CODE = process.env.NEXT_PUBLIC_POLY_BUILDER_CODE || ''

let cachedClient: { address: string; client: ClobClient; proxyWallet: string } | null = null

async function lookupProxyWallet(eoa: string): Promise<string | null> {
  try {
    const r = await fetch(`https://gamma-api.polymarket.com/public-profile?address=${eoa}`)
    if (!r.ok) return null
    const d = await r.json()
    return d.proxyWallet || null
  } catch { return null }
}

async function getClient(walletClient: WalletClient): Promise<{ client: ClobClient; proxyWallet: string }> {
  const eoa = walletClient.account?.address
  if (!eoa) throw new Error('Wallet not connected')

  // Always clear cache if address changed
  if (cachedClient && cachedClient.address !== eoa) {
    cachedClient = null
  }

  if (cachedClient) {
    return { client: cachedClient.client, proxyWallet: cachedClient.proxyWallet }
  }

  // Find proxy/deposit wallet
  const proxyWallet = await lookupProxyWallet(eoa)
  if (!proxyWallet) throw new Error('NO_ACCOUNT')

  // Derive API creds — the signer MUST match the address that owns the API key
  const temp = new ClobClient({ host: CLOB_HOST, chain: CHAIN_ID, signer: walletClient })
  const creds = await temp.createOrDeriveApiKey()

  // Use POLY_1271 with deposit wallet as funder
  const client = new ClobClient({
    host: CLOB_HOST,
    chain: CHAIN_ID,
    signer: walletClient,
    creds,
    signatureType: SignatureTypeV2.POLY_1271,
    funderAddress: proxyWallet,
  })

  cachedClient = { address: eoa, client, proxyWallet }
  return { client, proxyWallet }
}

export interface TradeResult {
  success: boolean
  orderId?: string
  error?: string
}

/**
 * Buy shares at market price. Instant fill (FOK).
 * amount = how much pUSD to spend
 */
export async function buy(walletClient: WalletClient, tokenId: string, amount: number, negRisk = false): Promise<TradeResult> {
  try {
    const { client } = await getClient(walletClient)

    // Use GTC (Good Till Cancelled) limit order instead of FOK
    // FOK gets killed if not instantly filled — GTC stays on the book
    // First get the market price to set a reasonable limit
    let price: number
    try {
      price = await client.calculateMarketPrice(tokenId, Side.BUY, amount, OrderType.FOK)
    } catch {
      // If can't calculate, use midpoint
      const mid = await client.getMidpoint(tokenId)
      price = mid?.mid ? parseFloat(mid.mid) : 0.5
    }

    // Add 2% slippage tolerance to ensure fill
    const limitPrice = Math.min(0.99, price * 1.02)
    const size = amount / limitPrice

    const response = await client.createAndPostOrder(
      {
        tokenID: tokenId,
        price: limitPrice,
        size,
        side: Side.BUY,
        builderCode: BUILDER_CODE || undefined,
      },
      { negRisk },
      OrderType.GTC,
    )

    // Check for error in response
    if (response?.error) {
      const errStr = String(response.error)
      if (errStr.includes('signer') || errStr.includes('API KEY')) {
        cachedClient = null
        return { success: false, error: 'Session expired — try again' }
      }
      return { success: false, error: errStr }
    }

    const status = String(response?.status || '').toLowerCase()
    if (status.includes('reject')) {
      return { success: false, error: response?.errorMsg || 'Order rejected' }
    }

    return { 
      success: true, 
      orderId: response?.orderID || 'placed',
    }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('signer') || msg.includes('API KEY') || msg.includes('L2')) {
      cachedClient = null
      return { success: false, error: 'Session expired — try again' }
    }
    return { success: false, error: friendlyError(e) }
  }
}

/**
 * Sell shares at market price.
 * amount = number of shares to sell
 */
export async function sell(walletClient: WalletClient, tokenId: string, shares: number, negRisk = false): Promise<TradeResult> {
  try {
    const { client } = await getClient(walletClient)

    // Get market sell price
    let price: number
    try {
      price = await client.calculateMarketPrice(tokenId, Side.SELL, shares, OrderType.FOK)
    } catch {
      const mid = await client.getMidpoint(tokenId)
      price = mid?.mid ? parseFloat(mid.mid) : 0.5
    }

    // Subtract 2% slippage for sell
    const limitPrice = Math.max(0.01, price * 0.98)

    const response = await client.createAndPostOrder(
      {
        tokenID: tokenId,
        price: limitPrice,
        size: shares,
        side: Side.SELL,
        builderCode: BUILDER_CODE || undefined,
      },
      { negRisk },
      OrderType.GTC,
    )

    if (response?.error) {
      return { success: false, error: String(response.error) }
    }

    return { success: true, orderId: response?.orderID || 'placed' }
  } catch (e: any) {
    return { success: false, error: friendlyError(e) }
  }
}

function friendlyError(e: any): string {
  const m = String(e?.message || e || '').toLowerCase()
  if (m.includes('no_account')) return 'Set up your account on Polymarket first'
  if (m.includes('balance') || m.includes('not enough')) return 'Not enough balance'
  if (m.includes('allowance')) return 'Approve spending on Polymarket first'
  if (m.includes('rejected') || m.includes('denied')) return 'You cancelled'
  if (m.includes('geoblock') || m.includes('cloudflare') || m.includes('region')) return 'Not available in your region'
  if (m.includes('network') || m.includes('fetch')) return 'Connection error — try again'
  return 'Something went wrong — try again'
}

export function clearCache() { cachedClient = null }
