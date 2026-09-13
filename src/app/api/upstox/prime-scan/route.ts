import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';
import { getMarketStatus, getCurrentISTTime, getTodayDateIST } from '@/lib/market-utils';
import { runPrimeScan, rankScanResults, type ScannerInput } from '@/engine/prime/scanner';
import type { Candle } from '@/domain/prime';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    if (!upstoxService.isAuthenticated()) {
      return NextResponse.json({
        status: 'error',
        error: 'Upstox Analytics Token is not configured',
        message: 'Set UPSTOX_ANALYTICS_TOKEN on the server.',
      }, { status: 401 });
    }

    const marketStatus = getMarketStatus();
    // Discover the complete current stock-F&O universe from Upstox's live NSE
    // instrument master. No hard-coded stock list is used for scanning.
    const futures = await upstoxService.getAllNSEFuturesInstruments();
    const instruments = Object.values(futures).map((future) => ({
      symbol: future.underlying_symbol.toUpperCase(),
      instrumentKey: future.instrument_key,
      lotSize: future.lot_size || 1,
    }));

    const keys = instruments.map((i) => i.instrumentKey);
    const quotes = await upstoxService.getMarketQuotes(keys);

    const results: ReturnType<typeof runPrimeScan>[] = [];
    let failedCount = 0;
    const now = getCurrentISTTime();
    const from = new Date(now);
    from.setDate(from.getDate() - 5);
    const fromDate = from.toISOString().slice(0, 10);
    const toDate = getTodayDateIST();

    const scanOne = async (instrument: (typeof instruments)[number]) => {
      const quote = quotes[instrument.instrumentKey];
      if (!quote?.last_price) return { ok: false as const, reason: 'quote' };

      try {
        const candles = await upstoxService.getHistoricalCandles(
          instrument.instrumentKey,
          '30minute',
          toDate,
          fromDate,
        );

        if (candles.length < 22) return { ok: false as const, reason: 'candles' };

        const currentCandle: Candle = candles[candles.length - 1];
        const historicalCandles = candles.slice(-30);
        const latestSessionDate = currentCandle.timestamp.slice(0, 10);
        const previousSessionCandles = candles.filter((c) => c.timestamp.slice(0, 10) < latestSessionDate);
        const previousSessionDate = previousSessionCandles.length
          ? previousSessionCandles[previousSessionCandles.length - 1].timestamp.slice(0, 10)
          : null;
        const previousDayCandles = previousSessionDate
          ? candles.filter((c) => c.timestamp.slice(0, 10) === previousSessionDate)
          : [];

        if (previousDayCandles.length === 0) return { ok: false as const, reason: 'previous-day' };

        const input: ScannerInput = {
          symbol: instrument.symbol,
          instrumentKey: instrument.instrumentKey,
          exchange: 'NSE_FO',
          lotSize: instrument.lotSize,
          ltp: quote.last_price,
          dayChangePercent: quote.net_change && quote.ohlc?.close
            ? (quote.net_change / quote.ohlc.close) * 100
            : 0,
          currentCandle,
          historicalCandles,
          previousDayCandles,
        };

        return { ok: true as const, result: runPrimeScan(input) };
      } catch (error) {
        console.error(`Scan failed for ${instrument.symbol}:`, error);
        return { ok: false as const, reason: 'error' };
      }
    };

    const concurrency = 10;
    for (let i = 0; i < instruments.length; i += concurrency) {
      const batchResults = await Promise.all(instruments.slice(i, i + concurrency).map(scanOne));
      for (const item of batchResults) {
        if (item.ok) results.push(item.result);
        else failedCount += 1;
      }
    }

    const rankedResults = rankScanResults(results);
    const summary = {
      universeCount: instruments.length,
      availableCount: instruments.length,
      scannedCount: rankedResults.length,
      failedCount,
      buyCount: rankedResults.filter((r) => r.direction === 'BULLISH' && r.state !== 'NO_TRADE').length,
      sellCount: rankedResults.filter((r) => r.direction === 'BEARISH' && r.state !== 'NO_TRADE').length,
      setupCount: rankedResults.filter((r) => r.state === 'SETUP').length,
      confirmedCount: rankedResults.filter((r) => r.state === 'CONFIRMED').length,
      watchCount: rankedResults.filter((r) => r.state === 'WATCH').length,
      fakeBreakoutCount: rankedResults.filter((r) => r.state === 'FAKE_BREAKOUT').length,
      noTradeCount: rankedResults.filter((r) => r.state === 'NO_TRADE').length,
    };

    return NextResponse.json({
      status: 'success',
      data: {
        summary,
        marketStatus,
        results: rankedResults,
        generatedAt: new Date().toISOString(),
        source: 'upstox-analytics-token',
        asOfDate: getTodayDateIST(),
      },
    });
  } catch (error) {
    console.error('Prime scan error:', error);
    return NextResponse.json({
      status: 'error',
      error: 'Failed to run Prime scan',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
