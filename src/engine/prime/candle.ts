/**
 * Prime Candle Analysis Engine
 * 
 * Analyzes 5-minute candle structure:
 * - Range, Body, Wicks
 * - Close location
 * - Bullish/Bearish classification
 */

import { Candle, CandleAnalysis } from '@/domain/prime';

export function analyzeCandle(candle: Candle): CandleAnalysis {
  const { open, high, low, close } = candle;
  
  const range = high - low;
  const body = Math.abs(close - open);
  const isBullish = close > open;
  const isBearish = close < open;
  
  const upperWick = high - Math.max(open, close);
  const lowerWick = Math.min(open, close) - low;
  
  const bodyPercent = range > 0 ? (body / range) * 100 : 0;
  
  // Close location: 0 = at low, 100 = at high
  const closeLocation = range > 0 ? ((close - low) / range) * 100 : 50;
  
  // Doji: very small body relative to range
  const isDoji = bodyPercent < 10;
  
  return {
    range,
    body,
    upperWick,
    lowerWick,
    bodyPercent,
    closeLocation,
    isBullish,
    isBearish,
    isDoji,
  };
}

export function getCandleStrength(analysis: CandleAnalysis): 'STRONG' | 'MODERATE' | 'WEAK' {
  if (analysis.bodyPercent > 70) return 'STRONG';
  if (analysis.bodyPercent > 40) return 'MODERATE';
  return 'WEAK';
}

export function isBullishRejectionCandle(analysis: CandleAnalysis): boolean {
  // Long lower wick, close near high
  return (
    analysis.lowerWick > analysis.body * 1.5 &&
    analysis.closeLocation > 70 &&
    analysis.isBullish
  );
}

export function isBearishRejectionCandle(analysis: CandleAnalysis): boolean {
  // Long upper wick, close near low
  return (
    analysis.upperWick > analysis.body * 1.5 &&
    analysis.closeLocation < 30 &&
    analysis.isBearish
  );
}
