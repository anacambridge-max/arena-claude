# 🚀 Quick Start Guide
## Prime Technical Master F&O Scanner

---

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL database (local or remote)
- (Optional) Upstox API credentials for real market data

---

## ⚡ Installation (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set your database URL
# DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

### 3. Run Development Server
```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 🎮 First Use

### Without Upstox Credentials (Demo Mode)

1. Open http://localhost:3000
2. Click **"CONNECT UPSTOX"**
3. Click **"SCAN NOW"**
4. Explore the dashboard with mock data

### With Upstox Credentials (Real Data)

1. Get API credentials from https://account.upstox.com/developer/apps
2. Add to `.env`:
   ```env
   UPSTOX_API_KEY=your_key_here
   UPSTOX_API_SECRET=your_secret_here
   ```
3. Restart dev server
4. Click **"CONNECT UPSTOX"**
5. Click **"SCAN NOW"**

---

## 📊 Understanding the Dashboard

### Top Section
- **Header**: Connection status, refresh, and scan controls
- **Market Status Bar**: NSE timing and current session
- **Summary Cards**: Quick metrics at a glance

### Main Table
- **Ranked results**: Stocks sorted by setup priority
- **Click any row**: Opens detailed analysis panel
- **Color coding**: 
  - 🟢 Green = Bullish/Long
  - 🔴 Red = Bearish/Short
  - 🟡 Amber = Watch/Setup

### Detail Panel (Right Side)
- **Prime Pipeline**: Stage-by-stage breakdown
- **Levels**: YH/YL with distances
- **Candle**: 5-minute OHLC analysis
- **Volume**: Participation metrics
- **20 EMA**: Trend context
- **Risk**: Entry/SL/Position sizing

---

## 🎯 Scanner States Explained

| Badge | Meaning |
|-------|---------|
| **WATCH** | Level touched, waiting for clear reaction |
| **SETUP** | Reaction detected, needs confirmation |
| **CONFIRMED** | Setup confirmed (requires manual validation) |
| **FAKE BREAKOUT** | False breakout detected |
| **NO TRADE** | No level interaction |

---

## 🔑 Key Concepts

### Volume Stars
- **NORMAL**: Below 2x average
- **★**: 2x average
- **★★**: 4x average  
- **★★★**: 6.5x average

### Reaction Types
- **REJECTION**: Price bounces off level (potential reversal)
- **BREAKOUT**: Price breaks through level (continuation)
- **FAKE BREAKOUT**: Failed breakout (opposite setup)

### Prime Principle
> **"Do not trade the line. Trade the reaction to the line."**

Price touching YH/YL is just the starting point. We analyze:
1. How price reacts (rejection vs acceptance)
2. Candle structure (body, wicks, close location)
3. Volume participation (stars)
4. EMA alignment
5. Then wait for confirmation

---

## 🛠️ Development Commands

```bash
# Development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## ⚠️ Important Notes

### 1. This is NOT a Trading Bot
- ❌ Does not execute trades
- ❌ Does not place orders
- ✅ Educational tool only
- ✅ Manual validation required

### 2. Unverified Rules
The following are **not calculated**:
- MID level
- R1/R2/R3 resistance
- S1/S2/S3 support
- Auto-confirmation criteria

These are marked "NOT VERIFIED" in the UI.

### 3. Demo Data
Without real Upstox credentials:
- Mock candle data is generated
- Patterns are simulated
- For learning/testing only

### 4. Security
- Never commit `.env` to Git
- Keep Upstox credentials server-side only
- Don't share API keys

---

## 🐛 Troubleshooting

### Dashboard is blank
- Check browser console for errors
- Verify dev server is running
- Try clearing browser cache

### "Upstox not authenticated" error
- Click "CONNECT UPSTOX" first
- Check `.env` has credentials (for real data)
- Restart dev server after adding credentials

### Build errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Database connection issues
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env`
- Test connection: `psql $DATABASE_URL`

---

## 📚 Learn More

- **README.md**: Full documentation
- **IMPLEMENTATION_SUMMARY.md**: Technical details
- **src/engine/prime/**: Engine source code
- **Prime Technical Course**: Original framework material

---

## 🎓 Recommended Learning Path

1. **Day 1**: Run demo mode, explore dashboard
2. **Day 2**: Study scanner table, understand states
3. **Day 3**: Click stocks, analyze detail panels
4. **Day 4**: Read engine source code
5. **Day 5**: Connect real Upstox data
6. **Day 6**: Compare with manual Prime analysis
7. **Day 7**: Start customizing for your needs

---

## 🔗 Useful Links

- **Upstox Developer Portal**: https://upstox.com/developer
- **Upstox API Docs**: https://upstox.com/developer/api-documentation
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com

---

## 💡 Pro Tips

1. **Use IST timezone**: Markets operate on Indian Standard Time
2. **Focus on 09:15-09:20**: Discovery window, not auto-entry
3. **Check volume first**: No participation = no setup
4. **Respect structural SL**: Risk management is critical
5. **Manual confirmation**: Never trust auto-signals blindly

---

## 🎯 Quick Reference

### Market Hours (IST)
- **09:00 - 09:15**: Pre-market
- **09:15 - 15:30**: Regular session
- **15:30 - 16:00**: Post-market

### Volume Thresholds
- 2x = ★
- 4x = ★★
- 6.5x = ★★★

### Key Shortcuts
- Click row → Detail panel
- ESC → Close panel
- Refresh → Update data

---

**You're ready to explore Prime Technical Master!** 🚀

Start with demo mode, learn the interface, then connect real data when comfortable.

Happy scanning! 📊
