/**
 * Prime Scanner API
 * 
 * Aggregates NSE F&O universe and runs Prime Technical scan
 * Returns dashboard-ready scan results
 * 
 * Note: This is a simplified version that uses mock data
 * Production version would integrate with real Upstox market data
 */

import { NextResponse } from 'next/server';
import { upstoxService } from '@/lib/upstox';
import { getMarketStatus } from '@/lib/market-utils';
import { getMockFNOInstruments } from '@/data/fno-universe';
import { runPrimeScan, rankScanResults, type ScannerInput } from '@/engine/prime/scanner';
import type { Candle } from '@/domain/prime';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const marketStatus = getMarketStatus();
    
    // Check if Upstox is authenticated
    if (!upstoxService.isAuthenticated()) {
      return NextResponse.json({
        status: 'error',
        error: 'Upstox not authenticated',
        message: 'Please configure Upstox API credentials',
      }, { status: 401 });
    }
    
    // Get F&O universe
    const instruments = getMockFNOInstruments();
    
    // In production, this would:
    // 1. Fetch historical candles for each instrument
    // 2. Fetch current quotes
    // 3. Run Prime scanner
    
    // For now, return limited mock results to demonstrate dashboard
    const mockResults = generateMockScanResults(instruments.slice(0, 20));
    const rankedResults = rankScanResults(mockResults);
    
    // Calculate summary
    const summary = {
      universeCount: instruments.length,
      scannedCount: mockResults.length,
      buyCount: rankedResults.filter(r => r.direction === 'BULLISH' && r.state !== 'NO_TRADE').length,
      sellCount: rankedResults.filter(r => r.direction === 'BEARISH' && r.state !== 'NO_TRADE').length,
      setupCount: rankedResults.filter(r => r.state === 'SETUP').length,
      confirmedCount: rankedResults.filter(r => r.state === 'CONFIRMED').length,
      watchCount: rankedResults.filter(r => r.state === 'WATCH').length,
      fakeBreakoutCount: rankedResults.filter(r => r.state === 'FAKE_BREAKOUT').length,
      noTradeCount: rankedResults.filter(r => r.state === 'NO_TRADE').length,
    };
    
    return NextResponse.json({
      status: 'success',
      data: {
        summary,
        marketStatus,
        results: rankedResults,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Prime scan error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to run Prime scan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate mock scan results for demonstration
 * In production, this would use real market data
 */
function generateMockScanResults(instruments: any[]) {
  const now = new Date();
  
  return instruments.map((instrument, index) => {
    const basePrice = 1000 + Math.random() * 2000;
    const dayChange = (Math.random() - 0.5) * 5;
    
    // Generate mock candles
    const mockCandles: Candle[] = [];
    for (let i = 0; i < 25; i++) {
      const time = new Date(now.getTime() - (25 - i) * 5 * 60 * 1000);
      const open = basePrice + (Math.random() - 0.5) * 50;
      const close = open + (Math.random() - 0.5) * 20;
      const high = Math.max(open, close) + Math.random() * 10;
      const low = Math.min(open, close) - Math.random() * 10;
      const volume = 100000 + Math.random() * 500000;
      
      mockCandles.push({
        timestamp: time.toISOString(),
        open,
        high,
        low,
        close,
        volume,
      });
    }
    
    const currentCandle = mockCandles[mockCandles.length - 1];
    
    // Generate mock previous day candles
    const mockPrevCandles: Candle[] = [];
    for (let i = 0; i < 75; i++) {
      const time = new Date(now.getTime() - 24 * 60 * 60 * 1000 - i * 5 * 60 * 1000);
      const open = basePrice * 0.98 + (Math.random() - 0.5) * 40;
      const close = open + (Math.random() - 0.5) * 15;
      const high = Math.max(open, close) + Math.random() * 8;
      const low = Math.min(open, close) - Math.random() * 8;
      const volume = 100000 + Math.random() * 500000;
      
      mockPrevCandles.push({
        timestamp: time.toISOString(),
        open,
        high,
        low,
        close,
        volume,
      });
    }
    
    const scanInput: ScannerInput = {
      symbol: instrument.symbol,
      instrumentKey: instrument.instrumentKey,
      exchange: 'NSE_FO',
      lotSize: instrument.lotSize,
      ltp: currentCandle.close,
      dayChangePercent: dayChange,
      currentCandle,
      historicalCandles: mockCandles,
      previousDayCandles: mockPrevCandles,
    };
    
    return runPrimeScan(scanInput);
  });
}
