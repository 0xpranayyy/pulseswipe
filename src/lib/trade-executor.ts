/**
 * Trade Executor (V2)
 * 
 * Uses @polymarket/clob-client-v2 to place orders on Polymarket.
 * The SDK accepts viem WalletClient natively.
 * 
 * Flow:
 * 1. User connects wallet (wagmi → WalletClient)
 * 2. Check onboarding status (deposit wallet, API creds, approvals)
 * 3. If not onboarded → run enableTrading() flow
 * 4. Place order with builder attribution
 * 
 * V2 Changes (April 28, 2026):
 * - Collateral: pUSD (not USDC.e)
 * - Builder code in order struct (bytes32)
 * - New exchange contracts
 * - SDK handles V2 order signing automatically
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

  if (cachedClient && cachedClient.address !== eoa) cachedClient = null
  if (cachedClient) return { client: cachedClient.client, proxyWallet: cachedClient.proxyWallet }

  // Try to find proxy/deposit wallet from Polymarket profile
  let funderAddress = await lookupProxyWallet(eoa)

  // If no proxy wallet found, the user needs onboarding
  if (!funderAddress) {
    throw new Error('NEEDS_ONBOARDING')
  }

  // Try cached API creds from localStorage
  let creds: any = null
  const cacheKey = `pulse_creds_${eoa.toLowerCase()}`
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null
    if (stored) creds = JSON.parse(stored)
  } catch {}

  if (!creds) {
    const temp = new ClobClient({ host: CLOB_HOST, chain: CHAIN_ID, signer: walletClient })
    creds = await temp.createOrDeriveApiKey()
    try { localStorage.setItem(cacheKey, JSON.stringify(creds)) } catch {}
  }

  const client = new ClobClient({
    host: CLOB_HOST,
    chain: CHAIN_ID,
    signer: walletClient,
    creds,
    signatureType: SignatureTypeV2.POLY_1271,
    funderAddress,
  })

  cachedClient = { address: eoa, client, proxyWallet: funderAddress }
  return { client, proxyWallet: funderAddress }
}

export interface TradeResult {
  success: boolean
  orderId?: string
  error?: string
}

/**
 * Buy shares at market price.
 * amount = how much pUSD to spend
 * 
 * If the user hasn't onboarded yet, throws NEEDS_ONBOARDING.
 * The caller should catch this and run enableTrading() from onboarding.ts.
 */
export async function buy(walletClient: WalletClient, tokenId: string, amount: number, negRisk = false): Promise<TradeResult> {
  // Mock markets can't be traded on the real CLOB
  if (tokenId.startsWith('mock-')) {
    return { success: false, error: 'This is a simulated market — real trading not available yet' }
  }
  try {
    const { client } = await getClient(walletClient)

    // Get market price for limit order
    let price: number
    try {
      price = await client.calculateMarketPrice(tokenId, Side.BUY, amount, OrderType.FOK)
    } catch {
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
      if (errStr.includes('allowance') || errStr.includes('balance')) {
        return { success: false, error: 'NEEDS_APPROVALS' }
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

    // Trigger onboarding if user needs setup
    if (msg === 'NEEDS_ONBOARDING') {
      return { success: false, error: 'NEEDS_ONBOARDING' }
    }

    if (msg.includes('signer') || msg.includes('API KEY') || msg.includes('L2')) {
      cachedClient = null
      try { const k = `pulse_creds_${(walletClient.account?.address || '').toLowerCase()}`; localStorage.removeItem(k) } catch {}
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
  // Mock markets can't be traded on the real CLOB
  if (tokenId.startsWith('mock-')) {
    return { success: false, error: 'This is a simulated market — real trading not available yet' }
  }
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
      const errStr = String(response.error)
      if (errStr.includes('allowance') || errStr.includes('balance')) {
        return { success: false, error: 'NEEDS_APPROVALS' }
      }
      return { success: false, error: errStr }
    }

    return { success: true, orderId: response?.orderID || 'placed' }
  } catch (e: any) {
    if (e?.message === 'NEEDS_ONBOARDING') {
      return { success: false, error: 'NEEDS_ONBOARDING' }
    }
    return { success: false, error: friendlyError(e) }
  }
}

function friendlyError(e: any): string {
  const m = String(e?.message || e || '').toLowerCase()
  const raw = String(e?.message || e || '')
  if (m.includes('needs_onboarding')) return 'NEEDS_ONBOARDING'
  if (m.includes('no_account')) return 'NEEDS_ONBOARDING'
  if (m.includes('balance') || m.includes('not enough')) return 'Not enough pUSD balance — deposit on Polymarket first'
  if (m.includes('allowance')) return 'NEEDS_APPROVALS'
  if (m.includes('maker address not allowed') || m.includes('deposit wallet')) return 'NEEDS_ONBOARDING'
  if (m.includes('rejected') || m.includes('denied')) return 'You cancelled the signature'
  if (m.includes('geoblock') || m.includes('cloudflare') || m.includes('region')) return 'Not available in your region'
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) return 'Connection error — check internet and try again'
  if (m.includes('signer') || m.includes('api key') || m.includes('l2')) return 'Session expired — try again'
  if (m.includes('no orderbook') || m.includes('no match')) return 'No liquidity — try a smaller amount or different market'
  if (m.includes('minimum') || m.includes('min order')) return 'Amount too small — try a larger amount'
  if (m.includes('price') || m.includes('invalid price')) return 'Price out of range — try again'
  if (m.includes('order_version_mismatch')) return 'Exchange version mismatch — please refresh and try again'
  // Show the actual error so user isn't clueless
  if (raw.length > 0 && raw.length < 120) return raw
  if (raw.length >= 120) return raw.slice(0, 100) + '...'
  return 'Unknown error — try again'
}

export function clearCache() { cachedClient = null }

export async function getClobClient(walletClient: any) {
  return getClient(walletClient)
}
