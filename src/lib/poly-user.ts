/**
 * Polymarket User Profile Lookup
 * 
 * Given an EOA address (from connected wallet), find the user's
 * Polymarket proxy wallet which holds their positions and trades.
 * 
 * If a proxy wallet exists, the user already has a Polymarket account
 * and can trade. If not, they need to set one up at polymarket.com first.
 */

const GAMMA_API = 'https://gamma-api.polymarket.com'

export interface PolyProfile {
  proxyWallet: string | null
  name?: string | null
  pseudonym?: string | null
  profileImage?: string | null
  createdAt?: string | null
  hasAccount: boolean
}

/**
 * Get a user's Polymarket profile and proxy wallet from their EOA address.
 */
export async function getPolyProfile(address: string): Promise<PolyProfile> {
  try {
    const res = await fetch(`${GAMMA_API}/public-profile?address=${address}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      return { proxyWallet: null, hasAccount: false }
    }
    const data = await res.json()
    return {
      proxyWallet: data.proxyWallet || null,
      name: data.name,
      pseudonym: data.pseudonym,
      profileImage: data.profileImage,
      createdAt: data.createdAt,
      hasAccount: !!data.proxyWallet,
    }
  } catch {
    return { proxyWallet: null, hasAccount: false }
  }
}
