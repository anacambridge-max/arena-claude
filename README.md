# PRIME TECHNICAL MASTER
## F&O Scanner • Upstox Market Data • Live Signal Workspace

A professional trading-terminal style dashboard for scanning NSE F&O stocks based on the **Prime Technical** framework.

---

## 🎯 Overview

This application implements the Prime Technical trading framework for NSE Futures & Options stocks. It analyzes:

- **LEVEL** - Yesterday High (YH) / Yesterday Low (YL)
- **REACTION** - Price reaction to key levels
- **CANDLE** - 5-minute candle structure
- **VOLUME** - Participation analysis (20-period average)
- **20 EMA** - Trend context
- **CONFIRMATION** - Setup validation (not yet verified)
- **SL** - Structural stop loss
- **QTY** - Position sizing (requires account settings)

### Core Principle

> **"Do not trade the line. Trade the reaction to the line."**

The scanner identifies potential setups but does NOT generate automatic trading signals. All confirmations require manual validation.

---

## 🏗️ Architecture

```
UPSTOX API
    ↓
INSTRUMENT MASTER (F&O Universe)
    ↓
MARKET DATA (Historical / Live)
    ↓
PRIME ENGINE
    ├── Candle Analysis
    ├── Volume Analysis
    ├── EMA Analysis
    ├── Level Detection
    └── Reaction Analysis
    ↓
SCANNER
    ↓
API ENDPOINTS
    ↓
DASHBOARD
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── upstox/
│   │       ├── status/          # Connection status
│   │       ├── connect/         # Mock authentication
│   │       ├── fno-universe/    # F&O stock list
│   │       └── prime-scan/      # Main scanner endpoint
│   ├── page.tsx                 # Dashboard entry point
│   └── layout.tsx
├── components/
│   ├── dashboard-client.tsx     # Main dashboard orchestrator
│   └── dashboard/
│       ├── header.tsx
│       ├── market-status-bar.tsx
│       ├── summary-cards.tsx
│       ├── scanner-table.tsx
│       ├── state-badge.tsx
│       └── stock-detail-panel.tsx
├── domain/
│   ├── prime.ts                 # Prime framework types
│   └── upstox.ts                # Upstox API types
├── engine/
│   └── prime/
│       ├── candle.ts            # Candle analysis
│       ├── volume.ts            # Volume classification
│       ├── ema.ts               # EMA calculation
│       ├── levels.ts            # YH/YL detection
│       ├── reaction.ts          # Reaction analysis
│       └── scanner.ts           # Main scanner engine
├── lib/
│   ├── upstox.ts                # Upstox service
│   └── market-utils.ts          # Market timing (IST)
└── data/
    └── fno-universe.ts          # NSE F&O stock list
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (local or remote)
- Upstox API credentials (optional for demo mode)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure database
# Edit .env and set DATABASE_URL

# Apply database schema (if needed)
npx drizzle-kit push

# Run development server
npm run dev
```

Visit `http://localhost:3000`

---

## 🔐 Upstox Integration

### Development Mode (Mock)

The scanner works in **demo mode** without real Upstox credentials. Click "Connect Upstox" to activate mock data.

### Production Mode (Real Data)

1. Create Upstox App: https://account.upstox.com/developer/apps
2. Get API Key and API Secret
3. Add to `.env`:

```env
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_api_secret
```

**IMPORTANT**: 
- Credentials are kept **strictly server-side**
- Never expose tokens to client
- Never commit `.env` to Git

---

## 📊 Scanner States

| State | Description |
|-------|-------------|
| **WATCH** | Level touched, waiting for clear reaction |
| **SETUP** | Reaction detected, pending confirmation |
| **CONFIRMED** | Setup confirmed (requires verified rule) |
| **FAKE BREAKOUT** | False breakout detected, opposite setup |
| **NO_TRADE** | No level interaction |
| **INVALID** | Does not meet criteria |

---

## ⚠️ Important Disclaimers

### 1. Unverified Formulas

The following formulas are **NOT VERIFIED** from the Prime Technical source material:

- MID calculation
- R1, R2, R3 resistance levels
- S1, S2, S3 support levels
- Exact confirmation criteria

These are marked as "RULE NOT VERIFIED" in the UI.

### 2. No Automatic Trading Signals

This scanner does **NOT**:
- Generate automatic BUY/SELL signals
- Execute trades
- Provide investment advice
- Guarantee profitability

### 3. Educational Purpose

This tool is for:
- Learning the Prime Technical framework
- Identifying potential setups for manual analysis
- Educational and research purposes only

**NOT FOR LIVE TRADING WITHOUT PROPER VALIDATION**

---

## 🎨 Dashboard Features

### Header
- Connection status
- Refresh controls
- Last update timestamp

### Market Status Bar
- NSE market hours (09:15 - 15:30 IST)
- Current session (PRE_MARKET / OPEN / CLOSED)
- Real-time IST clock

### Summary Cards
- F&O Universe count
- Buy/Sell candidates
- Setup counts by state

### Scanner Table
Columns:
- Rank, Stock, LTP, Day %
- YH, YL, Location
- Reaction, Candle, Volume
- 20 EMA, State
- Entry, SL, Reason

### Stock Detail Panel
- Prime Pipeline (stage-by-stage)
- Level Analysis
- 5-Minute Candle breakdown
- Volume metrics
- EMA analysis
- Reaction details
- Risk calculation

---

## 🔧 API Endpoints

### `GET /api/upstox/status`
Check Upstox connection status

### `POST /api/upstox/connect`
Connect to Upstox (demo mode)

### `GET /api/upstox/fno-universe`
Get NSE F&O stock list

### `GET /api/upstox/prime-scan`
Run Prime scanner on F&O universe

Returns:
```json
{
  "status": "success",
  "data": {
    "summary": { ... },
    "marketStatus": { ... },
    "results": [ ... ],
    "generatedAt": "2024-01-01T10:00:00Z"
  }
}
```

---

## 🧪 Development

### Type Checking
```bash
npm run typecheck
```

### Build
```bash
npm run build
```

### Production
```bash
npm run start
```

---

## 📖 Prime Technical Principles

### Volume Rating
- **NORMAL**: Below 2x average
- **★ (STAR_1)**: 2x average
- **★★ (STAR_2)**: 4x average
- **★★★ (STAR_3)**: 6.5x average

### Candle Analysis
- Range, Body, Wicks
- Body % of range
- Close location (0-100)
- Bullish/Bearish/Doji classification

### Reaction Types
- **REJECTION**: Price bounces off level
- **BREAKOUT**: Price breaks through level
- **ACCEPTANCE**: Price accepts level
- **NONE**: No clear pattern

### Fake Breakout Logic
1. Price breaks level
2. Fails to hold
3. Closes back inside
4. Triggers opposite setup

---

## 🛡️ Security

- All Upstox credentials server-side only
- No tokens in client JavaScript
- No tokens in API responses
- Environment variables not committed
- `.data/` directory in `.gitignore`

---

## 📝 License

This project is for educational purposes. Not licensed for commercial use without proper validation.

---

## 🤝 Contributing

This is a private repository. For issues or enhancements, contact the repository owner.

---

## ⚡ Performance Notes

- Scanner processes 100+ F&O stocks
- Server-side aggregation (not client-side)
- Mock data for development
- Real Upstox integration requires proper rate limiting
- Consider worker process for live WebSocket feeds

---

## 📞 Support

For questions about:
- **Prime Technical Framework**: Refer to course material
- **Upstox API**: https://upstox.com/developer/api-documentation
- **Technical Issues**: Create an issue in the repository

---

**Built with Next.js 16, Tailwind CSS, TypeScript, and ❤️**
