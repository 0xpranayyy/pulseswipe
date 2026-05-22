# 🎯 SwipeMarket

**Tinder meets TikTok meets Polymarket.**

A mobile-first prediction market experience where users discover markets by swiping. Swipe right for YES, swipe left for NO. Earn XP, build streaks, and flex your prediction accuracy.

![SwipeMarket](https://img.shields.io/badge/SwipeMarket-Predict%20the%20Future-8b5cf6?style=for-the-badge)

---

## ✨ Features

### Core Experience
- **Swipe Feed** — Infinite swipeable prediction market cards with gesture physics
- **Paper Trading** — $10,000 virtual balance to practice with zero risk
- **AI Commentary** — Humorous AI-generated reactions to your predictions
- **XP & Levels** — Gamified progression system with streaks

### Social
- Leaderboards with personality archetypes
- Prediction streaks and accuracy tracking
- Shareable prediction cards

### Market Data
- Live market probabilities from Polymarket API
- Sparkline charts and trend indicators
- Category filtering (Crypto, Sports, Politics, AI, Internet Culture, Memes)

### Personality System
- 🔮 **Oracle** — High accuracy predictor
- 🎰 **Degen** — High risk, high reward
- 🔄 **Contrarian** — Always bets against the crowd
- 🌪️ **Chaos Trader** — Pure vibes, no strategy
- 🐸 **Meme Prophet** — Predicts culture before it happens

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| State | Zustand (persisted) |
| Database | PostgreSQL + Prisma ORM |
| Icons | Lucide React |
| Market Data | Polymarket CLOB API |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (optional — app works with mock data)

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd polytinder

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client (optional, for database features)
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or in mobile device mode.

### Database Setup (Optional)

The app works fully with mock data out of the box. To enable database features:

```bash
# Start PostgreSQL locally
# Update DATABASE_URL in .env

# Push schema to database
npx prisma db push

# Seed with sample data
npx prisma db seed
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (app)/              # Main app route group
│   │   ├── page.tsx        # Swipe feed (home)
│   │   ├── profile/        # User profile
│   │   ├── portfolio/      # Paper trading portfolio
│   │   ├── leaderboard/    # Rankings
│   │   └── notifications/  # Alerts
│   ├── api/                # API routes
│   │   ├── markets/        # Market endpoints
│   │   ├── trade/          # Trade execution
│   │   ├── user/           # User management
│   │   └── leaderboard/    # Rankings
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles + Tailwind
├── components/
│   ├── ui/                 # Reusable UI primitives
│   │   ├── sparkline.tsx
│   │   ├── probability-bar.tsx
│   │   ├── category-badge.tsx
│   │   └── glow-button.tsx
│   ├── swipe-deck.tsx      # Main swipe interface
│   ├── market-card.tsx     # Prediction market card
│   ├── swipe-overlay.tsx   # YES/NO overlay
│   ├── trade-modal.tsx     # Trade execution modal
│   ├── category-filter.tsx # Category pills
│   ├── header.tsx          # App header with stats
│   ├── bottom-nav.tsx      # Bottom navigation
│   ├── onboarding.tsx      # Onboarding flow
│   └── ai-commentary-toast.tsx
├── lib/
│   ├── store.ts            # Zustand state management
│   ├── mock-data.ts        # Mock market data
│   ├── polymarket.ts       # Polymarket API integration
│   ├── prisma.ts           # Database client
│   └── utils.ts            # Utility functions
└── prisma/
    └── schema.prisma       # Database schema
```

---

## 🎨 Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#0a0a0f` | App background |
| Surface | `#111118` | Cards, modals |
| Violet | `#8b5cf6` | Primary accent |
| Purple | `#a855f7` | Gradients |
| Emerald | `#10b981` | YES / positive |
| Rose | `#f43f5e` | NO / negative |
| Cyan | `#06b6d4` | AI / tech |

### Typography
- **Font**: Inter (variable weight)
- **Headings**: Font-black (900), tight leading
- **Body**: Regular (400), relaxed leading
- **Micro**: 10-11px uppercase tracking-wider for labels

### Animation Guidelines
- **Swipe physics**: Spring damping 20, stiffness 300
- **Card transitions**: 300ms ease-out
- **Overlays**: Spring with damping 25
- **Micro-interactions**: whileTap scale 0.95-0.98
- **Page transitions**: Fade + slide 20px

---

## 🔌 Polymarket Integration

The app is architected to connect to Polymarket's CLOB API:

```typescript
// src/lib/polymarket.ts
import { fetchPolymarketEvents } from '@/lib/polymarket'

// Fetch live markets
const events = await fetchPolymarketEvents(20, 0)

// Transform to app format
const markets = events.flatMap(e => 
  e.markets.map(transformPolymarketToAppMarket)
)
```

### API Endpoints Used
- `GET /events` — List active prediction events
- `GET /markets/:id` — Single market details
- `GET /book?token_id=` — Order book data

### Going Live
1. Set `POLYMARKET_API_KEY` and `POLYMARKET_SECRET` in `.env`
2. Integrate wallet connection (RainbowKit + Wagmi ready)
3. Switch from paper trading to real CLOB orders
4. Deploy on Polygon network

---

## 💰 Monetization Ideas

1. **Premium Archetypes** — Unlock rare personality types
2. **Pro Analytics** — Advanced charts, AI predictions
3. **Social Features** — Prediction battles, group bets
4. **Referral System** — Earn XP for inviting friends
5. **Sponsored Markets** — Brands create custom markets
6. **NFT Prediction Cards** — Mint your best predictions

---

## 🚀 Viral Growth Mechanics

1. **Shareable Cards** — Beautiful prediction cards for social media
2. **Streak System** — Daily engagement through streak maintenance
3. **Leaderboards** — Competitive ranking drives retention
4. **AI Roasts** — Funny commentary users want to screenshot
5. **Personality Quiz** — Shareable archetype results
6. **Prediction Battles** — Challenge friends head-to-head

---

## 📱 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["npm", "start"]
```

### Environment Variables for Production
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis for caching
- `NEXT_PUBLIC_POLYMARKET_API_URL` — Polymarket API
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — WalletConnect
- `NEXTAUTH_SECRET` — Auth secret

---

## 📄 License

MIT

---

Built with 🎯 by the SwipeMarket team.
