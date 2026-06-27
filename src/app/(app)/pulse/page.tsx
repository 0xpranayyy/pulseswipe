'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/use-wallet'
import { useToast } from '@/components/toast'
import { QuoteModal } from '@/components/quote-modal'
import { ComboBuilder } from '@/components/combo-builder'
import { formatNumber } from '@/lib/utils'
import { 
  RefreshCw, Shield, Zap, Sliders, ChevronRight, Trophy, Coins, 
  Play, Calendar, Award, ChevronDown, ChevronUp, Search, 
  CheckCircle2, AlertCircle, TrendingUp, HelpCircle
} from 'lucide-react'

type PulseTab = 'WORLDCUP' | 'LP_FARMING'
type WCTab = 'GAMES' | 'PROPS' | 'COMBOS'
type GamesSubTab = 'LIVE' | 'UPCOMING' | 'FINISHED'
type PropsSubTab = 'ALL' | 'OUTRIGHTS' | 'GROUPS' | 'PLAYERS' | 'SPECIALS'
type LPStrategy = 'DELTA_NEUTRAL' | 'YIELD_MAX' | 'SPREAD_FARM'

// Fallback genuine rewards markets to ensure LP farming tab never displays 0 pools
export default function PulsePage() {
  const { address, isConnected, connect } = useWallet()
  const { toast, update } = useToast()
  
  // Tabs State
  const [pulseTab, setPulseTab] = useState<PulseTab>('WORLDCUP')
  const [wcTab, setWcTab] = useState<WCTab>('GAMES')
  const [gamesSubTab, setGamesSubTab] = useState<GamesSubTab>('LIVE')
  const [propsSubTab, setPropsSubTab] = useState<PropsSubTab>('ALL')
  
  // Strategy State
  const [strategy, setStrategy] = useState<LPStrategy>('DELTA_NEUTRAL')
  const [capital, setCapital] = useState(1000)
  
  // Data Loading State
  const [loadingPools, setLoadingPools] = useState(true)
  const [loadingWC, setLoadingWC] = useState(true)
  
  const [rawMarkets, setRawMarkets] = useState<any[]>([])
  const [wcData, setWcData] = useState<any>({
    games: { live: [], upcoming: [], finished: [] },
    props: { outrights: [], groups: [], players: [], specials: [] }
  })
  
  // Modals & Selected states
  const [selectedLPMarket, setSelectedLPMarket] = useState<any>(null)
  const [quoteModal, setQuoteModal] = useState(false)
  const [selectedTradeMarket, setSelectedTradeMarket] = useState<any>(null)
  const [buyModal, setBuyModal] = useState(false)
  
  // Interactive UI state
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [gamesLimit, setGamesLimit] = useState(6)

  // Fetch LP Pools
  const loadPools = useCallback(async () => {
    setLoadingPools(true)
    try {
      const res = await fetch('/api/earn')
      const data = await res.json()
      setRawMarkets(data.markets || [])
    } catch {
      setRawMarkets([])
      toast({ type: 'error', title: 'Failed to load LP pools', duration: 2500 })
    } finally {
      setLoadingPools(false)
    }
  }, [toast])

  // Fetch World Cup Data
  const loadWorldCupData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingWC(true)
    try {
      const res = await fetch('/api/worldcup')
      const data = await res.json()
      if (data.games && data.props) {
        setWcData(data)
      } else {
        throw new Error('Invalid data structure')
      }
    } catch (err) {
      console.error(err)
      if (!isSilent) {
        toast({ type: 'error', title: 'Failed to sync real-time World Cup markets', duration: 3000 })
      }
    } finally {
      if (!isSilent) setLoadingWC(false)
    }
  }, [toast])

  useEffect(() => {
    loadPools()
    loadWorldCupData()

    const interval = setInterval(() => {
      loadWorldCupData(true)
    }, 15000)

    return () => clearInterval(interval)
  }, [loadPools, loadWorldCupData])

  useEffect(() => {
    setGamesLimit(6)
  }, [gamesSubTab])

  // LP Strategy Sorting Logic
  const getFilteredPools = () => {
    const pools = [...rawMarkets]
    if (strategy === 'DELTA_NEUTRAL') {
      return pools.sort((a, b) => {
        const distA = Math.abs((a.midpoint || 0.5) - 0.5)
        const distB = Math.abs((b.midpoint || 0.5) - 0.5)
        return distA - distB
      })
    } else if (strategy === 'YIELD_MAX') {
      return pools.sort((a, b) => b.rewards_daily - a.rewards_daily)
    } else {
      return pools.sort((a, b) => b.rewards_max_spread - a.rewards_max_spread)
    }
  }

  const filteredPools = getFilteredPools().slice(0, 15)

  // APR Forecast calculations
  const calculateAPRForecast = (pool: any) => {
    if (!pool) return { daily: 0, apr: 0 }
    const dailyRewards = pool.rewards_daily || 0
    const estimatedDailyEarn = dailyRewards * 0.08 * (capital / 1000)
    const annualized = estimatedDailyEarn * 365
    const aprPct = (annualized / capital) * 100
    return {
      daily: estimatedDailyEarn,
      apr: isNaN(aprPct) ? 0 : Math.min(aprPct, 450),
    }
  }

  const handleOpenBuy = (marketId: string, question: string, probability: number, clobTokenIds: string[], negRisk = false) => {
    setSelectedTradeMarket({
      id: marketId,
      question: question,
      probability: probability,
      clobTokenIds: clobTokenIds,
      negRisk: negRisk
    })
    setBuyModal(true)
  }

  const toggleExpandMatch = (id: string) => {
    setExpandedMatchId(expandedMatchId === id ? null : id)
  }

  // Filter props by category and search query
  const getFilteredProps = (category: PropsSubTab) => {
    const query = searchQuery.trim().toLowerCase()
    let list: any[] = []

    if (category === 'ALL') {
      list = [
        ...wcData.props.outrights,
        ...wcData.props.players,
        ...wcData.props.specials
      ]
    } else if (category === 'OUTRIGHTS') {
      list = wcData.props.outrights
    } else if (category === 'PLAYERS') {
      list = wcData.props.players
    } else if (category === 'SPECIALS') {
      list = wcData.props.specials
    }

    if (query) {
      list = list.filter(m => 
        m.question.toLowerCase().includes(query) || 
        (m.country && m.country.toLowerCase().includes(query))
      )
    }

    return list
  }

  const getFilteredGroups = () => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return wcData.props.groups

    return wcData.props.groups.filter((g: any) => 
      g.title.toLowerCase().includes(query) ||
      g.markets.some((m: any) => m.name.toLowerCase().includes(query))
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-bg-primary pt-safe-top pb-28 overflow-x-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 bg-brand/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <header className="px-5 pt-4 pb-4 sticky top-0 z-40 liquid-glass rounded-b-[24px] shadow-sm mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7">
            <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-brand/30 opacity-75" />
            <div className="relative rounded-full h-5 w-5 bg-brand flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-black animate-pulse-brand" />
            </div>
          </div>
          <h1 className="text-xl font-bold font-display text-text-primary tracking-tight">Pulse Terminal</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => pulseTab === 'WORLDCUP' ? loadWorldCupData(false) : loadPools()} 
            disabled={loadingWC || loadingPools} 
            className="w-9 h-9 rounded-full border border-white/[0.04] bg-surface-elevated flex items-center justify-center active:scale-95 transition-all hover:bg-white/5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-text-secondary ${(loadingWC || loadingPools) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Dual Tab Switcher */}
      <div className="px-5 mb-5">
        <div className="bg-surface-elevated rounded-[24px] p-1 flex gap-1 border border-white/[0.04] shadow-sm">
          <button onClick={() => setPulseTab('WORLDCUP')}
            className={`flex-1 py-3.5 rounded-2xl text-[12px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
              pulseTab === 'WORLDCUP' ? 'bg-white/10 text-white shadow-inner' : 'text-text-tertiary hover:text-text-secondary'
            }`}>
            <Trophy size={14} className={pulseTab === 'WORLDCUP' ? 'text-brand' : 'text-text-tertiary'} />
            <span>World Cup</span>
          </button>
          <button onClick={() => setPulseTab('LP_FARMING')}
            className={`flex-1 py-3.5 rounded-2xl text-[12px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 ${
              pulseTab === 'LP_FARMING' ? 'bg-white/10 text-white shadow-inner' : 'text-text-tertiary hover:text-text-secondary'
            }`}>
            <Coins size={14} className={pulseTab === 'LP_FARMING' ? 'text-brand' : 'text-text-tertiary'} />
            <span>LP Farming</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FIFA WORLD CUP */}
      {pulseTab === 'WORLDCUP' && (
        <div className="flex-1 flex flex-col">
          {/* Sub-Switch: Games vs Props */}
          <div className="px-5 mb-4 flex justify-between items-center">
            <div className="bg-surface/50 border border-white/[0.03] rounded-xl p-0.5 flex w-64">
              <button 
                onClick={() => setWcTab('GAMES')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  wcTab === 'GAMES' ? 'bg-white/10 text-white' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Games
              </button>
              <button 
                onClick={() => setWcTab('PROPS')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  wcTab === 'PROPS' ? 'bg-white/10 text-white' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Props
              </button>
              <button 
                onClick={() => setWcTab('COMBOS')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  wcTab === 'COMBOS' ? 'bg-brand/20 text-brand' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Combos
              </button>
            </div>
            
            {/* Volume indicator */}
            <span className="text-[10px] text-brand/80 font-mono flex items-center gap-1">
              <TrendingUp size={10} />
              REAL-TIME SYNCED
            </span>
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="px-5 mb-4">
            {wcTab === 'GAMES' ? (
              <div className="flex gap-2">
                {[
                  { id: 'LIVE', label: 'Live Now', icon: Play },
                  { id: 'UPCOMING', label: 'Upcoming', icon: Calendar },
                  { id: 'FINISHED', label: 'Finished', icon: CheckCircle2 }
                ].map(sub => {
                  const Icon = sub.icon
                  const active = gamesSubTab === sub.id
                  return (
                    <button 
                      key={sub.id} 
                      onClick={() => setGamesSubTab(sub.id as GamesSubTab)}
                      className={`flex-1 py-2 px-3 rounded-xl border text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        active ? 'bg-white text-black border-white' : 'bg-surface-elevated text-text-tertiary border-transparent'
                      }`}
                    >
                      <Icon size={12} />
                      <span>{sub.label}</span>
                    </button>
                  )
                })}
              </div>
            ) : wcTab === 'PROPS' ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'ALL', label: 'All Props' },
                  { id: 'OUTRIGHTS', label: 'Winner Outrights' },
                  { id: 'GROUPS', label: 'Groups' },
                  { id: 'PLAYERS', label: 'Players' },
                  { id: 'SPECIALS', label: 'Specials' }
                ].map(sub => {
                  const active = propsSubTab === sub.id
                  return (
                    <button 
                      key={sub.id} 
                      onClick={() => setPropsSubTab(sub.id as PropsSubTab)}
                      className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                        active ? 'bg-white text-black border-white' : 'bg-surface-elevated text-text-tertiary border-transparent'
                      }`}
                    >
                      {sub.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          {/* COMBOS TAB CONTENT */}
          {wcTab === 'COMBOS' ? (
            <div className="px-5 flex-1">
              <ComboBuilder />
            </div>
          ) : loadingWC ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24">
              <RefreshCw className="w-8 h-8 text-brand animate-spin mb-4" />
              <p className="text-xs text-text-tertiary font-mono uppercase tracking-widest">Querying Polymarket Orderbooks...</p>
            </div>
          ) : (
            <div className="px-5 space-y-4 flex-1">
              
              {/* ==================================================== */}
              {/* GAMES VIEW                                           */}
              {/* ==================================================== */}
              {wcTab === 'GAMES' && (() => {
                const activeList = gamesSubTab === 'LIVE' ? wcData.games.live : gamesSubTab === 'UPCOMING' ? wcData.games.upcoming : wcData.games.finished
                const visibleMatches = activeList.slice(0, gamesLimit)
                const hasMoreMatches = activeList.length > gamesLimit

                if (activeList.length === 0) {
                  const emptyTitle = gamesSubTab === 'LIVE' ? 'No Live Matches Trading' : gamesSubTab === 'UPCOMING' ? 'No Upcoming Matches' : 'No Finished Matches'
                  const emptyDesc = gamesSubTab === 'LIVE' 
                    ? "There are currently no real-time soccer matches active on Polymarket in play right now. Take a look at 'Upcoming' or 'Finished' to browse matches."
                    : gamesSubTab === 'UPCOMING'
                    ? "Polymarket does not currently have individual upcoming World Cup qualifier match-ups listed. Check out the 'Props' tab for outright tournament winner projections."
                    : "No settled matches found in our local sync index. Check back later for complete tournament matches history."
                  return <EmptyState title={emptyTitle} description={emptyDesc} />
                }

                // Group matches by formatted date header
                const groupedMatches: { [key: string]: any[] } = {}
                visibleMatches.forEach((match: any) => {
                  const dateHeader = formatDateHeader(match.startDate || match.endDate)
                  if (!groupedMatches[dateHeader]) {
                    groupedMatches[dateHeader] = []
                  }
                  groupedMatches[dateHeader].push(match)
                })

                return (
                  <div className="space-y-6 pb-12">
                    {Object.entries(groupedMatches).map(([dateHeader, dayMatches]) => (
                      <div key={dateHeader} className="space-y-3">
                        <div className="flex items-center gap-3 pt-4 pb-1">
                          <span className="text-[10px] font-black font-mono text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_12px_rgba(183,255,0,0.05)]">
                            {dateHeader}
                          </span>
                          <div className="h-[1px] flex-1 bg-white/[0.04]" />
                        </div>
                        {dayMatches.map((match: any) => (
                          <MatchCard 
                            key={match.id} 
                            match={match} 
                            isLive={gamesSubTab === 'LIVE'} 
                            isUpcoming={gamesSubTab === 'UPCOMING'}
                            isFinished={gamesSubTab === 'FINISHED'}
                            expanded={expandedMatchId === match.id}
                            onToggleExpand={() => toggleExpandMatch(match.id)}
                            onTrade={handleOpenBuy}
                          />
                        ))}
                      </div>
                    ))}

                    {hasMoreMatches && (
                      <button 
                        onClick={() => setGamesLimit(prev => prev + 6)}
                        className="w-full py-4 bg-surface-elevated hover:bg-white/5 border border-white/[0.04] text-text-secondary rounded-2xl text-[11px] font-bold uppercase tracking-wider active:scale-95 transition-all mt-2 flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={12} className="text-text-tertiary" />
                        <span>Load More Matches (+{activeList.length - gamesLimit} remaining)</span>
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* ==================================================== */}
              {/* PROPS VIEW                                           */}
              {/* ==================================================== */}
              {wcTab === 'PROPS' && (
                <div className="space-y-4 pb-12">
                  {/* Props Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search World Cup props & teams..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-elevated rounded-[20px] pl-10 pr-4 py-3 text-xs text-text-primary font-medium focus:outline-none focus:ring-1 focus:ring-brand/40 border border-transparent placeholder-text-tertiary transition-all"
                    />
                  </div>

                  {/* GROUP PROPS VIEW */}
                  {propsSubTab === 'GROUPS' ? (
                    getFilteredGroups().length === 0 ? (
                      <EmptyState 
                        title="No Groups Found"
                        description="No World Cup group winner markets match your active search filter."
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getFilteredGroups().map((group: any) => (
                          <div key={group.slug} className="bg-surface-elevated rounded-[24px] p-5 border border-white/[0.02] shadow-sm flex flex-col gap-3.5">
                            <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
                              <p className="text-xs font-bold text-text-primary tracking-wide">{group.title}</p>
                              <span className="text-[9px] font-bold text-brand uppercase tracking-wider bg-brand/5 px-2 py-0.5 rounded-md">
                                {group.groupName}
                              </span>
                            </div>
                            <div className="space-y-2.5">
                              {group.markets.slice(0, 5).map((m: any) => (
                                <div key={m.id} className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{getFlagEmoji(m.name)}</span>
                                    <span className="text-[13px] font-bold text-text-secondary">{m.name}</span>
                                  </div>
                                  <button 
                                    onClick={() => handleOpenBuy(m.id, m.question, m.probability, m.clobTokenIds)}
                                    className="py-1 px-3 bg-surface border border-white/[0.04] rounded-lg text-[10px] font-bold text-brand hover:border-brand/35 transition-all font-mono active:scale-95"
                                  >
                                    YES {m.probability.toFixed(1)}¢
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : propsSubTab === 'OUTRIGHTS' ? (
                    /* OUTRIGHT LEADERBOARD VIEW */
                    getFilteredProps('OUTRIGHTS').length === 0 ? (
                      <EmptyState 
                        title="No Outrights Found"
                        description="No outright winner markets match your active search filter."
                      />
                    ) : (
                      <div className="bg-surface-elevated rounded-[32px] p-5 border border-white/[0.02] shadow-sm space-y-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary pb-2 border-b border-white/[0.04]">
                          Tournament Outright Winner Projections
                        </p>
                        <div className="space-y-4">
                          {getFilteredProps('OUTRIGHTS').map((outright, index) => (
                            <div key={outright.id} className="flex flex-col gap-1.5 pb-2 border-b border-white/[0.02] last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-[10px] font-mono text-text-tertiary w-4 font-bold">#{index + 1}</span>
                                  <span className="text-sm flex-shrink-0">{getFlagEmoji(outright.country)}</span>
                                  <span className="text-[13px] font-bold text-text-primary">{outright.country || outright.question}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-brand font-mono">{outright.probability.toFixed(1)}%</span>
                                  <button 
                                    onClick={() => handleOpenBuy(outright.id, outright.question, outright.probability, outright.clobTokenIds)}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand hover:text-black transition-all active:scale-90"
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                </div>
                              </div>
                              {/* Sleek probability slider track */}
                              <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-brand rounded-full transition-all duration-500" 
                                  style={{ width: `${outright.probability}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ) : (
                    /* STANDARD PROPS FEED CARD VIEW */
                    getFilteredProps(propsSubTab).length === 0 ? (
                      <EmptyState 
                        title="No Props Available"
                        description="No matching prediction markets found. Try another category tab or search query."
                      />
                    ) : (
                      <div className="space-y-3">
                        {getFilteredProps(propsSubTab).map(prop => (
                          <motion.div 
                            key={prop.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-surface-elevated rounded-[24px] p-5 border border-white/[0.02] shadow-sm flex flex-col gap-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="text-[13px] font-bold text-text-primary leading-snug">{prop.question}</h4>
                              <span className="text-xs font-bold text-brand font-mono bg-brand/5 px-2.5 py-0.5 rounded-md flex-shrink-0">
                                {prop.probability.toFixed(0)}% YES
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleOpenBuy(prop.id, prop.question, prop.probability, prop.clobTokenIds)}
                                className="flex-1 py-3 bg-surface border border-white/[0.04] text-brand rounded-xl text-[11px] font-bold uppercase tracking-wider hover:border-brand/35 active:scale-95 transition-all"
                              >
                                BUY YES {prop.probability.toFixed(1)}¢
                              </button>
                              <button 
                                onClick={() => handleOpenBuy(prop.id, prop.question, 100 - prop.probability, [prop.clobTokenIds[1], prop.clobTokenIds[0]])}
                                className="flex-1 py-3 bg-surface border border-white/[0.04] text-text-secondary rounded-xl text-[11px] font-bold uppercase tracking-wider hover:border-white/20 active:scale-95 transition-all"
                              >
                                BUY NO {(100 - prop.probability).toFixed(1)}¢
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )
                  )}

                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* TAB 2: LP FARMING */}
      {pulseTab === 'LP_FARMING' && (
        <div className="flex-1 flex flex-col">
          {/* Hero log */}
          <div className="mx-5 mb-5 p-4 bg-black/40 border border-white/[0.04] rounded-2xl font-mono text-[10px] text-brand/80 space-y-1">
            <p className="flex items-center gap-1.5"><span className="text-text-tertiary">#</span> SYNCED: CLOB liquidity pools successfully updated.</p>
            <p className="flex items-center gap-1.5"><span className="text-text-tertiary">#</span> STRATEGY: Delta-neutral arbitrage margins active.</p>
            <p className="flex items-center gap-1.5"><span className="text-text-tertiary">#</span> GAS FEE: Polymarket transaction fees are gasless.</p>
          </div>

          {/* Strategy selector */}
          <div className="px-5 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3">LP Farming Strategy</p>
            <div className="bg-surface-elevated rounded-[20px] p-1 flex gap-1 border border-white/[0.04]">
              {[
                { id: 'DELTA_NEUTRAL', label: 'Safe Delta', icon: Shield },
                { id: 'YIELD_MAX', label: 'Max Yield', icon: Zap },
                { id: 'SPREAD_FARM', label: 'Wide Spread', icon: Sliders },
              ].map((item) => {
                const Icon = item.icon
                const active = strategy === item.id
                return (
                  <button key={item.id} onClick={() => setStrategy(item.id as LPStrategy)}
                    className={`flex-1 py-3 rounded-2xl text-[11px] font-bold tracking-wider uppercase transition-all flex flex-col items-center justify-center gap-1 ${
                      active ? 'bg-white/10 text-white shadow-inner' : 'text-text-tertiary hover:text-text-secondary'
                    }`}>
                    <Icon size={14} className={active ? 'text-brand' : 'text-text-tertiary'} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Interactive APR Forecast calculator */}
          <div className="mx-5 mb-6 p-5 bg-surface-elevated rounded-[32px] border border-transparent shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Capital Forecast Tool</p>
              <span className="text-[11px] font-bold text-brand font-mono">${capital} LP Size</span>
            </div>
            
            {/* Simple slider */}
            <input type="range" min="100" max="10000" step="100" value={capital}
              onChange={(e) => setCapital(parseInt(e.target.value))}
              className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-brand mb-5" />

            {/* Global forecast preview based on first pool */}
            {filteredPools[0] && (
              <div className="grid grid-cols-2 gap-3 bg-surface p-4 rounded-[20px]">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Est. Daily Earnings</p>
                  <p className="text-xl font-bold font-display text-brand font-mono">${calculateAPRForecast(filteredPools[0]).daily.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Target Strategy APR</p>
                  <p className="text-xl font-bold font-display text-positive font-mono">~{calculateAPRForecast(filteredPools[0]).apr.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Synced pools */}
          <div className="px-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Genuine Mapped Pools ({filteredPools.length})</p>
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand/80">Polymarket Synced</span>
            </div>

            {loadingPools ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-5 h-5 text-brand animate-spin" />
              </div>
            ) : (
              <div className="space-y-3 pb-12">
                {filteredPools.map((pool: any, i: number) => {
                  const forecast = calculateAPRForecast(pool)
                  
                  let badge = '🛡️ Delta Safe'
                  if (strategy === 'YIELD_MAX') badge = '🔥 High Incentive'
                  if (strategy === 'SPREAD_FARM') badge = '⚡ Easy Range'

                  return (
                    <motion.div key={pool.condition_id || i}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 25, delay: i * 0.03 }}
                      className="bg-surface-elevated rounded-[24px] p-4 border border-transparent hover:border-white/[0.04] transition-all shadow-sm flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                        {pool.image ? (
                          <img src={pool.image} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 opacity-80" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 text-lg">💧</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-text-primary line-clamp-1 leading-snug">{pool.question}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-bold text-brand uppercase tracking-wider bg-brand/5 px-2 py-0.5 rounded-md">{badge}</span>
                            <span className="text-[10px] text-text-tertiary font-medium">Spread: &le;{(pool.rewards_max_spread * 100).toFixed(1)}¢</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-surface p-3 rounded-2xl text-center">
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-text-tertiary">Rewards Pool</p>
                          <p className="text-xs font-bold text-text-primary mt-0.5 font-mono">${formatNumber(pool.rewards_daily)}/day</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-text-tertiary">Midpoint</p>
                          <p className="text-xs font-bold text-text-primary mt-0.5 font-mono">{(pool.midpoint * 100).toFixed(0)}¢</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-text-tertiary">Est. APR</p>
                          <p className="text-xs font-bold text-positive mt-0.5 font-mono">~{forecast.apr.toFixed(1)}%</p>
                        </div>
                      </div>

                      <button onClick={() => { setSelectedLPMarket(pool); setQuoteModal(true) }}
                        className="w-full py-3 bg-brand text-black rounded-2xl text-[11px] font-bold uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-sm hover:shadow-brand/10">
                        <span>Deploy LP Quote</span>
                        <ChevronRight size={12} strokeWidth={2.5} />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LP Quote Modal */}
      <AnimatePresence>
        {quoteModal && selectedLPMarket && (
          <QuoteModal
            market={selectedLPMarket}
            onClose={() => setQuoteModal(false)}
            onSuccess={() => { setQuoteModal(false); loadPools() }}
            toast={toast}
            update={update}
          />
        )}
      </AnimatePresence>

      {/* Trade Buy Modal */}
      <AnimatePresence>
        {buyModal && selectedTradeMarket && (
          <BuyModal
            market={selectedTradeMarket}
            onComplete={(amount, side, price) => {
              setBuyModal(false)
              if (address) {
                import('@/lib/supabase').then(({ logActivity }) => {
                  logActivity(address, {
                    type: 'buy',
                    market_id: selectedTradeMarket.id,
                    question: selectedTradeMarket.question,
                    amount,
                    side,
                    price
                  })
                }).catch(() => {})
              }
            }}
            onCancel={() => setBuyModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// MATCH CARD COMPONENT
// ============================================================
function MatchCard({ 
  match, isLive, isUpcoming, isFinished, expanded, onToggleExpand, onTrade 
}: { 
  match: any; isLive?: boolean; isUpcoming?: boolean; isFinished?: boolean;
  expanded: boolean; onToggleExpand: () => void;
  onTrade: (marketId: string, question: string, probability: number, clobTokenIds: string[]) => void;
}) {
  const { threeWay, btts, overUnder, matchProps } = match

  // State for live prices
  const [liveThreeWay, setLiveThreeWay] = useState({
    homeProb: threeWay.homeProb,
    drawProb: threeWay.drawProb,
    awayProb: threeWay.awayProb
  })
  const [liveBttsProb, setLiveBttsProb] = useState<number | null>(null)
  const [liveOverUnderProb, setLiveOverUnderProb] = useState<number | null>(null)
  const [livePropsProbs, setLivePropsProbs] = useState<Record<string, number>>({})

  // Fetch Moneyline live prices (Home, Draw, Away)
  useEffect(() => {
    if (isFinished) return

    let active = true
    const fetchLivePrices = async () => {
      try {
        const homeToken = threeWay.homeTokens?.[0]
        const drawToken = threeWay.drawTokens?.[0]
        const awayToken = threeWay.awayTokens?.[0]

        const fetchTokenPrice = async (tokenId: string) => {
          if (!tokenId || tokenId.startsWith('mock-')) return null
          try {
            const res = await fetch(`https://clob.polymarket.com/midpoint?token_id=${tokenId}`)
            if (!res.ok) return null
            const data = await res.json()
            return data.mid ? parseFloat(data.mid) * 100 : null
          } catch {
            return null
          }
        }

        const [homeProb, drawProb, awayProb] = await Promise.all([
          homeToken ? fetchTokenPrice(homeToken) : Promise.resolve(null),
          drawToken ? fetchTokenPrice(drawToken) : Promise.resolve(null),
          awayToken ? fetchTokenPrice(awayToken) : Promise.resolve(null)
        ])

        if (active) {
          setLiveThreeWay(prev => ({
            homeProb: homeProb !== null ? homeProb : prev.homeProb,
            drawProb: drawProb !== null ? drawProb : prev.drawProb,
            awayProb: awayProb !== null ? awayProb : prev.awayProb
          }))
        }
      } catch (e) {
        console.error("Error fetching match live prices:", e)
      }
    }

    fetchLivePrices()
    const interval = setInterval(fetchLivePrices, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [threeWay.homeTokens, threeWay.drawTokens, threeWay.awayTokens, isFinished])

  // Fetch expanded props live prices (BTTS, Over/Under, other props) when expanded
  useEffect(() => {
    if (isFinished || !expanded) return

    let active = true
    const fetchExpandedPrices = async () => {
      try {
        const fetchTokenPrice = async (tokenId: string) => {
          if (!tokenId || tokenId.startsWith('mock-')) return null
          try {
            const res = await fetch(`https://clob.polymarket.com/midpoint?token_id=${tokenId}`)
            if (!res.ok) return null
            const data = await res.json()
            return data.mid ? parseFloat(data.mid) * 100 : null
          } catch {
            return null
          }
        }

        const bttsToken = btts?.yesToken || btts?.clobTokenIds?.[0]
        const ouToken = overUnder?.overToken || overUnder?.clobTokenIds?.[0]

        const [bttsProb, ouProb] = await Promise.all([
          bttsToken ? fetchTokenPrice(bttsToken) : Promise.resolve(null),
          ouToken ? fetchTokenPrice(ouToken) : Promise.resolve(null)
        ])

        const propTokens = matchProps || []
        const propsResults = await Promise.all(
          propTokens.map(async (p: any) => {
            const token = p.clobTokenIds?.[0]
            const price = token ? await fetchTokenPrice(token) : null
            return { id: p.id, price }
          })
        )

        if (active) {
          if (bttsProb !== null) setLiveBttsProb(bttsProb)
          if (ouProb !== null) setLiveOverUnderProb(ouProb)
          
          const newPropsProbs: Record<string, number> = {}
          propsResults.forEach(r => {
            if (r.price !== null) {
              newPropsProbs[r.id] = r.price
            }
          })
          if (Object.keys(newPropsProbs).length > 0) {
            setLivePropsProbs(prev => ({ ...prev, ...newPropsProbs }))
          }
        }
      } catch (e) {
        console.error("Error fetching expanded prices:", e)
      }
    }

    fetchExpandedPrices()
    const interval = setInterval(fetchExpandedPrices, 6000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [expanded, isFinished, btts, overUnder, matchProps])

  const displayHomeProb = liveThreeWay.homeProb
  const displayDrawProb = liveThreeWay.drawProb
  const displayAwayProb = liveThreeWay.awayProb

  // Score display helper
  const scoreClass = isFinished ? 'text-positive font-black font-mono' : 'text-text-tertiary font-bold font-mono'

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-elevated rounded-[24px] p-5 border border-white/[0.02] shadow-sm flex flex-col gap-4"
    >
      {/* Scoreboard / Header */}
      <div className="flex items-center justify-between">
        {isLive ? (
          <span className="text-[9px] font-bold uppercase tracking-widest text-brand bg-brand/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            LIVE • {formatTimeStr(match.startDate || match.endDate)}
          </span>
        ) : isFinished ? (
          <span className="text-[9px] font-bold uppercase tracking-widest text-positive bg-positive/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
            <CheckCircle2 size={10} />
            SETTLED • {formatTimeStr(match.startDate || match.endDate)}
          </span>
        ) : (
          <span className="text-[10px] font-bold font-mono text-text-secondary">
            {formatTimeStr(match.startDate || match.endDate)}
          </span>
        )}
        <span className="text-[9px] font-mono text-text-tertiary uppercase">Vol: ${formatNumber(match.volume)}</span>
      </div>

      {/* Matchup Teams Row */}
      <div className="flex items-center justify-between py-1.5">
        <div className="flex-1 text-left min-w-0 flex items-center gap-2">
          <span className="text-xl flex-shrink-0">{getFlagEmoji(match.home)}</span>
          <p className="text-[17px] font-black text-text-primary font-display leading-tight truncate">{match.home}</p>
        </div>
        <div className="px-4 text-center flex-shrink-0">
          <p className={`text-xl ${scoreClass} tracking-widest`}>
            {isFinished ? match.score : '0 - 0'}
          </p>
        </div>
        <div className="flex-1 text-right min-w-0 flex items-center justify-end gap-2">
          <p className="text-[17px] font-black text-text-primary font-display leading-tight truncate">{match.away}</p>
          <span className="text-xl flex-shrink-0">{getFlagEmoji(match.away)}</span>
        </div>
      </div>

      {/* 3-Way Winner Moneyline */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary mb-2">Match Winner (Moneyline)</p>
        <div className="flex gap-2">
          {/* Home Win */}
          <button 
            disabled={isFinished}
            onClick={() => onTrade(
              threeWay.homeMarketId, 
              threeWay.homeQuestion, 
              displayHomeProb, 
              threeWay.homeTokens
            )}
            className={`flex-1 py-3 border rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 ${
              isFinished 
                ? (threeWay.homeProb >= 90 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-60')
                : 'bg-surface border-white/[0.04] text-text-primary hover:border-brand/30 hover:text-brand'
            }`}
          >
            {match.home.slice(0, 3)} {isFinished ? (threeWay.homeProb >= 90 ? 'WON' : '0¢') : `${displayHomeProb.toFixed(0)}¢`}
          </button>
          
          {/* Draw */}
          <button 
            disabled={isFinished}
            onClick={() => onTrade(
              threeWay.drawMarketId, 
              threeWay.drawQuestion, 
              displayDrawProb, 
              threeWay.drawTokens
            )}
            className={`flex-1 py-3 border rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 ${
              isFinished 
                ? (threeWay.drawProb >= 90 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-60')
                : 'bg-surface border-white/[0.04] text-text-primary hover:border-brand/30 hover:text-brand'
            }`}
          >
            Draw {isFinished ? (threeWay.drawProb >= 90 ? 'WON' : '0¢') : `${displayDrawProb.toFixed(0)}¢`}
          </button>

          {/* Away Win */}
          <button 
            disabled={isFinished}
            onClick={() => onTrade(
              threeWay.awayMarketId, 
              threeWay.awayQuestion, 
              displayAwayProb, 
              threeWay.awayTokens
            )}
            className={`flex-1 py-3 border rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 ${
              isFinished 
                ? (threeWay.awayProb >= 90 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-60')
                : 'bg-surface border-white/[0.04] text-text-primary hover:border-brand/30 hover:text-brand'
            }`}
          >
            {match.away.slice(0, 3)} {isFinished ? (threeWay.awayProb >= 90 ? 'WON' : '0¢') : `${displayAwayProb.toFixed(0)}¢`}
          </button>
        </div>
      </div>

      {/* Expanded Match Details Toggle */}
      {(btts || overUnder || matchProps.length > 0) && (
        <div>
          <button 
            onClick={onToggleExpand}
            className="w-full py-1 flex items-center justify-center gap-1.5 text-text-tertiary hover:text-text-secondary text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <span>{expanded ? 'Hide Match Props' : 'Show Match Props'}</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 space-y-3.5 pt-3.5 border-t border-white/[0.03] overflow-hidden"
              >
                {/* BTTS Market */}
                {btts && (() => {
                  const currentBttsProb = liveBttsProb !== null ? liveBttsProb : btts.prob
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-text-secondary">Both Teams to Score (BTTS)</span>
                      <div className="flex gap-1.5">
                        <button 
                          disabled={isFinished}
                          onClick={() => onTrade(btts.marketId, btts.question, currentBttsProb, btts.clobTokenIds)}
                          className={`py-1 px-3 border rounded-lg text-[10px] font-bold font-mono transition-all ${
                            isFinished 
                              ? (btts.prob >= 90 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-50')
                              : 'bg-surface border-white/[0.04] text-text-primary hover:border-brand/35'
                          }`}
                        >
                          YES {isFinished ? (btts.prob >= 90 ? '✓' : '✗') : `${currentBttsProb.toFixed(0)}¢`}
                        </button>
                        <button 
                          disabled={isFinished}
                          onClick={() => onTrade(btts.marketId, btts.question, 100 - currentBttsProb, [btts.clobTokenIds[1], btts.clobTokenIds[0]])}
                          className={`py-1 px-3 border rounded-lg text-[10px] font-bold font-mono transition-all ${
                            isFinished 
                              ? (btts.prob < 10 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-50')
                              : 'bg-surface border-white/[0.04] text-text-secondary hover:border-white/20'
                          }`}
                        >
                          NO {isFinished ? (btts.prob < 10 ? '✓' : '✗') : `${(100 - currentBttsProb).toFixed(0)}¢`}
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* Over/Under 2.5 goals */}
                {overUnder && (() => {
                  const currentOuProb = liveOverUnderProb !== null ? liveOverUnderProb : overUnder.prob
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-text-secondary">Total Goals Over 2.5</span>
                      <div className="flex gap-1.5">
                        <button 
                          disabled={isFinished}
                          onClick={() => onTrade(overUnder.marketId, overUnder.question, currentOuProb, overUnder.clobTokenIds)}
                          className={`py-1 px-3 border rounded-lg text-[10px] font-bold font-mono transition-all ${
                            isFinished 
                              ? (overUnder.prob >= 90 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-50')
                              : 'bg-surface border-white/[0.04] text-text-primary hover:border-brand/35'
                          }`}
                        >
                          OVER {isFinished ? (overUnder.prob >= 90 ? '✓' : '✗') : `${currentOuProb.toFixed(0)}¢`}
                        </button>
                        <button 
                          disabled={isFinished}
                          onClick={() => onTrade(overUnder.marketId, overUnder.question, 100 - currentOuProb, [overUnder.clobTokenIds[1], overUnder.clobTokenIds[0]])}
                          className={`py-1 px-3 border rounded-lg text-[10px] font-bold font-mono transition-all ${
                            isFinished 
                              ? (overUnder.prob < 10 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-50')
                              : 'bg-surface border-white/[0.04] text-text-secondary hover:border-white/20'
                          }`}
                        >
                          UNDER {isFinished ? (overUnder.prob < 10 ? '✓' : '✗') : `${(100 - currentOuProb).toFixed(0)}¢`}
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* Other Match Props */}
                {matchProps.map((p: any) => {
                  const currentPropProb = livePropsProbs[p.id] !== undefined ? livePropsProbs[p.id] : p.probability
                  return (
                    <div key={p.id} className="flex items-center justify-between border-t border-white/[0.02] pt-2 last:border-0 last:pt-0">
                      <span className="text-[10px] font-semibold text-text-secondary pr-4 line-clamp-1">{p.question}</span>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button 
                          disabled={isFinished}
                          onClick={() => onTrade(p.id, p.question, currentPropProb, p.clobTokenIds)}
                          className={`py-1 px-3 border rounded-lg text-[10px] font-bold font-mono transition-all ${
                            isFinished 
                              ? (p.probability >= 90 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-50')
                              : 'bg-surface border-white/[0.04] text-text-primary hover:border-brand/35'
                          }`}
                        >
                          YES {isFinished ? (p.probability >= 90 ? '✓' : '✗') : `${currentPropProb.toFixed(0)}¢`}
                        </button>
                        <button 
                          disabled={isFinished}
                          onClick={() => onTrade(p.id, p.question, 100 - currentPropProb, [p.clobTokenIds[1], p.clobTokenIds[0]])}
                          className={`py-1 px-3 border rounded-lg text-[10px] font-bold font-mono transition-all ${
                            isFinished 
                              ? (p.probability < 10 ? 'bg-positive/10 border-positive text-positive' : 'bg-surface/30 border-transparent text-text-tertiary opacity-50')
                              : 'bg-surface border-white/[0.04] text-text-secondary hover:border-white/20'
                          }`}
                        >
                          NO {isFinished ? (p.probability < 10 ? '✓' : '✗') : `${(100 - currentPropProb).toFixed(0)}¢`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

// ============================================================
// EMPTY STATE COMPONENT
// ============================================================
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-surface-elevated/40 border border-white/[0.02] rounded-[32px] p-8 text-center flex flex-col items-center justify-center gap-3 shadow-inner">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-text-tertiary mb-1">
        <AlertCircle size={20} />
      </div>
      <h3 className="text-sm font-bold text-text-secondary tracking-wide uppercase">{title}</h3>
      <p className="text-xs text-text-tertiary max-w-xs leading-relaxed">{description}</p>
    </div>
  )
}

// ============================================================
// BUY MODAL
// ============================================================
function BuyModal({ market, onComplete, onCancel }: { market: any; onComplete: (amount?: number, side?: 'YES' | 'NO', price?: number) => void; onCancel: () => void }) {
  const { address } = useWallet()
  const [amount, setAmount] = useState(10)
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [status, setStatus] = useState<'input' | 'signing' | 'submitting' | 'success' | 'error'>('input')
  const [errorMsg, setErrorMsg] = useState('')
  const [liveYesPrice, setLiveYesPrice] = useState<number | null>(null)
  const { toast, update } = useToast()

  const yesTokenId = market.clobTokenIds?.[0]

  useEffect(() => {
    if (!yesTokenId || yesTokenId.startsWith('mock-')) return

    let active = true
    const fetchPrice = async () => {
      try {
        const res = await fetch(`https://clob.polymarket.com/midpoint?token_id=${yesTokenId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.mid && active) {
          setLiveYesPrice(parseFloat(data.mid))
        }
      } catch (e) {
        console.error("Error fetching live price:", e)
      }
    }

    fetchPrice()
    const interval = setInterval(fetchPrice, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [yesTokenId])

  const probability = liveYesPrice !== null ? liveYesPrice * 100 : market.probability
  const price = side === 'YES' ? probability / 100 : (100 - probability) / 100
  const shares = amount / price
  const tokenId = side === 'YES' ? market.clobTokenIds?.[0] : market.clobTokenIds?.[1]

  const handleSubmit = async () => {
    if (!tokenId || amount <= 0) return
    setStatus('signing')
    const pid = toast({ type: 'pending', title: 'Sign in wallet', duration: 0 })
    try {
      const { buy, clearCache } = await import('@/lib/trade-executor')
      const { getWalletClientFromPrivy } = await import('@/lib/get-wallet-client')
      const wc = await getWalletClientFromPrivy(null)
      if (!wc) throw new Error('Wallet disconnected')
      setStatus('submitting')
      update(pid, { title: 'Placing order...' })
      let result = await buy(wc, tokenId, amount, market.negRisk || false)

      // Handle onboarding if needed
      if (!result.success && (result.error === 'NEEDS_ONBOARDING' || result.error === 'NEEDS_APPROVALS')) {
        update(pid, { title: 'Setting up trading account...' })
        const { enableTrading } = await import('@/lib/onboarding')
        const onboardResult = await enableTrading(wc, {
          onStatusChange: (_s, msg) => update(pid, { title: msg }),
        })
        if (!onboardResult.success) {
          update(pid, { type: 'error', title: 'Setup failed', message: onboardResult.error, duration: 5000 })
          setErrorMsg(onboardResult.error || 'Setup failed')
          setStatus('error')
          return
        }
        clearCache()
        update(pid, { title: 'Placing order...' })
        result = await buy(wc, tokenId, amount, market.negRisk || false)
      }

      if (!result.success) {
        update(pid, { type: 'error', title: 'Failed', message: result.error, duration: 5000 })
        setErrorMsg(result.error || '')
        setStatus('error')
        return
      }
      update(pid, { type: 'success', title: 'Done!', message: `Bought ${side} for $${amount}`, duration: 4000 })
      setStatus('success')
      try {
        navigator.vibrate?.(20)
      } catch {}
      setTimeout(() => onComplete(amount, side, price), 1000)
    } catch (e: any) {
      update(pid, { type: 'error', title: 'Failed', message: e.message, duration: 5000 })
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, mass: 1, stiffness: 180 }} className="fixed bottom-0 left-0 right-0 z-[60] max-w-lg mx-auto">
        <div className="liquid-glass border-t border-white/[0.04] rounded-t-[32px] p-6 pb-12 shadow-2xl bg-surface-modal/90">
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
          <h3 className="text-[17px] font-bold font-display text-text-primary mb-2 leading-snug">{market.question}</h3>
          <p className="text-xs text-text-tertiary mb-6 font-semibold uppercase tracking-wider">{Math.round(probability)}% Yes Probability</p>

          {/* Side pills */}
          <div className="flex gap-3 mb-6">
            <button onClick={() => setSide('YES')} disabled={status !== 'input'}
              className={`flex-1 py-4 rounded-[20px] text-[15px] font-bold transition-all ${side === 'YES' ? 'bg-brand/10 border-2 border-brand/50 text-brand' : 'bg-surface-elevated border border-transparent text-text-secondary'}`}>
              Yes {Math.round(probability)}¢
            </button>
            <button onClick={() => setSide('NO')} disabled={status !== 'input'}
              className={`flex-1 py-4 rounded-[20px] text-[15px] font-bold transition-all ${side === 'NO' ? 'bg-white/10 border-2 border-white/30 text-white' : 'bg-surface-elevated border border-transparent text-text-secondary'}`}>
              No {Math.round(100 - probability)}¢
            </button>
          </div>

          {/* Amount presets */}
          <div className="flex gap-2 mb-4">
            {[10, 50, 100, 500].map(a => (
              <button key={a} onClick={() => setAmount(a)} disabled={status !== 'input'}
                className={`flex-1 py-3 rounded-2xl text-[13px] font-bold transition-all ${amount === a ? 'bg-white/10 text-white' : 'bg-surface-elevated text-text-tertiary'}`}>${a}</button>
            ))}
          </div>
          <div className="relative mb-6">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-tertiary text-lg font-bold">$</span>
            <input type="number" value={amount} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setAmount(v) }}
              disabled={status !== 'input'} min={1}
              className="w-full bg-surface-elevated rounded-[20px] pl-10 pr-5 py-4 text-lg text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-shadow" />
          </div>

          {/* Summary */}
          <div className="bg-surface-elevated rounded-[20px] p-5 mb-6 space-y-3">
            <div className="flex justify-between text-[13px] font-medium"><span className="text-text-tertiary">You pay</span><span className="text-text-primary">${amount}</span></div>
            <div className="flex justify-between text-[13px] font-medium"><span className="text-text-tertiary">Shares</span><span className="text-text-primary">{shares.toFixed(1)}</span></div>
            <div className="flex justify-between text-[13px] font-bold"><span className="text-text-tertiary">Payout if correct</span><span className="text-positive">${shares.toFixed(2)}</span></div>
          </div>

          {status === 'error' && (
            <div className="mb-5 p-4 rounded-[20px] border border-negative/20 bg-negative/5">
              <p className="text-[13px] text-negative font-medium">{errorMsg}</p>
              <button onClick={() => setStatus('input')} className="text-[11px] text-text-tertiary mt-2 uppercase tracking-wider font-bold">Try again</button>
            </div>
          )}

          {status === 'success' ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-positive font-bold text-lg">✓ Trade Complete</p>
              </div>
              <button onClick={onCancel} className="w-full py-4 bg-surface-elevated rounded-[24px] text-text-primary text-[15px] font-bold active:scale-[0.98] transition-transform">
                Done
              </button>
            </div>
          ) : (
            <button onClick={handleSubmit} disabled={status !== 'input' || amount <= 0}
              className="w-full py-5 rounded-[24px] bg-brand text-black text-[15px] font-bold uppercase tracking-wider disabled:opacity-40 shadow-[0_4px_24px_rgba(183,255,0,0.25)] active:scale-[0.98] transition-all">
              {status === 'signing' ? 'Confirm in Wallet' : status === 'submitting' ? 'Executing Trade...' : `Confirm Trade`}
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ============================================================
// DATE & TIME HELPERS
// ============================================================
function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Tournament Matches'
  
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  
  if (d.toDateString() === today.toDateString()) {
    return `Today, ${d.toLocaleDateString(undefined, options)}`
  }
  if (d.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow, ${d.toLocaleDateString(undefined, options)}`
  }
  
  return d.toLocaleDateString(undefined, options)
}

function formatTimeStr(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '00:00'
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ============================================================
// COUNTRY FLAG HELPER
// ============================================================
function getFlagEmoji(country: string): string {
  const c = country.trim().toLowerCase()
  if (c.includes('argentina')) return '🇦🇷'
  if (c.includes('brazil')) return '🇧🇷'
  if (c.includes('portugal')) return '🇵🇹'
  if (c.includes('congo') || c.includes('cdr')) return '🇨🇩'
  if (c.includes('england')) return '🇬🇧'
  if (c.includes('croatia') || c.includes('hrv')) return '🇭🇷'
  if (c.includes('mexico')) return '🇲🇽'
  if (c.includes('korea')) return '🇰🇷'
  if (c.includes('ecuador')) return '🇪🇨'
  if (c.includes('cura')) return '🇨🇼'
  if (c.includes('uzbekistan')) return '🇺🇿'
  if (c.includes('colombia')) return '🇨🇴'
  if (c.includes('usa') || c.includes('united states')) return '🇺🇸'
  if (c.includes('australia')) return '🇦🇺'
  if (c.includes('france')) return '🇫🇷'
  if (c.includes('iraq')) return '🇮🇶'
  if (c.includes('switzerland')) return '🇨🇭'
  if (c.includes('bosnia')) return '🇧🇦'
  if (c.includes('haiti')) return '🇭🇹'
  if (c.includes('morocco')) return '🇲🇦'
  if (c.includes('spain')) return '🇪🇸'
  if (c.includes('saudi arabia') || c.includes('ksa')) return '🇸🇦'
  if (c.includes('canada')) return '🇨🇦'
  if (c.includes('qatar')) return '🇶🇦'
  if (c.includes('ghana')) return '🇬🇭'
  if (c.includes('panama')) return '🇵🇦'
  if (c.includes('austria')) return '🇦🇹'
  if (c.includes('jordan')) return '🇯🇴'
  if (c.includes('senegal')) return '🇸🇳'
  if (c.includes('algeria')) return '🇩🇿'
  if (c.includes('germany')) return '🇩🇪'
  if (c.includes('italy')) return '🇮🇹'
  if (c.includes('netherlands')) return '🇳🇱'
  if (c.includes('belgium')) return '🇧🇪'
  if (c.includes('uruguay')) return '🇺🇾'
  if (c.includes('japan')) return '🇯🇵'
  return '⚽'
}
