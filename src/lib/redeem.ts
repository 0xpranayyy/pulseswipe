/**
 * Redeem resolved positions on Polymarket.
 * 
 * Calls redeemPositions() on the Conditional Tokens (CTF) contract.
 * This converts winning tokens back to pUSD.
 * 
 * For neg-risk markets, uses the Neg Risk CTF Exchange.
 * For regular markets, uses the CTF contract directly.
 */

import { encodeFunctionData, type WalletClient } from 'viem'
import { polygon } from 'viem/chains'

// Contract addresses (Polygon mainnet)
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045' as const
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' as const

// Minimal ABI for redeemPositions
const CTF_ABI = [
  {
    name: 'redeemPositions',
    type: 'function',
    inputs: [
      { name: 'collateralToken', type: 'address' },
      { name: 'parentCollectionId', type: 'bytes32' },
      { name: 'conditionId', type: 'bytes32' },
      { name: 'indexSets', type: 'uint256[]' },
    ],
    outputs: [],
  },
] as const

// pUSD collateral token
const PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as const
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const

/**
 * Redeem a resolved position.
 * conditionId: the market's condition ID (from position data)
 * negRisk: whether it's a neg-risk market
 */
export async function redeemPosition(
  walletClient: WalletClient,
  conditionId: string,
  negRisk: boolean = false
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const account = walletClient.account
    if (!account) throw new Error('No account')

    // Index sets: [1, 2] means redeem both YES (index 0 = 2^0 = 1) and NO (index 1 = 2^1 = 2)
    const indexSets = [BigInt(1), BigInt(2)]

    const data = encodeFunctionData({
      abi: CTF_ABI,
      functionName: 'redeemPositions',
      args: [
        PUSD_ADDRESS,
        ZERO_BYTES32 as `0x${string}`,
        conditionId as `0x${string}`,
        indexSets,
      ],
    })

    const contractAddress = negRisk ? NEG_RISK_ADAPTER : CTF_ADDRESS

    const hash = await walletClient.sendTransaction({
      to: contractAddress,
      data,
      chain: polygon,
      account: account,
    })

    return { success: true, hash }
  } catch (e: any) {
    return { success: false, error: e.message || 'Redeem failed' }
  }
}
