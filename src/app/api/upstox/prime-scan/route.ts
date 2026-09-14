import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';
import { getMarketStatus, getTodayDateIST } from '@/lib/market-utils';
import { runPrimeScan, rankScanResults, type ScannerInput } from '@/engine/prime/scanner';

export const dynamic = 'force-dynamic';
// Keep a generous platform ceiling; the rate-limited scanner normally completes much sooner.
export const maxDuration = 300;

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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Full-universe scanner: all F&O stocks are retained. Requests are started
 * about 43.5/sec, safely below the 50/sec standard API limit, with up to
 * 50 historical requests in flight. This removes the old 40-at-a-time
 * batch barrier that made each slow request hold up the next batch.
 */
async function runRateLimited<T>(items: T[], worker: (item: T) => Promise<void>) {
  let nextIndex = 0;
  let nextStartAt = Date.now();
  const startLock: { promise: Promise<void> } = { promise: Promise.resolve() };

  const acquireStartSlot = async () => {
    let release!: () => void;
    const previous = startLock.promise;
    startLock.promise = new Promise<void>(resolve => { release = resolve; });
    await previous;
    const now = Date.now();
    const startAt = Math.max(now, nextStartAt);
    nextStartAt = startAt + 23;
    release();
    if (startAt > now) await sleep(startAt - now);
  };

  const runner = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      await acquireStartSlot();
      await worker(items[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(50, items.length) }, () => runner()));
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
    const instruments = symbols.map(symbol => {
      const future = futures[symbol];
      const equity = equities[symbol];
      if (!equity) return null;
      return { symbol, instrumentKey: equity.instrument_key, lotSize: future.lot_size || 1, futuresInstrumentKey: future.instrument_key };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!instruments.length) {
      return NextResponse.json({ status: 'error', error: 'No NSE equity instruments matched the active F&O stock universe.', message: 'Upstox returned no underlying NSE cash instruments for the F&O universe.' }, { status: 503 });
    }

    const quotes = await upstoxService.getMarketQuotes(instruments.map(i => i.instrumentKey));
    const quoteByToken = new Map<string, (typeof quotes)[string]>();
    for (const quote of Object.values(quotes)) if (quote.instrument_token) quoteByToken.set(quote.instrument_token, quote);

    // Five calendar days gives enough warm-up for EMA20/volume SMA20/range SMA10.
    const fromDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const results: ReturnType<typeof runPrimeScan>[] = [];
    let failedCount = 0;

    const scanOne = async (instrument: (typeof instruments)[number]) => {
      const quote = quoteByToken.get(instrument.instrumentKey) ?? quotes[instrument.instrumentKey];
      if (!quote?.last_price) {
        failedCount += 1;
        return;
      }
      try {
        const raw = await upstoxService.getHistoricalCandles(instrument.instrumentKey, '5minute', getTodayDateIST(), fromDate);
        const candles = raw.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (candles.length < 30) {
          failedCount += 1;
          return;
        }

        const sessionDates = [...new Set(candles.map(c => istDate(c.timestamp)))].sort();
        if (sessionDates.length < 2) {
          failedCount += 1;
          return;
        }
        const latestDate = sessionDates[sessionDates.length - 1];
        const previousDate = sessionDates[sessionDates.length - 2];
        const previousDayCandles = candles.filter(c => istDate(c.timestamp) === previousDate);
        const sessionCandles = candles.filter(c => istDate(c.timestamp) === latestDate && isPrimeWindow(c.timestamp));
        if (!previousDayCandles.length || !sessionCandles.length) {
          failedCount += 1;
          return;
        }

        let bestSignal: ReturnType<typeof runPrimeScan> | null = null;
        for (const candle of sessionCandles) {
          const candleTime = new Date(candle.timestamp).getTime();
          const before = candles.filter(c => new Date(c.timestamp).getTime() < candleTime);
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
          if (result.state === 'NO_TRADE' || !result.candle) continue;
          if (!bestSignal || signalPriority(result.state) > signalPriority(bestSignal.state) || (signalPriority(result.state) === signalPriority(bestSignal.state) && new Date(result.candle.timestamp).getTime() > new Date(bestSignal.candle!.timestamp).getTime())) bestSignal = result;
        }
        if (bestSignal) results.push(bestSignal);
      } catch (error) {
        failedCount += 1;
        console.error(`Scan failed for ${instrument.symbol}:`, error);
      }
    };

    await runRateLimited(instruments, scanOne);

    const rankedResults = rankScanResults(results);
    const buyCount = rankedResults.filter(r => r.state === 'CONFIRMED' && r.direction === 'BULLISH').length;
    const sellCount = rankedResults.filter(r => r.state === 'CONFIRMED' && r.direction === 'BEARISH').length;
    const setupCount = rankedResults.filter(r => r.state === 'SETUP').length;
    const watchCount = rankedResults.filter(r => r.state === 'WATCH').length;
    const fakeBreakoutCount = rankedResults.filter(r => r.state === 'FAKE_BREAKOUT').length;
    const noTradeCount = Math.max(0, instruments.length - rankedResults.length - failedCount);

    return NextResponse.json({ status: 'success', data: {
      summary: { universeCount: instruments.length, availableCount: instruments.length - failedCount, scannedCount: instruments.length - failedCount, failedCount, buyCount, sellCount, setupCount, confirmedCount: buyCount + sellCount, watchCount, fakeBreakoutCount, noTradeCount },
      marketStatus,
      results: rankedResults,
      generatedAt: new Date().toISOString(),
      source: 'upstox-analytics-token + NSE_EQ candles + PRIME TECHNICAL v3 FAST PRIME',
      timeframe: '5minute',
      scanWindow: '09:15-10:00 IST',
      asOfDate: sessionDatesFromResults(rankedResults) || getTodayDateIST(),
    }});
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
