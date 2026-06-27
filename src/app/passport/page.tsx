'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clipboard, Copy, Download, ExternalLink, Loader2, Orbit, Palette, Share2, Sparkles, Wand2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'

type Theme = {
  id: string
  name: string
  ink: string
  accent: string
  accent2: string
  foil: string
  stamp: string
  bg: string
}

type Profile = {
  name?: string
  username?: string
  pseudonym?: string
  displayUsernamePublic?: boolean
  proxyWallet?: string
  profileImage?: string
  profileImageOptimized?: string
  createdAt?: string
}

type LeaderboardRow = {
  proxyWallet?: string
  wallet?: string
  user?: string
  vol?: number | string
  volume?: number | string
  pnl?: number | string
  profit?: number | string
}

type Trade = {
  id?: string
  transactionHash?: string
  title?: string
  slug?: string
}

type ClosedPosition = {
  id?: string
  conditionId?: string
  market?: string
  title?: string
  question?: string
  outcome?: string
  realizedPnl?: number | string
  realizedPNL?: number | string
  pnl?: number | string
}

type PassportData = {
  inputWallet: string
  proxyWallet: string
  name: string
  memberSince: string
  pfp?: string
  volume: number
  pnl: number
  tradesSampled: number
  biggestWin?: ClosedPosition
  signaturePositions: ClosedPosition[]
}

const THEMES: Theme[] = [
  { id: 'aurora', name: 'Aurora', ink: '#f8fbff', accent: '#64f6d5', accent2: '#ff63d8', foil: '#8cf7ff', stamp: '#ffdd5a', bg: '#050511' },
  { id: 'ruby', name: 'Ruby', ink: '#fff8f8', accent: '#ff355d', accent2: '#ffd166', foil: '#ff8fab', stamp: '#ffdd5a', bg: '#100206' },
  { id: 'emerald', name: 'Emerald', ink: '#f3fff9', accent: '#38f28f', accent2: '#69b7ff', foil: '#9cffcb', stamp: '#d8ff52', bg: '#03100b' },
  { id: 'sapphire', name: 'Sapphire', ink: '#f7fbff', accent: '#4aa3ff', accent2: '#c77dff', foil: '#7de3ff', stamp: '#a9ff68', bg: '#030817' },
  { id: 'solar', name: 'Solar', ink: '#fffaf1', accent: '#ffb627', accent2: '#ff5e5b', foil: '#ffe66d', stamp: '#79ffcb', bg: '#100805' },
  { id: 'platinum', name: 'Platinum', ink: '#ffffff', accent: '#d8dee9', accent2: '#8ffcff', foil: '#ffffff', stamp: '#d7f7ff', bg: '#07090d' },
]

const sampleData: PassportData = {
  inputWallet: '0x6f...c921',
  proxyWallet: '0x6f7aA4b9E94d3E26F1a77E9891A61A2608d2c921',
  name: 'Poly Legend',
  memberSince: 'May 2024',
  volume: 1284300,
  pnl: 42750,
  tradesSampled: 200,
  biggestWin: { title: 'Election Night Swing State Basket', outcome: 'YES', realizedPnl: 18420 },
  signaturePositions: [
    { title: 'Fed Rate Decision', outcome: 'NO', realizedPnl: 18420 },
    { title: 'Championship Winner', outcome: 'YES', realizedPnl: 9210 },
    { title: 'BTC all-time high before July', outcome: 'YES', realizedPnl: -4380 },
  ],
}

const formatMoney = (value: number) => {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const abs = Math.abs(value)
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: abs >= 1000 ? 0 : 2 })}`
}

const formatVolume = (value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

const toNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const positionPnl = (position?: ClosedPosition) => toNumber(position?.realizedPnl ?? position?.realizedPNL ?? position?.pnl)

const positionTitle = (position: ClosedPosition) => position.title || position.question || position.market || 'Resolved market'

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

function readArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of ['data', 'items', 'results', 'positions', 'trades', 'leaderboard']) {
      if (Array.isArray(record[key])) return record[key] as T[]
    }
  }
  return []
}

async function fetchPassport(wallet: string, displayName: string): Promise<PassportData> {
  const gamma = 'https://gamma-api.polymarket.com'
  const data = 'https://data-api.polymarket.com'
  const cleanWallet = wallet.trim()
  const profile = await getJson<Profile>(`${gamma}/public-profile?address=${encodeURIComponent(cleanWallet)}`)
  const proxyWallet = profile.proxyWallet || cleanWallet

  const [leaderboardPayload, tradesOne, tradesTwo, closedWinners, closedLosers] = await Promise.all([
    getJson<unknown>(`${data}/v1/leaderboard?timePeriod=ALL&user=${encodeURIComponent(proxyWallet)}`).catch(() => null),
    getJson<unknown>(`${data}/trades?user=${encodeURIComponent(proxyWallet)}&limit=100&offset=0`).catch(() => []),
    getJson<unknown>(`${data}/trades?user=${encodeURIComponent(proxyWallet)}&limit=100&offset=100`).catch(() => []),
    getJson<unknown>(`${data}/v1/closed-positions?user=${encodeURIComponent(proxyWallet)}&limit=75&sortBy=REALIZEDPNL&sortDirection=DESC`).catch(() => []),
    getJson<unknown>(`${data}/v1/closed-positions?user=${encodeURIComponent(proxyWallet)}&limit=75&sortBy=REALIZEDPNL&sortDirection=ASC`).catch(() => []),
  ])

  const rows = readArray<LeaderboardRow>(leaderboardPayload)
  const row = rows.find((item) => {
    const candidate = (item.proxyWallet || item.wallet || item.user || '').toLowerCase()
    return candidate === proxyWallet.toLowerCase()
  }) || rows[0]

  const closedMap = new Map<string, ClosedPosition>()
  for (const position of [...readArray<ClosedPosition>(closedWinners), ...readArray<ClosedPosition>(closedLosers)]) {
    const key = position.id || position.conditionId || `${positionTitle(position)}-${position.outcome}-${positionPnl(position)}`
    closedMap.set(key, position)
  }

  const closedPositions = Array.from(closedMap.values())
  const biggestWin = closedPositions.filter((position) => positionPnl(position) > 0).sort((a, b) => positionPnl(b) - positionPnl(a))[0]
  const signaturePositions = closedPositions
    .sort((a, b) => Math.abs(positionPnl(b)) - Math.abs(positionPnl(a)))
    .slice(0, 3)

  const pfp = profile.profileImageOptimized || profile.profileImage
  const joined = profile.createdAt ? new Date(profile.createdAt) : null
  const memberSince = joined && !Number.isNaN(joined.getTime())
    ? joined.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'On-chain veteran'

  const profileName = profile.name && !profile.name.toLowerCase().startsWith('0x') ? profile.name : undefined
  const resolvedName = displayName.trim() || profile.username || profileName || profile.pseudonym || shortAddress(proxyWallet)

  return {
    inputWallet: cleanWallet,
    proxyWallet,
    name: resolvedName,
    memberSince,
    pfp,
    volume: toNumber(row?.vol ?? row?.volume),
    pnl: toNumber(row?.pnl ?? row?.profit),
    tradesSampled: readArray<Trade>(tradesOne).length + readArray<Trade>(tradesTwo).length,
    biggestWin,
    signaturePositions,
  }
}

function Monogram({ name, theme }: { name: string; theme: Theme }) {
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'PP'
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ background: `radial-gradient(circle at 30% 25%, ${theme.accent2}, transparent 35%), linear-gradient(135deg, ${theme.accent}, ${theme.bg})` }}>
      <span className="text-5xl font-black tracking-normal text-white drop-shadow-2xl">{initials}</span>
    </div>
  )
}

export default function PassportPage() {
  const [wallet, setWallet] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [passport, setPassport] = useState<PassportData>(sampleData)
  const [theme, setTheme] = useState(THEMES[0])
  const [isOpen, setIsOpen] = useState(false)
  const [orbitMode, setOrbitMode] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [shine, setShine] = useState({ x: 50, y: 50 })
  const cardRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<{ x: number; y: number; tilt: { x: number; y: number }; moved: boolean } | null>(null)

  const pnlPositive = passport.pnl >= 0

  const themeStyle = useMemo(() => ({
    '--passport-ink': theme.ink,
    '--passport-accent': theme.accent,
    '--passport-accent-2': theme.accent2,
    '--passport-foil': theme.foil,
    '--passport-stamp': theme.stamp,
    '--passport-bg': theme.bg,
    '--shine-x': `${shine.x}%`,
    '--shine-y': `${shine.y}%`,
  }) as React.CSSProperties, [theme, shine])

  const loadPassport = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) {
      toast.error('Enter a valid Polymarket wallet address')
      return
    }

    setLoading(true)
    try {
      const nextPassport = await fetchPassport(wallet, displayName)
      setPassport(nextPassport)
      setIsOpen(true)
      toast.success('Passport minted from live Polymarket data')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not fetch passport data')
    } finally {
      setLoading(false)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isCapturing || orbitMode || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    setShine({ x: Math.max(0, Math.min(100, px * 100)), y: Math.max(0, Math.min(100, py * 100)) })

    if (dragStart.current) {
      dragStart.current.moved = true
      setTilt({
        x: dragStart.current.tilt.x - ((event.clientY - dragStart.current.y) / rect.height) * 46,
        y: dragStart.current.tilt.y + ((event.clientX - dragStart.current.x) / rect.width) * 46,
      })
      return
    }

    setTilt({ x: (0.5 - py) * 24, y: (px - 0.5) * 30 })
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: event.clientX, y: event.clientY, tilt, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const didDrag = dragStart.current?.moved
    dragStart.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (!didDrag && !isCapturing) setIsOpen((value) => !value)
  }

  const captureCanvas = useCallback(async () => {
    if (!cardRef.current) throw new Error('Passport is not ready')
    setIsCapturing(true)
    setOrbitMode(false)
    setTilt({ x: 0, y: 0 })
    setIsOpen(true)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 3,
      useCORS: false,
      allowTaint: false,
      imageTimeout: 0,
    })
    setIsCapturing(false)
    return canvas
  }, [])

  const downloadPng = async () => {
    try {
      const canvas = await captureCanvas()
      const link = document.createElement('a')
      link.download = `poly-passport-${passport.proxyWallet.slice(0, 8)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('High-resolution PNG exported')
    } catch {
      setIsCapturing(false)
      toast.error('Export failed')
    }
  }

  const copyImage = async () => {
    try {
      const canvas = await captureCanvas()
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob || !navigator.clipboard || !('ClipboardItem' in window)) throw new Error('Clipboard image copy is not supported')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      toast.success('Passport image copied')
    } catch (error) {
      setIsCapturing(false)
      toast.error(error instanceof Error ? error.message : 'Copy failed')
    }
  }

  const copyAddress = async () => {
    await navigator.clipboard.writeText(passport.proxyWallet)
    setCopied(true)
    toast.success('Wallet copied')
    window.setTimeout(() => setCopied(false), 1400)
  }

  const shareToX = () => {
    const text = `My Poly Passport: ${passport.name} | Volume ${formatVolume(passport.volume)} | PnL ${formatMoney(passport.pnl)}`
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="min-h-dvh overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8" style={{ background: `radial-gradient(circle at 15% 10%, ${theme.accent}33, transparent 28%), radial-gradient(circle at 85% 20%, ${theme.accent2}30, transparent 30%), linear-gradient(135deg, ${theme.bg}, #020204 58%, #09070d)` }}>
      <Toaster richColors theme="dark" position="top-center" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white/60">
              <Sparkles size={14} style={{ color: theme.accent }} />
              Collector grade identity
            </div>
            <h1 className="text-4xl font-black tracking-normal text-white sm:text-6xl">Poly Passport</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 sm:text-base">
              A live Polymarket trader record rendered as a tilt-reactive holographic collectible.
            </p>
          </div>

          <form onSubmit={loadPassport} className="grid w-full gap-3 md:max-w-2xl md:grid-cols-[1.4fr_0.8fr_auto]">
            <input
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              placeholder="0x wallet address"
              className="h-12 rounded-lg border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none transition focus:border-white/35"
            />
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name"
              className="h-12 rounded-lg border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none transition focus:border-white/35"
            />
            <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-60" style={{ background: theme.accent }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
              Mint
            </button>
          </form>
        </header>

        <section className="grid items-center gap-6 lg:grid-cols-[340px_minmax(360px,1fr)_320px]">
          <aside className="order-2 space-y-4 lg:order-1">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                <Palette size={15} />
                Themes
              </div>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item)}
                    className={`h-16 rounded-lg border p-2 text-left transition ${item.id === theme.id ? 'border-white/70' : 'border-white/10 hover:border-white/35'}`}
                    style={{ background: `linear-gradient(135deg, ${item.bg}, ${item.accent}66, ${item.accent2}77)` }}
                  >
                    <span className="text-[11px] font-black text-white">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setOrbitMode((value) => !value)} className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-bold transition ${orbitMode ? 'border-white/70 bg-white text-black' : 'border-white/10 bg-white/[0.035] text-white hover:border-white/35'}`}>
                <Orbit size={17} />
                Orbit
              </button>
              <button onClick={() => setIsOpen((value) => !value)} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] text-sm font-bold text-white transition hover:border-white/35">
                <Sparkles size={17} />
                {isOpen ? 'Close' : 'Open'}
              </button>
            </div>
          </aside>

          <div className="order-1 flex justify-center [perspective:1600px] lg:order-2">
            <motion.div
              ref={cardRef}
              className={`poly-passport-card ${isOpen ? 'is-open' : 'is-closed'} ${isCapturing ? 'is-capturing' : ''}`}
              style={themeStyle}
              animate={orbitMode && !isCapturing ? { rotateX: 0, rotateY: [0, 360] } : { rotateX: isCapturing ? 0 : tilt.x, rotateY: isCapturing ? 0 : tilt.y }}
              transition={orbitMode && !isCapturing ? { duration: 8, repeat: Infinity, ease: 'linear' } : { type: 'spring', stiffness: 150, damping: 18 }}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => !dragStart.current && !orbitMode && setTilt({ x: 0, y: 0 })}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
            >
              <div className="passport-thickness" />
              <div className="passport-face passport-cover">
                <div className="passport-cover-seal">
                  <Sparkles size={54} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-white/48">Polymarket</p>
                  <h2 className="mt-4 text-5xl font-black tracking-normal text-white sm:text-6xl">PASSPORT</h2>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: theme.stamp }}>Click to open</p>
                  <p className="text-sm font-semibold text-white/52">{shortAddress(passport.proxyWallet)}</p>
                </div>
              </div>

              <div className="passport-face passport-inside">
                <div className="passport-header">
                  <div className="pfp-frame">
                    {passport.pfp && !isCapturing ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={passport.pfp} alt="" className="h-full w-full object-cover" />
                    ) : <Monogram name={passport.name} theme={theme} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: theme.stamp }}>Poly Passport</p>
                    <h2 className="mt-1 truncate text-3xl font-black tracking-normal text-white">{passport.name}</h2>
                    <p className="mt-1 text-xs font-semibold text-white/52">Member since {passport.memberSince}</p>
                  </div>
                </div>

                <div className="passport-address">
                  <span>{shortAddress(passport.proxyWallet)}</span>
                  <button onClick={(event) => { event.stopPropagation(); copyAddress() }} aria-label="Copy wallet address">
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>

                <div className="passport-stats">
                  <div>
                    <span>Lifetime Volume</span>
                    <strong>{formatVolume(passport.volume)}</strong>
                  </div>
                  <div>
                    <span>Lifetime PnL</span>
                    <strong className={pnlPositive ? 'text-emerald-300' : 'text-rose-300'}>{formatMoney(passport.pnl)}</strong>
                  </div>
                  <div>
                    <span>Trades Sampled</span>
                    <strong>{passport.tradesSampled}</strong>
                  </div>
                  <div>
                    <span>Biggest Win</span>
                    <strong className="text-emerald-300">{passport.biggestWin ? formatMoney(positionPnl(passport.biggestWin)) : '$0'}</strong>
                  </div>
                </div>

                <section className="signature-panel">
                  <div className="mb-3 flex items-center justify-between">
                    <h3>Signature Positions</h3>
                    <span>PnL impact</span>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {passport.signaturePositions.map((position, index) => {
                        const pnl = positionPnl(position)
                        return (
                          <motion.div
                            key={`${positionTitle(position)}-${index}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="position-row"
                          >
                            <div>
                              <p>{positionTitle(position)}</p>
                              <span>{position.outcome || 'Resolved'}</span>
                            </div>
                            <strong className={pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatMoney(pnl)}</strong>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>

          <aside className="order-3 space-y-3">
            <button onClick={downloadPng} className="passport-action" style={{ '--action': theme.accent } as React.CSSProperties}>
              <Download size={18} />
              Download PNG
            </button>
            <button onClick={copyImage} className="passport-action" style={{ '--action': theme.accent2 } as React.CSSProperties}>
              <Clipboard size={18} />
              Copy Image
            </button>
            <button onClick={shareToX} className="passport-action" style={{ '--action': theme.stamp } as React.CSSProperties}>
              <Share2 size={18} />
              Share to X
              <ExternalLink size={15} className="ml-auto opacity-60" />
            </button>
            <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-xs leading-5 text-white/48">
              Exports force a clean open render with zero tilt, hidden shine layers, and monogram art so the PNG is crisp and canvas-safe.
            </div>
          </aside>
        </section>

        <footer className="border-t border-white/10 pt-5 text-center text-xs font-semibold text-white/42">
          Made with ♥ by <a href="https://x.com/pronoy" target="_blank" rel="noreferrer" className="text-white/75 underline decoration-white/20 underline-offset-4 hover:text-white">pronoyy</a>
        </footer>
      </div>
    </main>
  )
}
