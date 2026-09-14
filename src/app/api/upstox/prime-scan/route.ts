import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';
import { getMarketStatus, getTodayDateIST } from '@/lib/market-utils';
import { runPrimeScan, rankScanResults, type ScannerInput } from '@/engine/prime/scanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function istDate(timestamp: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp));
}

function istMinutes(timestamp: string) {
  const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(timestamp));
  return Number(parts.find(p => p.type === 'hour')?.value || 0) * 60 + Number(parts.find(p => p.type === 'minute')?.value || 0);
}

function isPrimeWindow(timestamp: string) {
  const m = istMinutes(timestamp);
  return m >= 9 * 60 + 15 && m < 10 * 60;
}

function signalPriority(state: ReturnType<typeof runPrimeScan>['state']) {
  return state === 'CONFIRMED' ? 4 : state === 'FAKE_BREAKOUT' ? 3 : state === 'SETUP' ? 2 : state === 'WATCH' ? 1 : 0;
}

export async function GET() {
  try {
    if (!upstoxService.isAuthenticated()) {
      return NextResponse.json({ status: 'error', error: 'Upstox Analytics Token is not configured', message: 'Set UPSTOX_ANALYTICS_TOKEN on the server.' }, { status: 401 });
    }

    const marketStatus = getMarketStatus();
    const futures = await upstoxService.getAllNSEFuturesInstruments();
    const symbols = Object.keys(futures);
    const equities = await upstoxService.getNSEEquityInstruments(symbols);
    const instruments = symbols
      .map(symbol => {
        const future = futures[symbol];
        const equity = equities[symbol];
        if (!equity) return null;
        return { symbol, instrumentKey: equity.instrument_key, lotSize: future.lot_size || 1, futuresInstrumentKey: future.instrument_key };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!instruments.length) {
      return NextResponse.json({ status: 'error', error: 'No NSE equity instruments matched the active F&O stock universe.', message: 'Upstox returned no underlying NSE cash instruments for the F&O universe.' }, { status: 503 });
    }

    const quotes = await upstoxService.getMarketQuotes(instruments.map(i => i.instrumentKey));
    const quoteByToken = new Map<string, (typeof quotes)[string]>();
    for (const quote of Object.values(quotes)) if (quote.instrument_token) quoteByToken.set(quote.instrument_token, quote);

    const scanOne = async (instrument: (typeof instruments)[number]) => {
      const quote = quoteByToken.get(instrument.instrumentKey) ?? quotes[instrument.instrumentKey];
      if (!quote?.last_price) return { ok: false as const };
      try {
        // One month gives EMA20 enough warm-up history to closely match TradingView.
        const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const raw = await upstoxService.getHistoricalCandles(instrument.instrumentKey, '5minute', getTodayDateIST(), fromDate);
        const candles = raw.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (candles.length < 30) return { ok: false as const };

        const sessionDates = [...new Set(candles.map(c => istDate(c.timestamp)))].sort();
        if (sessionDates.length < 2) return { ok: false as const };
        const latestDate = sessionDates[sessionDates.length - 1];
        const previousDate = sessionDates[sessionDates.length - 2];
        const previousDayCandles = candles.filter(c => istDate(c.timestamp) === previousDate);
        const sessionCandles = candles.filter(c => istDate(c.timestamp) === latestDate && isPrimeWindow(c.timestamp));
        if (!previousDayCandles.length || !sessionCandles.length) return { ok: false as const };

        // Do not overwrite a strong early Pine signal with a weaker later state.
        // This is important for cases such as a 09:15 PRIME BUY followed by a
        // 09:40/09:45 SETUP. The dashboard should still show the confirmed BUY.
        let bestSignal: ReturnType<typeof runPrimeScan> | null = null;
        for (const candle of sessionCandles) {
          const before = candles.filter(c => new Date(c.timestamp).getTime() < new Date(candle.timestamp).getTime());
          if (before.length < 20) continue;
          const input: ScannerInput = {
            symbol: instrument.symbol,
            instrumentKey: instrument.instrumentKey,
            exchange: 'NSE_EQ',
            lotSize: instrument.lotSize,
            ltp: quote.last_price,
            dayChangePercent: quote.net_change && quote.ohlc?.close ? (quote.net_change / quote.ohlc.close) * 100 : 0,
            currentCandle: candle,
            historicalCandles: [...before, candle],
            previousDayCandles,
          };
          const result = runPrimeScan(input);
          if (result.state === 'NO_TRADE') continue;
          if (!bestSignal || signalPriority(result.state) > signalPriority(bestSignal.state) || (signalPriority(result.state) === signalPriority(bestSignal.state) && new Date(result.candle.timestamp).getTime() > new Date(bestSignal.candle.timestamp).getTime())) {
            bestSignal = result;
          }
        }
        return { ok: true as const, result: bestSignal };
      } catch (error) {
        console.error(`Scan failed for ${instrument.symbol}:`, error);
        return { ok: false as const };
      }
    };

    const concurrency = 100;
    const results: ReturnType<typeof runPrimeScan>[] = [];
    let failedCount = 0;
    for (let i = 0; i < instruments.length; i += concurrency) {
      const batch = await Promise.all(instruments.slice(i, i + concurrency).map(scanOne));
      for (const item of batch) {
        if (!item.ok) failedCount += 1;
        else if (item.result) results.push(item.result);
      }
    }

    const rankedResults = rankScanResults(results);
    const buyCount = rankedResults.filter(r => r.state === 'CONFIRMED' && r.direction === 'BULLISH').length;
    const sellCount = rankedResults.filter(r => r.state === 'CONFIRMED' && r.direction === 'BEARISH').length;
    const setupCount = rankedResults.filter(r => r.state === 'SETUP').length;
    const watchCount = rankedResults.filter(r => r.state === 'WATCH').length;
    const fakeBreakoutCount = rankedResults.filter(r => r.state === 'FAKE_BREAKOUT').length;
    const noTradeCount = Math.max(0, instruments.length - rankedResults.length - failedCount);

    return NextResponse.json({
      status: 'success',
      data: {
        summary: { universeCount: instruments.length, availableCount: instruments.length - failedCount, scannedCount: instruments.length - failedCount, failedCount, buyCount, sellCount, setupCount, confirmedCount: buyCount + sellCount, watchCount, fakeBreakoutCount, noTradeCount },
        marketStatus,
        results: rankedResults,
        generatedAt: new Date().toISOString(),
        source: 'upstox-analytics-token + NSE_EQ candles + PRIME TECHNICAL v3 FAST PRIME',
        timeframe: '5minute',
        scanWindow: '09:15-10:00 IST',
        asOfDate: sessionDatesFromResults(rankedResults) || getTodayDateIST(),
      },
    });
  } catch (error) {
    console.error('Prime scan error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', error: 'Failed to run Prime scan', message }, { status: 500 });
  }
}

function sessionDatesFromResults(results: ReturnType<typeof runPrimeScan>[]) {
  const dates = results.map(r => r.candle?.timestamp).filter(Boolean).map(ts => istDate(ts as string));
  return dates.sort().at(-1) || null;
}
