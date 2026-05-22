import { NextRequest } from 'next/server'
import { deployDepositWallet, getWalletNonce, executeWalletBatch, isRelayerConfigured } from '@/lib/relayer'

/**
 * POST /api/wallet
 * 
 * Wallet operations via our Relayer API access:
 * - deploy: Deploy a deposit wallet for the user (gasless)
 * - nonce: Get current wallet nonce for batch signing
 * - execute: Submit a signed wallet batch (approvals, etc.)
 */
export async function POST(request: NextRequest) {
  if (!isRelayerConfigured()) {
    return Response.json({ error: 'Relayer not configured' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'deploy': {
        const { ownerAddress } = body
        if (!ownerAddress) return Response.json({ error: 'ownerAddress required' }, { status: 400 })
        const result = await deployDepositWallet(ownerAddress)
        return Response.json({ success: true, ...result })
      }

      case 'nonce': {
        const { ownerAddress } = body
        if (!ownerAddress) return Response.json({ error: 'ownerAddress required' }, { status: 400 })
        const nonce = await getWalletNonce(ownerAddress)
        return Response.json({ nonce })
      }

      case 'execute': {
        const { ownerAddress, depositWallet, nonce, deadline, signature, calls } = body
        const result = await executeWalletBatch({ ownerAddress, depositWallet, nonce, deadline, signature, calls })
        return Response.json({ success: true, ...result })
      }

      default:
        return Response.json({ error: 'Unknown action. Use: deploy, nonce, execute' }, { status: 400 })
    }
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
