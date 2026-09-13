# PRIME TECHNICAL MASTER
## F&O Scanner • Upstox Analytics Token • Live Signal Workspace

A professional trading-terminal style dashboard for scanning NSE F&O stocks based on the **Prime Technical** framework.

---

## Overview

This application implements the Prime Technical trading framework for an NSE F&O-eligible stock universe. It analyzes:

- **LEVEL** - Yesterday High (YH) / Yesterday Low (YL)
- **REACTION** - Price reaction to key levels
- **CANDLE** - 30-minute candle structure from Upstox historical data
- **VOLUME** - Participation analysis
- **20 EMA** - Trend context
- **CONFIRMATION** - Setup validation (not yet verified)
- **SL** - Structural stop loss
- **QTY** - Position sizing placeholder

Core principle:

> **"Do not trade the line. Trade the reaction to the line."**

The scanner identifies potential setups but does **not** place orders or generate automatic trading instructions.

---

## Upstox Authentication

This build uses the **Upstox Analytics Token** directly. No OAuth redirect URL is required. Upstox describes the Analytics Token as a long-lived, read-only credential designed for analytics and market-data applications.

### Required environment variable

```env
UPSTOX_ANALYTICS_TOKEN=your_analytics_token
```

Generate the token in **Upstox Developer Apps → Analytics** and keep it server-side. The browser never receives the token itself.

The application:

1. Downloads Upstox's NSE instrument master and resolves real `NSE_EQ` instrument keys for the configured F&O-eligible symbol universe.
2. Requests current market quotes in a batched call.
3. Requests recent 30-minute historical candles per resolved instrument.
4. Derives the latest available trading session and previous-session YH/YL.
5. Runs the Prime scanner and ranks the results.

---

## Architecture

```text
UPSTOX ANALYTICS TOKEN
        ↓
UPSTOX NSE INSTRUMENT MASTER
        ↓
REAL NSE INSTRUMENT KEYS
        ↓
MARKET QUOTES + HISTORICAL CANDLES
        ↓
PRIME ENGINE
  ├── Candle Analysis
  ├── Volume Analysis
  ├── EMA Analysis
  ├── Level Detection
  └── Reaction Analysis
        ↓
SCANNER API
        ↓
DASHBOARD
```

---

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── health/              # Deployment health check
│   │   └── upstox/
│   │       ├── status/          # Analytics Token configuration status
│   │       ├── connect/         # Verifies server-side Analytics Token
│   │       ├── fno-universe/    # F&O-eligible symbol list
│   │       └── prime-scan/      # Real Upstox scanner endpoint
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── dashboard-client.tsx
│   └── dashboard/
├── domain/
│   ├── prime.ts
│   └── upstox.ts
├── engine/
│   └── prime/
├── lib/
│   ├── upstox.ts                # Analytics Token service + instrument master
│   └── market-utils.ts
└── data/
    └── fno-universe.ts
```

---

## Getting Started

### Installation

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

### Environment

Copy `.env.example` to `.env.local` and set:

```env
UPSTOX_ANALYTICS_TOKEN=your_analytics_token
```

The Analytics Token must stay server-side.

---

## Vercel Deployment

This repository is prepared for Vercel deployment.

In the Vercel project, add this environment variable for **Production**, **Preview**, and **Development** as needed:

```text
UPSTOX_ANALYTICS_TOKEN
```

No Upstox OAuth redirect URL is needed for this Analytics Token architecture.

After deployment, verify:

```text
/api/health
/api/upstox/status
```

Then use **VERIFY UPSTOX** and **SCAN NOW** in the dashboard.

---

## API Endpoints

### `GET /api/health`
Returns deployment health and whether the server has an Analytics Token configured.

### `GET /api/upstox/status`
Checks whether the Analytics Token is configured without returning the secret itself.

### `POST /api/upstox/connect`
Verifies that the server-side Analytics Token is configured.

### `GET /api/upstox/fno-universe`
Returns the configured NSE F&O-eligible symbol list.

### `GET /api/upstox/prime-scan`
Resolves real Upstox instrument keys, fetches quotes and recent historical candles, runs the Prime scanner, and returns ranked dashboard results.

---

## Scanner States

| State | Description |
|-------|-------------|
| **WATCH** | Level touched, waiting for clear reaction |
| **SETUP** | Reaction detected, pending confirmation |
| **CONFIRMED** | Setup confirmed (requires verified rule) |
| **FAKE BREAKOUT** | False breakout detected, opposite setup |
| **NO_TRADE** | No level interaction |
| **INVALID** | Does not meet criteria |

---

## Important Limitations

The following formulas/rules remain explicitly **unverified** and are not invented by the scanner:

- MID calculation
- R1/R2/R3
- S1/S2/S3
- Exact confirmation criteria

The scanner therefore keeps confirmation as a waiting stage and does not turn unverified conditions into automatic trading signals.

---

## Security

- Analytics Token is server-side only.
- Token is never returned by dashboard API responses.
- No OAuth redirect flow is used.
- Do not commit `.env`, `.env.local`, or the real token.

---

## Disclaimer

This project is for educational and research purposes. The Prime confirmation rules are not fully verified from source material. Do not use the output as investment advice or as an unattended trading system.
