/**
 * Polymarket Trading Onboarding (V2)
 * 
 * Handles the "Enable Trading" flow for new users:
 * 1. Deploy deposit wallet (gasless via relayer)
 * 2. Derive CLOB API credentials (signature)
 * 3. Set token approvals for V2 exchange contracts (gasless via relayer)
 * 
 * After this one-time setup, the user can trade with zero gas.
 * 
 * V2 Contracts (post April 28, 2026):
 * - Collateral: pUSD (0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb)
 * - V2 CTF Exchange: 0xe111180000d2663c0091e4f400237545b87b996b
 * - V2 NegRisk Exchange A: 0xe2222d279d744050d28e00520010520000310f59
 * - V2 NegRisk Exchange B: 0xe2222d002000ba0053cef3375333610f64600036
 * - ConditionalTokens (CTF): 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
 * - Neg Risk Adapter: 0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296
 */

import { encodeFunctionData, type WalletClient, maxUint256, type Address } from 'viem'
import { polygon } from 'viem/chains'

// ============================================================
// V2 CONTRACT ADDRESSES
// ============================================================

const PUSD = '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb' as const
const CTF_CONTRACT = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045' as const
const V2_CTF_EXCHANGE = '0xe111180000d2663c0091e4f400237545b87b996b' as const
const V2_NEGRISK_A = '0xe2222d279d744050d28e00520010520000310f59' as const
const V2_NEGRISK_B = '0xe2222d002000ba0053cef3375333610f64600036' as const
const NEGRISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296' as const

// Minimal ABIs for approval calls
const ERC20_APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ type: 'bool' }],
}] as const

const ERC1155_APPROVE_ALL_ABI = [{
  name: 'setApprovalForAll',
  type: 'function',
  inputs: [
    { name: 'operator', type: 'address' },
    { name: 'approved', type: 'bool' },
  ],
  outputs: [],
}] as const

const ERC20_ALLOWANCE_ABI = [{
  name: 'allowance',
  type: 'function',
  inputs: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
  ],
  outputs: [{ name: '', type: 'uint256' }],
}] as const

const ERC1155_IS_APPROVED_ABI = [{
  name: 'isApprovedForAll',
  type: 'function',
  inputs: [
    { name: 'account', type: 'address' },
    { name: 'operator', type: 'address' },
  ],
  outputs: [{ name: '', type: 'bool' }],
}] as const

// ============================================================
// TYPES
// ============================================================

export type OnboardingStatus = 
  | 'checking'
  | 'needs_wallet'      // No deposit wallet deployed
  | 'needs_approvals'   // Wallet exists but approvals not set
  | 'ready'             // Fully set up, can trade
  | 'error'

export interface OnboardingState {
  status: OnboardingStatus
  depositWallet: string | null
  hasApiCreds: boolean
  error?: string
}

export interface OnboardingCallbacks {
  onStatusChange: (status: OnboardingStatus, message: string) => void
}

// ============================================================
// CHECK TRADING READINESS
// ============================================================

/**
 * Check if a user is ready to trade on Polymarket.
 * Returns their current onboarding state.
 */
export async function checkTradingReadiness(eoa: string): Promise<OnboardingState> {
  try {
    // 1. Check if user has a Polymarket profile / deposit wallet
    const profileRes = await fetch(
      `https://gamma-api.polymarket.com/public-profile?address=${eoa}`,
      { cache: 'no-store' }
    )

    let depositWallet: string | null = null
    if (profileRes.ok) {
      const profile = await profileRes.json()
      depositWallet = profile.proxyWallet || null
    }

    if (!depositWallet) {
      return { status: 'needs_wallet', depositWallet: null, hasApiCreds: false }
    }

    // 2. Check if we have cached API creds
    const cacheKey = `pulse_creds_${eoa.toLowerCase()}`
    let hasApiCreds = false
    try {
      const stored = localStorage.getItem(cacheKey)
      hasApiCreds = !!stored
    } catch {}

    // 3. Check V2 approvals on-chain
    const approvalsSet = await checkV2Approvals(depositWallet)

    if (!approvalsSet) {
      return { status: 'needs_approvals', depositWallet, hasApiCreds }
    }

    return { status: 'ready', depositWallet, hasApiCreds }
  } catch (e: any) {
    return { status: 'error', depositWallet: null, hasApiCreds: false, error: e.message }
  }
}

/**
 * Check if V2 token approvals are set for the deposit wallet.
 * Checks pUSD allowance on V2 CTF Exchange as the primary indicator.
 */
async function checkV2Approvals(walletAddress: string): Promise<boolean> {
  try {
    const rpcUrl = 'https://polygon-rpc.com'
    
    // Check pUSD allowance for V2 CTF Exchange
    const allowanceData = encodeFunctionData({
      abi: ERC20_ALLOWANCE_ABI,
      functionName: 'allowance',
      args: [walletAddress as Address, V2_CTF_EXCHANGE],
    })

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: PUSD, data: allowanceData }, 'latest'],
      }),
    })

    const { result } = await res.json()
    if (!result || result === '0x' || result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return false
    }

    // If allowance > 1B USDC (essentially unlimited), approvals are set
    const allowance = BigInt(result)
    return allowance > BigInt(1_000_000_000_000) // > 1M pUSD (6 decimals)
  } catch {
    // If we can't check, assume approvals are needed
    return false
  }
}

// ============================================================
// ENABLE TRADING — FULL ONBOARDING
// ============================================================

/**
 * Run the full "Enable Trading" flow for a new user.
 * 
 * Steps:
 * 1. Deploy deposit wallet (gasless via our relayer)
 * 2. Derive CLOB API credentials (user signs EIP-712 message)
 * 3. Set V2 token approvals (gasless via our relayer)
 * 
 * The walletClient is used for signing only — no gas is spent.
 */
export async function enableTrading(
  walletClient: WalletClient,
  callbacks: OnboardingCallbacks
): Promise<{ success: boolean; depositWallet?: string; error?: string }> {
  const eoa = walletClient.account?.address
  if (!eoa) return { success: false, error: 'Wallet not connected' }

  try {
    // ============================================================
    // STEP 1: Deploy deposit wallet
    // ============================================================
    callbacks.onStatusChange('needs_wallet', 'Deploying your trading wallet...')

    // Check if wallet already exists
    let depositWallet: string | null = null
    try {
      const profileRes = await fetch(
        `https://gamma-api.polymarket.com/public-profile?address=${eoa}`,
        { cache: 'no-store' }
      )
      if (profileRes.ok) {
        const profile = await profileRes.json()
        depositWallet = profile.proxyWallet || null
      }
    } catch {}

    if (!depositWallet) {
      // Deploy via our relayer API
      const deployRes = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy', ownerAddress: eoa }),
      })

      if (!deployRes.ok) {
        const err = await deployRes.json()
        return { success: false, error: err.error || 'Failed to deploy wallet' }
      }

      const deployData = await deployRes.json()
      depositWallet = deployData.proxyAddress || deployData.depositWallet || null

      if (!depositWallet) {
        // Re-check profile — deployment might be async
        await new Promise(r => setTimeout(r, 3000))
        const recheck = await fetch(
          `https://gamma-api.polymarket.com/public-profile?address=${eoa}`,
          { cache: 'no-store' }
        )
        if (recheck.ok) {
          const d = await recheck.json()
          depositWallet = d.proxyWallet || null
        }
      }

      if (!depositWallet) {
        return { success: false, error: 'Wallet deployment pending — try again in a moment' }
      }
    }

    // ============================================================
    // STEP 2: Derive API credentials
    // ============================================================
    callbacks.onStatusChange('checking', 'Sign to generate your API keys...')

    const { ClobClient } = await import('@polymarket/clob-client-v2')
    const cacheKey = `pulse_creds_${eoa.toLowerCase()}`

    let creds: any = null
    try {
      const stored = localStorage.getItem(cacheKey)
      if (stored) creds = JSON.parse(stored)
    } catch {}

    if (!creds) {
      const tempClient = new ClobClient({
        host: 'https://clob.polymarket.com',
        chain: 137,
        signer: walletClient,
      })
      creds = await tempClient.createOrDeriveApiKey()
      try { localStorage.setItem(cacheKey, JSON.stringify(creds)) } catch {}
    }

    // ============================================================
    // STEP 3: Set V2 token approvals
    // ============================================================
    callbacks.onStatusChange('needs_approvals', 'Setting token approvals...')

    const approvalsSet = await checkV2Approvals(depositWallet)

    if (!approvalsSet) {
      const approvalResult = await setV2Approvals(walletClient, eoa, depositWallet)
      if (!approvalResult.success) {
        return { success: false, error: approvalResult.error }
      }
    }

    callbacks.onStatusChange('ready', 'Trading enabled!')
    return { success: true, depositWallet }
  } catch (e: any) {
    return { success: false, error: e.message || 'Onboarding failed' }
  }
}

// ============================================================
// SET V2 APPROVALS
// ============================================================

/**
 * Build and submit V2 token approval transactions via the relayer.
 * 
 * Approves:
 * - pUSD → V2 CTF Exchange, V2 NegRisk A, V2 NegRisk B, Neg Risk Adapter
 * - CTF (ERC-1155) → V2 CTF Exchange, V2 NegRisk A, V2 NegRisk B, Neg Risk Adapter
 */
async function setV2Approvals(
  walletClient: WalletClient,
  eoa: string,
  depositWallet: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build approval calldata
    const approvalCalls = buildApprovalCalls()

    // Get nonce from relayer
    const nonceRes = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'nonce', ownerAddress: eoa }),
    })

    if (!nonceRes.ok) {
      return { success: false, error: 'Failed to get wallet nonce' }
    }

    const { nonce } = await nonceRes.json()

    // Set deadline to 1 hour from now
    const deadline = String(Math.floor(Date.now() / 1000) + 3600)

    // Sign the batch — user signs the approval batch with their wallet
    const signature = await signWalletBatch(walletClient, {
      depositWallet,
      nonce,
      deadline,
      calls: approvalCalls,
    })

    // Submit via relayer
    const execRes = await fetch('/api/wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'execute',
        ownerAddress: eoa,
        depositWallet,
        nonce,
        deadline,
        signature,
        calls: approvalCalls,
      }),
    })

    if (!execRes.ok) {
      const err = await execRes.json()
      return { success: false, error: err.error || 'Failed to set approvals' }
    }

    return { success: true }
  } catch (e: any) {
    // If signing fails, user likely rejected the signature
    if (e.message?.includes('rejected') || e.message?.includes('denied')) {
      return { success: false, error: 'You cancelled the approval signature' }
    }
    return { success: false, error: e.message || 'Failed to set approvals' }
  }
}

/**
 * Build the array of approval calls for V2 contracts.
 */
function buildApprovalCalls(): Array<{ target: string; value: string; data: string }> {
  const calls: Array<{ target: string; value: string; data: string }> = []

  // pUSD ERC-20 approvals (unlimited allowance to exchange contracts)
  const erc20Spenders = [V2_CTF_EXCHANGE, V2_NEGRISK_A, V2_NEGRISK_B, NEGRISK_ADAPTER]
  for (const spender of erc20Spenders) {
    calls.push({
      target: PUSD,
      value: '0',
      data: encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [spender, maxUint256],
      }),
    })
  }

  // CTF ERC-1155 operator approvals (setApprovalForAll)
  const erc1155Operators = [V2_CTF_EXCHANGE, V2_NEGRISK_A, V2_NEGRISK_B, NEGRISK_ADAPTER]
  for (const operator of erc1155Operators) {
    calls.push({
      target: CTF_CONTRACT,
      value: '0',
      data: encodeFunctionData({
        abi: ERC1155_APPROVE_ALL_ABI,
        functionName: 'setApprovalForAll',
        args: [operator, true],
      }),
    })
  }

  return calls
}

/**
 * Sign a wallet batch operation using EIP-712 typed data.
 * This is what the deposit wallet's execute function expects.
 */
async function signWalletBatch(
  walletClient: WalletClient,
  params: {
    depositWallet: string
    nonce: string
    deadline: string
    calls: Array<{ target: string; value: string; data: string }>
  }
): Promise<string> {
  const account = walletClient.account
  if (!account) throw new Error('No account')

  // EIP-712 domain for deposit wallet batch execution
  const domain = {
    name: 'DepositWallet',
    version: '1',
    chainId: 137,
    verifyingContract: params.depositWallet as `0x${string}`,
  }

  const types = {
    Execute: [
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'calls', type: 'Call[]' },
    ],
    Call: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
  }

  const message = {
    nonce: BigInt(params.nonce),
    deadline: BigInt(params.deadline),
    calls: params.calls.map(c => ({
      target: c.target as `0x${string}`,
      value: BigInt(c.value),
      data: c.data as `0x${string}`,
    })),
  }

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: 'Execute',
    message,
  })

  return signature
}

// ============================================================
// TRADING STATUS (for UI)
// ============================================================

const ONBOARDING_COMPLETE_KEY = 'pulse_onboarded_v2'

/**
 * Check if this wallet has completed onboarding before (cached locally).
 */
export function hasCompletedOnboarding(eoa: string): boolean {
  try {
    const key = `${ONBOARDING_COMPLETE_KEY}_${eoa.toLowerCase()}`
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

/**
 * Mark onboarding as complete for this wallet.
 */
export function markOnboardingComplete(eoa: string): void {
  try {
    const key = `${ONBOARDING_COMPLETE_KEY}_${eoa.toLowerCase()}`
    localStorage.setItem(key, '1')
  } catch {}
}
