# 🚀 Quick Start Guide
## Prime Technical Master F&O Scanner

---

## 📋 Prerequisites

- Node.js 18 or higher
- Upstox Developer App with an **Analytics Token**

---

## ⚡ Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Set the server-side token:

```env
UPSTOX_ANALYTICS_TOKEN=your_analytics_token_here
```

Generate it from **Upstox Developer Apps → Analytics → Generate Token**.

### 3. Run Development Server
```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 🎮 First Use

1. Open http://localhost:3000
2. Click **VERIFY UPSTOX**
3. Click **SCAN NOW**
4. The server resolves real NSE instrument keys from Upstox's instrument master.
5. The scanner fetches real market quotes and recent 30-minute historical candles.

There is no OAuth redirect step in this build because it uses the Upstox Analytics Token.

---

## 📊 Understanding the Dashboard

### Top Section
- **Header**: Analytics Token status, refresh, and scan controls
- **Market Status Bar**: NSE timing and current session
- **Summary Cards**: Quick scan metrics

### Main Table
- **Ranked results**: Stocks sorted by scanner state and participation
- **Click any row**: Opens detailed analysis panel
- **Color coding**: Bullish, bearish, watch, and setup states

### Detail Panel
- **Prime Pipeline**: Stage-by-stage breakdown
- **Levels**: YH/YL with distances
- **Candle**: 30-minute OHLC analysis
- **Volume**: Participation metrics
- **20 EMA**: Trend context
- **Risk**: Entry/SL/position sizing placeholder

---

## 🎯 Scanner States Explained

| Badge | Meaning |
|-------|---------|
| **WATCH** | Level touched, waiting for clear reaction |
| **SETUP** | Reaction detected, needs confirmation |
| **CONFIRMED** | Setup confirmed (manual validation required) |
| **FAKE BREAKOUT** | False breakout detected |
| **NO TRADE** | No level interaction |

---

## 🔑 Prime Concepts

### Volume Stars
- **NORMAL**: Below 2x average
- **★**: 2x average
- **★★**: 4x average
- **★★★**: 6.5x average

### Reaction Types
- **REJECTION**: Price reacts away from a key level
- **BREAKOUT**: Price breaks through a key level
- **FAKE BREAKOUT**: Breakout fails and price reclaims the level

### Prime Principle
> **"Do not trade the line. Trade the reaction to the line."**

---

## 🛠️ Development Commands

```bash
npm run dev
npm run typecheck
npm run build
npm start
npm run lint
```

---

## ⚠️ Important Notes

### This is NOT a Trading Bot
- ❌ Does not execute trades
- ❌ Does not place orders
- ✅ Educational/research scanner
- ✅ Manual validation required

### Unverified Rules
The following remain intentionally unverified and are not invented by the application:
- MID level
- R1/R2/R3 resistance
- S1/S2/S3 support
- Automatic confirmation criteria

### Security
- Never commit `.env.local` or the real Analytics Token
- Keep the token server-side only
- Do not send the token from a client component

---

## 🐛 Troubleshooting

### "UPSTOX NOT CONFIGURED"
- Check `UPSTOX_ANALYTICS_TOKEN` in `.env.local` or Vercel Environment Variables.
- Restart the development server after changing environment variables.

### Scan returns unavailable stocks
- Some F&O-eligible symbols may not have a current NSE equity instrument row.
- The scanner skips instruments without usable market/history data and reports the unavailable count.

### Build errors
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🚀 Vercel

Set this environment variable in the Vercel project:

```text
UPSTOX_ANALYTICS_TOKEN
```

No Upstox redirect URL is required for this Analytics Token implementation.

After deployment, open `/api/health` and `/api/upstox/status` to verify the server configuration, then use the dashboard.
