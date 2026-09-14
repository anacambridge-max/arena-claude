import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';
import { getMarketStatus, getTodayDateIST } from '@/lib/market-utils';
import { runPrimeScan, rankScanResults, type ScannerInput } from '@/engine/prime/scanner';

export const dynamic = 'force-dynamic';
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

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

/**
 * Each stock now starts two Upstox candle calls (historical + current-day intraday)
 * in parallel. Start a worker every 42ms so the pair stays under ~50 requests/sec.
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
    nextStartAt = startAt + 42;
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

  await Promise.all(Array.from({ length: Math.min(100, items.length) }, () => runner()));
}

type ScanPayload = {
  summary: {
    universeCount: number;
    availableCount: number;
    scannedCount: number;
    failedCount: number;
    buyCount: number;
    sellCount: number;
    setupCount: number;
    confirmedCount: number;
    watchCount: number;
    fakeBreakoutCount: number;
    noTradeCount: number;
  };
  marketStatus: ReturnType<typeof getMarketStatus>;
  results: ReturnType<typeof runPrimeScan>[];
  generatedAt: string;
  source: string;
  timeframe: string;
  scanWindow: string;
  asOfDate: string;
};

let cachedScan: { key: string; createdAt: number; data: ScanPayload } | null = null;
let inFlightScan: Promise<ScanPayload> | null = null;

function cacheIsFresh(cache: NonNullable<typeof cachedScan>, now: number) {
  const minutes = istMinutes(new Date(now).toISOString());
  // After the 09:15-10:00 signal window closes, the day's signal set is immutable.
  if (minutes >= 10 * 60) return true;
  return now - cache.createdAt < 60_000;
}

async function executeScan(): Promise<ScanPayload> {
  if (!upstoxService.isAuthenticated()) throw new Error('Upstox Analytics Token is not configured');

  const marketStatus = getMarketStatus();
  const today = getTodayDateIST();
  const futures = await upstoxService.getAllNSEFuturesInstruments();
  const symbols = Object.keys(futures);
  const equities = await upstoxService.getNSEEquityInstruments(symbols);
  const instruments = symbols.map(symbol => {
    const future = futures[symbol];
    const equity = equities[symbol];
    if (!equity) return null;
    return { symbol, instrumentKey: equity.instrument_key, lotSize: future.lot_size || 1, futuresInstrumentKey: future.instrument_key };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!instruments.length) throw new Error('No NSE equity instruments matched the active F&O stock universe.');

  const quotes = await upstoxService.getMarketQuotes(instruments.map(i => i.instrumentKey));
  const quoteByToken = new Map<string, (typeof quotes)[string]>();
  for (const quote of Object.values(quotes)) if (quote.instrument_token) quoteByToken.set(quote.instrument_token, quote);

  // Three calendar days is enough to capture the previous NSE trading session while
  // keeping the historical response small. Current-day candles come from V3 intraday.
  const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const results: ReturnType<typeof runPrimeScan>[] = [];
  let failedCount = 0;

  const scanOne = async (instrument: (typeof instruments)[number]) => {
    const quote = quoteByToken.get(instrument.instrumentKey) ?? quotes[instrument.instrumentKey];
    if (!quote?.last_price) { failedCount += 1; return; }

    try {
      const [historicalResult, intradayResult] = await Promise.allSettled([
        upstoxService.getHistoricalCandles(instrument.instrumentKey, '5minute', today, fromDate),
        upstoxService.getIntradayCandles(instrument.instrumentKey, '5'),
      ]);

      const historical = historicalResult.status === 'fulfilled' ? historicalResult.value : [];
      const intraday = intradayResult.status === 'fulfilled' ? intradayResult.value : [];
      const historicalSorted = historical.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const intradaySorted = intraday.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (historicalSorted.length < 30) { failedCount += 1; return; }

      const historicalDates = [...new Set(historicalSorted.map(c => istDate(c.timestamp)))].sort();
      if (historicalDates.length < 1) { failedCount += 1; return; }

      const intradayToday = intradaySorted.filter(c => istDate(c.timestamp) === today && isPrimeWindow(c.timestamp));
      const useCurrentDay = intradayToday.length > 0;
      const latestDate = useCurrentDay ? today : historicalDates[historicalDates.length - 1];
      const priorDates = historicalDates.filter(date => date < latestDate);
      const previousDate = priorDates.at(-1);
      const previousDayCandles = previousDate ? historicalSorted.filter(c => istDate(c.timestamp) === previousDate) : [];
      const sessionCandles = useCurrentDay
        ? intradayToday
        : historicalSorted.filter(c => istDate(c.timestamp) === latestDate && isPrimeWindow(c.timestamp));

      if (!previousDayCandles.length || !sessionCandles.length) { failedCount += 1; return; }

      // Build one chronological series: historical warm-up + selected signal session.
      // This prevents the old 11/09 session from being silently used when 14/09 data exists.
      const warmup = historicalSorted.filter(c => istDate(c.timestamp) < latestDate);
      const workingCandles = [...warmup, ...sessionCandles].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let bestSignal: ReturnType<typeof runPrimeScan> | null = null;
      for (const candle of sessionCandles) {
        const candleTime = new Date(candle.timestamp).getTime();
        const before = workingCandles.filter(c => new Date(c.timestamp).getTime() < candleTime);
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

  return {
    summary: { universeCount: instruments.length, availableCount: instruments.length - failedCount, scannedCount: instruments.length - failedCount, failedCount, buyCount, sellCount, setupCount, confirmedCount: buyCount + sellCount, watchCount, fakeBreakoutCount, noTradeCount },
    marketStatus,
    results: rankedResults,
    generatedAt: new Date().toISOString(),
    source: 'upstox-analytics-token + NSE_EQ historical warm-up + NSE_EQ intraday 5m + PRIME TECHNICAL v3 FAST PRIME',
    timeframe: '5minute',
    scanWindow: '09:15-10:00 IST',
    asOfDate: sessionDatesFromResults(rankedResults) || today,
  };
}

export async function GET() {
  try {
    const today = getTodayDateIST();
    const now = Date.now();
    const cacheKey = today;

    if (cachedScan && cachedScan.key === cacheKey && cacheIsFresh(cachedScan, now)) {
      return NextResponse.json({ status: 'success', data: cachedScan.data });
    }

    // A second click while the first scan is running now shares the same server scan.
    // Browser-side aborts therefore cannot start a second 200+ request storm.
    if (!inFlightScan) inFlightScan = executeScan();
    const data = await inFlightScan;
    cachedScan = { key: cacheKey, createdAt: Date.now(), data };
    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Prime scan error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'error', error: 'Failed to run Prime scan', message }, { status: 500 });
  } finally {
    inFlightScan = null;
  }
}

function sessionDatesFromResults(results: ReturnType<typeof runPrimeScan>[]) {
  const dates = results.map(r => r.candle?.timestamp).filter(Boolean).map(ts => istDate(ts as string));
  return dates.sort().at(-1) || null;
}
