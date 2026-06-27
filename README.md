# Pulse

Swipe-to-trade interface for [Polymarket](https://polymarket.com) prediction markets. Mobile-first PWA with real trading via the Polymarket CLOB.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS 4
- **Wallet:** RainbowKit + wagmi (Polygon)
- **Trading:** @polymarket/clob-client-v2 (direct CLOB orders)
- **Database:** Supabase (watchlist, activity log)
- **Animations:** Framer Motion

## Getting Started

```bash
# Install dependencies
npm install

# Copy env and fill in your values
cp .env.example .env

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for the full list. At minimum you need:

- `NEXT_PUBLIC_WALLETCONNECT_ID` — from [WalletConnect Cloud](https://cloud.walletconnect.com)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project
- `NEXT_PUBLIC_POLY_BUILDER_CODE` — from [Polymarket Builder settings](https://polymarket.com/settings?tab=builder)

## Database Setup

Run `supabase-schema.sql` in your Supabase SQL Editor to create the required tables (watchlist, activity, preferences).

## Architecture

```
src/
├── app/
│   ├── (app)/          # Main app pages (with bottom nav layout)
│   │   ├── page.tsx    # Swipe feed (home)
│   │   ├── search/     # Market search
│   │   ├── watchlist/  # Saved markets
│   │   ├── predictions/# Portfolio tracker
│   │   ├── pulse/      # World Cup + LP farming
│   │   ├── earn/       # LP rewards
│   │   ├── trending/   # Market movers
│   │   ├── profile/    # Account & info
│   │   └── market/[slug]/ # Market detail
│   ├── passport/       # Poly Passport (standalone)
│   └── api/            # Server routes
├── components/         # Shared UI components
├── hooks/              # React hooks (wallet)
└── lib/                # Business logic & API clients
```

## Key Features

- Tinder-style swipe cards with live market data
- Real trading (buy/sell) via Polymarket CLOB
- Portfolio tracking with PnL
- LP farming (liquidity provision rewards)
- Watchlist with Supabase persistence
- Recommendation engine (client-side preference learning)
- Share cards (OG image generation)
