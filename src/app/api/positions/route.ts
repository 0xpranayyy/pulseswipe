import { NextRequest } from 'next/server'

/**
 * GET /api/positions?address=0x...&type=positions|history|value|closed|profile
 * 
 * Fetches user data from Polymarket Data API + Gamma API.
 * Auto-resolves EOA → proxy wallet if needed.
 */

const DATA_API = 'https://data-api.polymarket.com'
const GAMMA_API = 'https://gamma-api.polymarket.com'

async function getProxyWallet(address: string): Promise<string> {
  try {
    const r = await fetch(`${GAMMA_API}/public-profile?address=${address}`, { cache: 'no-store' })
    if (r.ok) {
      const data = await r.json()
      return data.proxyWallet || address
    }
  } catch { /* fallback */ }
  return address
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const type = request.nextUrl.searchParams.get('type') || 'positions'

  if (!address) return Response.json({ error: 'address required' }, { status: 400 })

  // Get proxy wallet (or use EOA if no proxy exists)
  const userAddr = await getProxyWallet(address)

  try {
    switch (type) {
      case 'profile': {
        const r = await fetch(`${GAMMA_API}/public-profile?address=${address}`, { cache: 'no-store' })
        const profile = r.ok ? await r.json() : null
        return Response.json({
          eoa: address,
          proxyWallet: profile?.proxyWallet || null,
          hasAccount: !!profile?.proxyWallet,
          name: profile?.name,
          pseudonym: profile?.pseudonym,
        })
      }

      case 'positions': {
        const r = await fetch(`${DATA_API}/positions?user=${userAddr}&sizeThreshold=0&limit=100&sortBy=CURRENT&sortDirection=DESC`, {
          next: { revalidate: 10 },
        })
        if (!r.ok) throw new Error(`Data API ${r.status}`)
        const positions = await r.json()
        return Response.json({ positions, proxyWallet: userAddr })
      }

      case 'history': {
        const r = await fetch(`${DATA_API}/activity?user=${userAddr}&limit=100`, {
          next: { revalidate: 15 },
        })
        if (!r.ok) throw new Error(`Data API ${r.status}`)
        const activity = await r.json()
        return Response.json({ activity, proxyWallet: userAddr })
      }

      case 'value': {
        const r = await fetch(`${DATA_API}/value?user=${userAddr}`, {
          next: { revalidate: 30 },
        })
        if (!r.ok) throw new Error(`Data API ${r.status}`)
        const valueData = await r.json()
        // API returns array — take first
        const total = Array.isArray(valueData) && valueData[0] ? valueData[0].value || 0 : 0
        return Response.json({ value: total, proxyWallet: userAddr })
      }

      case 'closed': {
        const r = await fetch(`${DATA_API}/closed-positions?user=${userAddr}&limit=100`, {
          next: { revalidate: 60 },
        })
        if (!r.ok) throw new Error(`Data API ${r.status}`)
        const closed = await r.json()
        return Response.json({ closed, proxyWallet: userAddr })
      }

      default:
        return Response.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error: any) {
    return Response.json({ error: error.message, proxyWallet: userAddr }, { status: 500 })
  }
}
