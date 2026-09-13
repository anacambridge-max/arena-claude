/**
 * Prime EMA (Exponential Moving Average) Engine
 * 
 * Calculates 20 EMA and analyzes price position relative to EMA
 */

import { Candle, EMAAnalysis, Direction } from '@/domain/prime';

export function calculateEMA(candles: Candle[], period: number = 20): number {
  if (candles.length === 0) return 0;
  if (candles.length < period) {
    // Use SMA if not enough data
    const sum = candles.reduce((acc, c) => acc + c.close, 0);
    return sum / candles.length;
  }
  
  const multiplier = 2 / (period + 1);
  
  // Calculate initial SMA for the first EMA value
  const initialSMA = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
  
  let ema = initialSMA;
  
  // Calculate EMA for remaining candles
  for (let i = period; i < candles.length; i++) {
    ema = (candles[i].close - ema) * multiplier + ema;
  }
  
  return ema;
}

export function analyzeEMA(currentPrice: number, candles: Candle[]): EMAAnalysis {
  const ema20 = calculateEMA(candles, 20);
  const distance = currentPrice - ema20;
  const distancePercent = ema20 > 0 ? (distance / ema20) * 100 : 0;
  
  let priceVsEma: 'ABOVE' | 'BELOW' | 'AT';
  if (Math.abs(distancePercent) < 0.1) {
    priceVsEma = 'AT';
  } else if (currentPrice > ema20) {
    priceVsEma = 'ABOVE';
  } else {
    priceVsEma = 'BELOW';
  }
  
  // EMA direction: compare last few EMA values
  let direction: Direction = 'NEUTRAL';
  if (candles.length >= 23) {
    const emaRecent = calculateEMA(candles.slice(-22), 20);
    const emaPrevious = calculateEMA(candles.slice(-23, -1), 20);
    
    if (emaRecent > emaPrevious * 1.001) {
      direction = 'BULLISH';
    } else if (emaRecent < emaPrevious * 0.999) {
      direction = 'BEARISH';
    }
  }
  
  return {
    ema20,
    priceVsEma,
    distance,
    distancePercent,
    direction,
  };
}
